-- Migration: Sistema de Gamificação
-- Description: Sistema completo de XP, badges, ranking e desafios

-- ============================================
-- USER_XP: Sistema de experiência e níveis
-- ============================================

CREATE TABLE IF NOT EXISTS user_xp (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID UNIQUE REFERENCES profiles(id) ON DELETE CASCADE,
  total_xp INT DEFAULT 0,
  level INT DEFAULT 1,
  league TEXT DEFAULT 'bronze' CHECK (league IN ('bronze', 'silver', 'gold', 'diamond', 'master')),
  rank_position INT,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_user_xp_user ON user_xp(user_id);
CREATE INDEX IF NOT EXISTS idx_user_xp_league ON user_xp(league);
CREATE INDEX IF NOT EXISTS idx_user_xp_total_xp ON user_xp(total_xp DESC);

-- RLS
ALTER TABLE user_xp ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view XP" ON user_xp;
CREATE POLICY "Anyone can view XP" 
ON user_xp FOR SELECT 
USING (TRUE);

-- ============================================
-- BADGES: Conquistas disponíveis
-- ============================================

CREATE TABLE IF NOT EXISTS badges (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  icon TEXT,
  category TEXT CHECK (category IN ('participation', 'achievement', 'social', 'special')),
  requirement JSONB NOT NULL,
  reward_xp INT DEFAULT 0,
  rarity TEXT DEFAULT 'common' CHECK (rarity IN ('common', 'rare', 'epic', 'legendary')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índice
CREATE INDEX IF NOT EXISTS idx_badges_category ON badges(category);

-- RLS
ALTER TABLE badges ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view badges" ON badges;
CREATE POLICY "Anyone can view badges" 
ON badges FOR SELECT 
USING (TRUE);

-- ============================================
-- USER_BADGES: Badges conquistadas pelos usuários
-- ============================================

CREATE TABLE IF NOT EXISTS user_badges (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  badge_id UUID REFERENCES badges(id) ON DELETE CASCADE,
  earned_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, badge_id)
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_user_badges_user ON user_badges(user_id);
CREATE INDEX IF NOT EXISTS idx_user_badges_badge ON user_badges(badge_id);

-- RLS
ALTER TABLE user_badges ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view user badges" ON user_badges;
CREATE POLICY "Anyone can view user badges" 
ON user_badges FOR SELECT 
USING (TRUE);

-- ============================================
-- CHALLENGES: Desafios disponíveis
-- ============================================

CREATE TABLE IF NOT EXISTS challenges (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  description TEXT,
  type TEXT CHECK (type IN ('daily', 'weekly', 'monthly', 'special')),
  requirement JSONB NOT NULL,
  reward_xp INT DEFAULT 0,
  reward_badge_id UUID REFERENCES badges(id),
  starts_at TIMESTAMPTZ DEFAULT NOW(),
  ends_at TIMESTAMPTZ,
  active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_challenges_type ON challenges(type);
CREATE INDEX IF NOT EXISTS idx_challenges_active ON challenges(active) WHERE active = TRUE;
CREATE INDEX IF NOT EXISTS idx_challenges_dates ON challenges(starts_at, ends_at);

-- RLS
ALTER TABLE challenges ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view challenges" ON challenges;
CREATE POLICY "Anyone can view challenges" 
ON challenges FOR SELECT 
USING (active = TRUE);

-- ============================================
-- USER_CHALLENGES: Progresso dos usuários em desafios
-- ============================================

CREATE TABLE IF NOT EXISTS user_challenges (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  challenge_id UUID REFERENCES challenges(id) ON DELETE CASCADE,
  progress JSONB DEFAULT '{}',
  completed BOOLEAN DEFAULT FALSE,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, challenge_id)
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_user_challenges_user ON user_challenges(user_id);
CREATE INDEX IF NOT EXISTS idx_user_challenges_completed ON user_challenges(completed);

-- RLS
ALTER TABLE user_challenges ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own challenges" ON user_challenges;
CREATE POLICY "Users can view own challenges" 
ON user_challenges FOR SELECT 
USING ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can update own challenges" ON user_challenges;
CREATE POLICY "Users can update own challenges" 
ON user_challenges FOR UPDATE 
USING ((select auth.uid()) = user_id);

-- ============================================
-- XP_TRANSACTIONS: Histórico de ganho de XP
-- ============================================

CREATE TABLE IF NOT EXISTS xp_transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  amount INT NOT NULL,
  reason TEXT NOT NULL,
  reference_type TEXT,
  reference_id UUID,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_xp_transactions_user ON xp_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_xp_transactions_created ON xp_transactions(created_at DESC);

-- RLS
ALTER TABLE xp_transactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own transactions" ON xp_transactions;
CREATE POLICY "Users can view own transactions" 
ON xp_transactions FOR SELECT 
USING ((select auth.uid()) = user_id);

-- ============================================
-- FUNÇÃO: Calcular nível baseado em XP
-- ============================================

CREATE OR REPLACE FUNCTION calculate_level(xp INT)
RETURNS INT AS $$
BEGIN
  -- Fórmula: level = floor(sqrt(xp / 100)) + 1
  -- 0-99 XP = Level 1
  -- 100-399 XP = Level 2
  -- 400-899 XP = Level 3
  -- etc.
  RETURN FLOOR(SQRT(xp::DECIMAL / 100)) + 1;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- ============================================
-- FUNÇÃO: Calcular liga baseada em XP
-- ============================================

CREATE OR REPLACE FUNCTION calculate_league(xp INT)
RETURNS TEXT AS $$
BEGIN
  IF xp < 1000 THEN
    RETURN 'bronze';
  ELSIF xp < 5000 THEN
    RETURN 'silver';
  ELSIF xp < 15000 THEN
    RETURN 'gold';
  ELSIF xp < 50000 THEN
    RETURN 'diamond';
  ELSE
    RETURN 'master';
  END IF;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- ============================================
-- FUNÇÃO: Adicionar XP a um usuário
-- ============================================

CREATE OR REPLACE FUNCTION add_xp(
  user_uuid UUID,
  xp_amount INT,
  xp_reason TEXT,
  ref_type TEXT DEFAULT NULL,
  ref_id UUID DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
  current_xp INT;
  new_xp INT;
  old_level INT;
  new_level INT;
  old_league TEXT;
  new_league TEXT;
  level_up BOOLEAN := FALSE;
  league_up BOOLEAN := FALSE;
BEGIN
  -- Criar registro de XP se não existir
  INSERT INTO user_xp (user_id, total_xp)
  VALUES (user_uuid, 0)
  ON CONFLICT (user_id) DO NOTHING;
  
  -- Buscar XP atual
  SELECT total_xp, level, league INTO current_xp, old_level, old_league
  FROM user_xp
  WHERE user_id = user_uuid;
  
  new_xp := current_xp + xp_amount;
  new_level := calculate_level(new_xp);
  new_league := calculate_league(new_xp);
  
  level_up := new_level > old_level;
  league_up := new_league != old_league;
  
  -- Atualizar XP
  UPDATE user_xp
  SET 
    total_xp = new_xp,
    level = new_level,
    league = new_league,
    updated_at = NOW()
  WHERE user_id = user_uuid;
  
  -- Registrar transação
  INSERT INTO xp_transactions (user_id, amount, reason, reference_type, reference_id)
  VALUES (user_uuid, xp_amount, xp_reason, ref_type, ref_id);
  
  -- Criar notificação se subiu de nível
  IF level_up THEN
    INSERT INTO notifications (user_id, type, title, message, data)
    VALUES (
      user_uuid,
      'level_up',
      'Novo nível alcançado!',
      'Parabéns! Você alcançou o nível ' || new_level || '!',
      jsonb_build_object('old_level', old_level, 'new_level', new_level)
    );
  END IF;
  
  -- Criar notificação se mudou de liga
  IF league_up THEN
    INSERT INTO notifications (user_id, type, title, message, data)
    VALUES (
      user_uuid,
      'league_promotion',
      'Promoção de liga!',
      'Você foi promovido para a liga ' || UPPER(new_league) || '!',
      jsonb_build_object('old_league', old_league, 'new_league', new_league)
    );
  END IF;
  
  RETURN jsonb_build_object(
    'total_xp', new_xp,
    'level', new_level,
    'league', new_league,
    'level_up', level_up,
    'league_up', league_up
  );
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- FUNÇÃO: Conceder badge a um usuário
-- ============================================

CREATE OR REPLACE FUNCTION award_badge(user_uuid UUID, badge_uuid UUID)
RETURNS BOOLEAN AS $$
DECLARE
  badge_record RECORD;
  already_has BOOLEAN;
BEGIN
  -- Verificar se já tem o badge
  SELECT EXISTS(
    SELECT 1 FROM user_badges 
    WHERE user_id = user_uuid AND badge_id = badge_uuid
  ) INTO already_has;
  
  IF already_has THEN
    RETURN FALSE;
  END IF;
  
  -- Buscar informações do badge
  SELECT * INTO badge_record FROM badges WHERE id = badge_uuid;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Badge não encontrado';
  END IF;
  
  -- Conceder badge
  INSERT INTO user_badges (user_id, badge_id)
  VALUES (user_uuid, badge_uuid);
  
  -- Adicionar XP de recompensa
  IF badge_record.reward_xp > 0 THEN
    PERFORM add_xp(
      user_uuid,
      badge_record.reward_xp,
      'Badge conquistado: ' || badge_record.name,
      'badge',
      badge_uuid
    );
  END IF;
  
  -- Criar notificação
  INSERT INTO notifications (user_id, type, title, message, data)
  VALUES (
    user_uuid,
    'badge_earned',
    'Nova conquista!',
    'Você conquistou o badge: ' || badge_record.name,
    jsonb_build_object('badge_id', badge_uuid, 'badge_name', badge_record.name)
  );
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- FUNÇÃO: Verificar e conceder badges automáticos
-- ============================================

CREATE OR REPLACE FUNCTION check_and_award_badges(user_uuid UUID)
RETURNS INT AS $$
DECLARE
  badge_record RECORD;
  awarded_count INT := 0;
  user_stats JSONB;
BEGIN
  -- Coletar estatísticas do usuário
  SELECT jsonb_build_object(
    'total_matches', COUNT(DISTINCT mp.match_id),
    'matches_organized', COUNT(DISTINCT m.id),
    'total_xp', COALESCE(ux.total_xp, 0),
    'attendance_rate', COALESCE(p.attendance_rate, 100)
  ) INTO user_stats
  FROM profiles p
  LEFT JOIN match_participants mp ON mp.user_id = p.id
  LEFT JOIN matches m ON m.organizer_id = p.id
  LEFT JOIN user_xp ux ON ux.user_id = p.id
  WHERE p.id = user_uuid
  GROUP BY p.id, p.attendance_rate, ux.total_xp;
  
  -- Verificar cada badge
  FOR badge_record IN SELECT * FROM badges LOOP
    -- Lógica simplificada - pode ser expandida
    IF NOT EXISTS(SELECT 1 FROM user_badges WHERE user_id = user_uuid AND badge_id = badge_record.id) THEN
      -- Exemplo: Badge de 1 partida
      IF badge_record.name = 'Iniciante' AND (user_stats->>'total_matches')::INT >= 1 THEN
        PERFORM award_badge(user_uuid, badge_record.id);
        awarded_count := awarded_count + 1;
      END IF;
      
      -- Exemplo: Badge de 10 partidas
      IF badge_record.name = 'Jogador Regular' AND (user_stats->>'total_matches')::INT >= 10 THEN
        PERFORM award_badge(user_uuid, badge_record.id);
        awarded_count := awarded_count + 1;
      END IF;
      
      -- Exemplo: Badge de organizador
      IF badge_record.name = 'Organizador' AND (user_stats->>'matches_organized')::INT >= 10 THEN
        PERFORM award_badge(user_uuid, badge_record.id);
        awarded_count := awarded_count + 1;
      END IF;
    END IF;
  END LOOP;
  
  RETURN awarded_count;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- TRIGGER: Adicionar XP ao participar de partida
-- ============================================

CREATE OR REPLACE FUNCTION trigger_add_xp_on_match_join()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'confirmed' AND (OLD IS NULL OR OLD.status != 'confirmed') THEN
    PERFORM add_xp(
      NEW.user_id,
      100,
      'Participação em partida',
      'match',
      NEW.match_id
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_xp_match_participation ON match_participants;
CREATE TRIGGER trigger_xp_match_participation
AFTER INSERT OR UPDATE OF status ON match_participants
FOR EACH ROW
EXECUTE FUNCTION trigger_add_xp_on_match_join();

-- ============================================
-- TRIGGER: Adicionar XP ao criar partida
-- ============================================

CREATE OR REPLACE FUNCTION trigger_add_xp_on_match_create()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM add_xp(
    NEW.organizer_id,
    50,
    'Criação de partida',
    'match',
    NEW.id
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_xp_match_creation ON matches;
CREATE TRIGGER trigger_xp_match_creation
AFTER INSERT ON matches
FOR EACH ROW
EXECUTE FUNCTION trigger_add_xp_on_match_create();

-- ============================================
-- VIEW: Ranking global
-- ============================================

CREATE OR REPLACE VIEW global_ranking AS
SELECT 
  ROW_NUMBER() OVER (ORDER BY ux.total_xp DESC) as rank,
  p.id,
  p.name,
  p.avatar_url,
  ux.total_xp,
  ux.level,
  ux.league,
  COUNT(DISTINCT ub.badge_id) as total_badges,
  COUNT(DISTINCT mp.match_id) as total_matches
FROM profiles p
LEFT JOIN user_xp ux ON ux.user_id = p.id
LEFT JOIN user_badges ub ON ub.user_id = p.id
LEFT JOIN match_participants mp ON mp.user_id = p.id
GROUP BY p.id, p.name, p.avatar_url, ux.total_xp, ux.level, ux.league
ORDER BY ux.total_xp DESC NULLS LAST;

-- ============================================
-- INSERIR BADGES PADRÃO
-- ============================================

INSERT INTO badges (name, description, icon, category, requirement, reward_xp, rarity) VALUES
('Iniciante', 'Participou da primeira partida', '🎯', 'participation', '{"matches": 1}', 50, 'common'),
('Jogador Regular', 'Participou de 10 partidas', '⚽', 'participation', '{"matches": 10}', 200, 'common'),
('Veterano', 'Participou de 50 partidas', '🏆', 'participation', '{"matches": 50}', 500, 'rare'),
('Lenda', 'Participou de 100 partidas', '👑', 'participation', '{"matches": 100}', 1000, 'epic'),
('Organizador', 'Criou 10 partidas', '📋', 'achievement', '{"organized": 10}', 300, 'rare'),
('Fair Play', 'Manteve média de avaliação acima de 4.5', '⭐', 'social', '{"rating": 4.5}', 250, 'rare'),
('Pontual', 'Taxa de comparecimento acima de 90%', '📅', 'achievement', '{"attendance": 90}', 200, 'rare'),
('Social', 'Avaliou 20 jogadores', '💬', 'social', '{"ratings_given": 20}', 150, 'common')
ON CONFLICT (name) DO NOTHING;

-- ============================================
-- COMENTÁRIOS
-- ============================================

COMMENT ON TABLE user_xp IS 'Sistema de experiência e níveis dos usuários';
COMMENT ON TABLE badges IS 'Badges/conquistas disponíveis no sistema';
COMMENT ON TABLE user_badges IS 'Badges conquistadas pelos usuários';
COMMENT ON TABLE challenges IS 'Desafios temporários disponíveis';
COMMENT ON TABLE user_challenges IS 'Progresso dos usuários em desafios';
COMMENT ON TABLE xp_transactions IS 'Histórico de ganho/perda de XP';
COMMENT ON FUNCTION add_xp IS 'Adiciona XP a um usuário e verifica level up';
COMMENT ON FUNCTION award_badge IS 'Concede um badge a um usuário';
COMMENT ON FUNCTION check_and_award_badges IS 'Verifica e concede badges automáticos';
COMMENT ON VIEW global_ranking IS 'Ranking global de jogadores por XP';

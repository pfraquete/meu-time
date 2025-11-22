-- Migration: Sistema de Confirmação de Presença
-- Description: Adiciona campos e funcionalidades para confirmação de presença e controle de faltas

-- ============================================
-- MATCH_PARTICIPANTS: Adicionar campos de confirmação
-- ============================================

ALTER TABLE match_participants 
ADD COLUMN IF NOT EXISTS confirmed_presence BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS confirmation_date TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS attended BOOLEAN,
ADD COLUMN IF NOT EXISTS waitlist_position INT,
ADD COLUMN IF NOT EXISTS waitlist_expires_at TIMESTAMPTZ;

-- ============================================
-- PROFILES: Adicionar campos de reputação
-- ============================================

ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS no_show_count INT DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_matches_attended INT DEFAULT 0,
ADD COLUMN IF NOT EXISTS attendance_rate DECIMAL(5, 2) DEFAULT 100.00,
ADD COLUMN IF NOT EXISTS suspended_until TIMESTAMPTZ;

-- ============================================
-- NOTIFICATIONS: Tabela de notificações
-- ============================================

CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  data JSONB,
  read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(user_id, read);
CREATE INDEX IF NOT EXISTS idx_notifications_created ON notifications(created_at DESC);

-- RLS para notifications
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own notifications" ON notifications;
CREATE POLICY "Users can view own notifications" 
ON notifications FOR SELECT 
USING ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can update own notifications" ON notifications;
CREATE POLICY "Users can update own notifications" 
ON notifications FOR UPDATE 
USING ((select auth.uid()) = user_id);

-- ============================================
-- NOTIFICATION_PREFERENCES: Preferências de notificação
-- ============================================

CREATE TABLE IF NOT EXISTS notification_preferences (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  push_enabled BOOLEAN DEFAULT TRUE,
  email_enabled BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, type)
);

-- RLS para notification_preferences
ALTER TABLE notification_preferences ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage own preferences" ON notification_preferences;
CREATE POLICY "Users can manage own preferences" 
ON notification_preferences FOR ALL 
USING ((select auth.uid()) = user_id);

-- ============================================
-- FUNÇÃO: Calcular taxa de comparecimento
-- ============================================

CREATE OR REPLACE FUNCTION calculate_attendance_rate(user_uuid UUID)
RETURNS DECIMAL AS $$
DECLARE
  total INT;
  attended INT;
BEGIN
  SELECT 
    COUNT(*) FILTER (WHERE attended IS NOT NULL),
    COUNT(*) FILTER (WHERE attended = TRUE)
  INTO total, attended
  FROM match_participants
  WHERE user_id = user_uuid;
  
  IF total = 0 THEN
    RETURN 100.00;
  END IF;
  
  RETURN ROUND((attended::DECIMAL / total::DECIMAL) * 100, 2);
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- FUNÇÃO: Registrar falta (no-show)
-- ============================================

CREATE OR REPLACE FUNCTION register_no_show(participant_uuid UUID)
RETURNS VOID AS $$
DECLARE
  user_uuid UUID;
  current_no_shows INT;
BEGIN
  -- Buscar user_id do participante
  SELECT user_id INTO user_uuid
  FROM match_participants
  WHERE id = participant_uuid;
  
  IF user_uuid IS NULL THEN
    RAISE EXCEPTION 'Participante não encontrado';
  END IF;
  
  -- Marcar como não compareceu
  UPDATE match_participants
  SET attended = FALSE
  WHERE id = participant_uuid;
  
  -- Incrementar contador de faltas
  UPDATE profiles
  SET 
    no_show_count = no_show_count + 1,
    attendance_rate = calculate_attendance_rate(user_uuid)
  WHERE id = user_uuid
  RETURNING no_show_count INTO current_no_shows;
  
  -- Suspender se atingiu 3 faltas
  IF current_no_shows >= 3 THEN
    UPDATE profiles
    SET suspended_until = NOW() + INTERVAL '7 days'
    WHERE id = user_uuid;
    
    -- Criar notificação de suspensão
    INSERT INTO notifications (user_id, type, title, message)
    VALUES (
      user_uuid,
      'suspension',
      'Conta suspensa',
      'Você foi suspenso por 7 dias devido a 3 faltas consecutivas. Compareça às partidas para evitar suspensões.'
    );
  END IF;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- FUNÇÃO: Promover da lista de espera
-- ============================================

CREATE OR REPLACE FUNCTION promote_from_waitlist(match_uuid UUID)
RETURNS VOID AS $$
DECLARE
  next_participant UUID;
  next_user UUID;
BEGIN
  -- Buscar primeiro da lista de espera
  SELECT id, user_id INTO next_participant, next_user
  FROM match_participants
  WHERE match_id = match_uuid
    AND status = 'waitlist'
  ORDER BY joined_at ASC
  LIMIT 1;
  
  IF next_participant IS NULL THEN
    RETURN;
  END IF;
  
  -- Promover para pending
  UPDATE match_participants
  SET 
    status = 'pending',
    waitlist_position = NULL,
    waitlist_expires_at = NOW() + INTERVAL '15 minutes'
  WHERE id = next_participant;
  
  -- Criar notificação
  INSERT INTO notifications (user_id, type, title, message, data)
  VALUES (
    next_user,
    'waitlist_promoted',
    'Vaga disponível!',
    'Uma vaga abriu na partida que você estava na lista de espera. Você tem 15 minutos para confirmar.',
    jsonb_build_object('match_id', match_uuid, 'participant_id', next_participant)
  );
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- TRIGGER: Atualizar posição na lista de espera
-- ============================================

CREATE OR REPLACE FUNCTION update_waitlist_positions()
RETURNS TRIGGER AS $$
BEGIN
  -- Atualizar posições de todos na lista de espera desta partida
  WITH numbered AS (
    SELECT 
      id,
      ROW_NUMBER() OVER (ORDER BY joined_at ASC) as position
    FROM match_participants
    WHERE match_id = NEW.match_id
      AND status = 'waitlist'
  )
  UPDATE match_participants mp
  SET waitlist_position = numbered.position
  FROM numbered
  WHERE mp.id = numbered.id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_waitlist_positions ON match_participants;
CREATE TRIGGER trigger_update_waitlist_positions
AFTER INSERT OR UPDATE OF status ON match_participants
FOR EACH ROW
WHEN (NEW.status = 'waitlist')
EXECUTE FUNCTION update_waitlist_positions();

-- ============================================
-- COMENTÁRIOS
-- ============================================

COMMENT ON TABLE notifications IS 'Notificações do sistema para usuários';
COMMENT ON TABLE notification_preferences IS 'Preferências de notificação por tipo';
COMMENT ON COLUMN profiles.no_show_count IS 'Número de faltas (não comparecimentos)';
COMMENT ON COLUMN profiles.attendance_rate IS 'Taxa de comparecimento em porcentagem';
COMMENT ON COLUMN profiles.suspended_until IS 'Data até quando o usuário está suspenso';
COMMENT ON COLUMN match_participants.confirmed_presence IS 'Se o usuário confirmou presença';
COMMENT ON COLUMN match_participants.attended IS 'Se o usuário compareceu à partida';
COMMENT ON COLUMN match_participants.waitlist_position IS 'Posição na lista de espera';
COMMENT ON FUNCTION calculate_attendance_rate IS 'Calcula taxa de comparecimento do usuário';
COMMENT ON FUNCTION register_no_show IS 'Registra falta e aplica penalidades';
COMMENT ON FUNCTION promote_from_waitlist IS 'Promove primeiro da lista de espera';

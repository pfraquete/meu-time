-- Migration: Sistema de Recorrência de Partidas
-- Description: Adiciona suporte completo para partidas recorrentes (séries)

-- ============================================
-- MATCHES: Adicionar campos de série
-- ============================================

ALTER TABLE matches 
ADD COLUMN IF NOT EXISTS series_id UUID,
ADD COLUMN IF NOT EXISTS series_instance_number INT,
ADD COLUMN IF NOT EXISTS is_series_template BOOLEAN DEFAULT FALSE;

-- Índice para buscar partidas de uma série
CREATE INDEX IF NOT EXISTS idx_matches_series ON matches(series_id);

-- ============================================
-- MATCH_SERIES: Tabela de séries
-- ============================================

CREATE TABLE IF NOT EXISTS match_series (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  description TEXT,
  organizer_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  sport_id UUID REFERENCES sports(id),
  venue_id UUID REFERENCES venues(id),
  
  -- Configurações da série
  recurrence TEXT NOT NULL CHECK (recurrence IN ('weekly', 'biweekly', 'monthly')),
  start_date TIMESTAMPTZ NOT NULL,
  end_date TIMESTAMPTZ,
  max_occurrences INT,
  
  -- Configurações padrão das partidas
  duration_minutes INT NOT NULL,
  min_players INT NOT NULL,
  max_players INT NOT NULL,
  price DECIMAL(10, 2) DEFAULT 0,
  skill_level TEXT CHECK (skill_level IN ('beginner', 'intermediate', 'advanced', 'any')),
  gender TEXT CHECK (gender IN ('male', 'female', 'mixed')),
  
  -- Metadados
  total_instances INT DEFAULT 0,
  active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS para match_series
ALTER TABLE match_series ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view series" ON match_series;
CREATE POLICY "Anyone can view series" 
ON match_series FOR SELECT 
USING (TRUE);

DROP POLICY IF EXISTS "Organizers can create series" ON match_series;
CREATE POLICY "Organizers can create series" 
ON match_series FOR INSERT 
WITH CHECK ((select auth.uid()) = organizer_id);

DROP POLICY IF EXISTS "Organizers can update own series" ON match_series;
CREATE POLICY "Organizers can update own series" 
ON match_series FOR UPDATE 
USING ((select auth.uid()) = organizer_id);

DROP POLICY IF EXISTS "Organizers can delete own series" ON match_series;
CREATE POLICY "Organizers can delete own series" 
ON match_series FOR DELETE 
USING ((select auth.uid()) = organizer_id);

-- ============================================
-- FUNÇÃO: Gerar partidas recorrentes
-- ============================================

CREATE OR REPLACE FUNCTION generate_recurring_matches(series_uuid UUID)
RETURNS INT AS $$
DECLARE
  series_record RECORD;
  current_date TIMESTAMPTZ;
  instance_count INT := 0;
  max_instances INT;
  interval_duration INTERVAL;
BEGIN
  -- Buscar dados da série
  SELECT * INTO series_record
  FROM match_series
  WHERE id = series_uuid;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Série não encontrada';
  END IF;
  
  -- Determinar intervalo baseado na recorrência
  CASE series_record.recurrence
    WHEN 'weekly' THEN interval_duration := '1 week'::INTERVAL;
    WHEN 'biweekly' THEN interval_duration := '2 weeks'::INTERVAL;
    WHEN 'monthly' THEN interval_duration := '1 month'::INTERVAL;
  END CASE;
  
  -- Determinar número máximo de instâncias
  IF series_record.max_occurrences IS NOT NULL THEN
    max_instances := series_record.max_occurrences;
  ELSIF series_record.end_date IS NOT NULL THEN
    -- Calcular quantas instâncias cabem até a data final
    max_instances := CEIL(
      EXTRACT(EPOCH FROM (series_record.end_date - series_record.start_date)) /
      EXTRACT(EPOCH FROM interval_duration)
    )::INT;
  ELSE
    -- Padrão: 12 instâncias (3 meses para semanal)
    max_instances := 12;
  END IF;
  
  -- Gerar partidas
  current_date := series_record.start_date;
  
  FOR i IN 1..max_instances LOOP
    -- Verificar se ultrapassou data final
    IF series_record.end_date IS NOT NULL AND current_date > series_record.end_date THEN
      EXIT;
    END IF;
    
    -- Criar partida
    INSERT INTO matches (
      title,
      description,
      organizer_id,
      sport_id,
      venue_id,
      match_date,
      duration_minutes,
      min_players,
      max_players,
      price,
      skill_level,
      gender,
      status,
      recurrence,
      series_id,
      series_instance_number
    ) VALUES (
      series_record.title || ' #' || i,
      series_record.description,
      series_record.organizer_id,
      series_record.sport_id,
      series_record.venue_id,
      current_date,
      series_record.duration_minutes,
      series_record.min_players,
      series_record.max_players,
      series_record.price,
      series_record.skill_level,
      series_record.gender,
      'open',
      series_record.recurrence,
      series_uuid,
      i
    );
    
    instance_count := instance_count + 1;
    current_date := current_date + interval_duration;
  END LOOP;
  
  -- Atualizar contador na série
  UPDATE match_series
  SET 
    total_instances = instance_count,
    updated_at = NOW()
  WHERE id = series_uuid;
  
  RETURN instance_count;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- FUNÇÃO: Cancelar série completa
-- ============================================

CREATE OR REPLACE FUNCTION cancel_match_series(series_uuid UUID)
RETURNS INT AS $$
DECLARE
  cancelled_count INT;
BEGIN
  -- Cancelar todas as partidas futuras da série
  UPDATE matches
  SET 
    status = 'cancelled',
    updated_at = NOW()
  WHERE series_id = series_uuid
    AND match_date > NOW()
    AND status NOT IN ('cancelled', 'completed')
  RETURNING COUNT(*) INTO cancelled_count;
  
  -- Desativar série
  UPDATE match_series
  SET 
    active = FALSE,
    updated_at = NOW()
  WHERE id = series_uuid;
  
  -- Notificar participantes
  INSERT INTO notifications (user_id, type, title, message, data)
  SELECT DISTINCT
    mp.user_id,
    'series_cancelled',
    'Série de partidas cancelada',
    'Uma série de partidas que você estava participando foi cancelada pelo organizador.',
    jsonb_build_object('series_id', series_uuid)
  FROM match_participants mp
  JOIN matches m ON mp.match_id = m.id
  WHERE m.series_id = series_uuid
    AND m.match_date > NOW()
    AND mp.status IN ('pending', 'confirmed');
  
  RETURN cancelled_count;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- FUNÇÃO: Editar série (aplicar mudanças a partidas futuras)
-- ============================================

CREATE OR REPLACE FUNCTION update_series_matches(
  series_uuid UUID,
  new_venue_id UUID DEFAULT NULL,
  new_price DECIMAL DEFAULT NULL,
  new_duration INT DEFAULT NULL,
  new_skill_level TEXT DEFAULT NULL
)
RETURNS INT AS $$
DECLARE
  updated_count INT;
BEGIN
  -- Atualizar partidas futuras da série
  UPDATE matches
  SET 
    venue_id = COALESCE(new_venue_id, venue_id),
    price = COALESCE(new_price, price),
    duration_minutes = COALESCE(new_duration, duration_minutes),
    skill_level = COALESCE(new_skill_level, skill_level),
    updated_at = NOW()
  WHERE series_id = series_uuid
    AND match_date > NOW()
    AND status = 'open'
  RETURNING COUNT(*) INTO updated_count;
  
  -- Atualizar série
  UPDATE match_series
  SET 
    venue_id = COALESCE(new_venue_id, venue_id),
    price = COALESCE(new_price, price),
    duration_minutes = COALESCE(new_duration, duration_minutes),
    skill_level = COALESCE(new_skill_level, skill_level),
    updated_at = NOW()
  WHERE id = series_uuid;
  
  RETURN updated_count;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- VIEW: Próximas partidas de séries ativas
-- ============================================

CREATE OR REPLACE VIEW series_upcoming_matches AS
SELECT 
  ms.id as series_id,
  ms.title as series_title,
  ms.recurrence,
  ms.organizer_id,
  COUNT(m.id) as total_matches,
  COUNT(m.id) FILTER (WHERE m.match_date > NOW()) as upcoming_matches,
  MIN(m.match_date) FILTER (WHERE m.match_date > NOW()) as next_match_date,
  MAX(m.match_date) as last_match_date
FROM match_series ms
LEFT JOIN matches m ON m.series_id = ms.id
WHERE ms.active = TRUE
GROUP BY ms.id, ms.title, ms.recurrence, ms.organizer_id;

-- ============================================
-- ÍNDICES ADICIONAIS
-- ============================================

CREATE INDEX IF NOT EXISTS idx_matches_series_instance ON matches(series_id, series_instance_number);
CREATE INDEX IF NOT EXISTS idx_match_series_organizer ON match_series(organizer_id);
CREATE INDEX IF NOT EXISTS idx_match_series_active ON match_series(active) WHERE active = TRUE;

-- ============================================
-- COMENTÁRIOS
-- ============================================

COMMENT ON TABLE match_series IS 'Séries de partidas recorrentes';
COMMENT ON COLUMN matches.series_id IS 'ID da série a que esta partida pertence';
COMMENT ON COLUMN matches.series_instance_number IS 'Número da instância na série (1, 2, 3...)';
COMMENT ON FUNCTION generate_recurring_matches IS 'Gera partidas recorrentes para uma série';
COMMENT ON FUNCTION cancel_match_series IS 'Cancela todas as partidas futuras de uma série';
COMMENT ON FUNCTION update_series_matches IS 'Atualiza configurações de partidas futuras de uma série';
COMMENT ON VIEW series_upcoming_matches IS 'Visão geral de séries ativas com próximas partidas';

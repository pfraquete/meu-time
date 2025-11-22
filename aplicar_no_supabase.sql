-- ============================================
-- MIGRATION 008: XP TRANSACTIONS
-- ============================================
-- Copie e cole este SQL no Supabase SQL Editor
-- Dashboard > SQL Editor > New Query
-- ============================================

-- 1. Criar tabela de transações de XP
CREATE TABLE IF NOT EXISTS xp_transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  amount INTEGER NOT NULL,
  reason TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('match_created', 'match_participated', 'badge_earned', 'challenge_completed', 'manual')),
  reference_id UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Criar índices
CREATE INDEX IF NOT EXISTS idx_xp_transactions_user ON xp_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_xp_transactions_created_at ON xp_transactions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_xp_transactions_type ON xp_transactions(type);

-- 3. Habilitar RLS
ALTER TABLE xp_transactions ENABLE ROW LEVEL SECURITY;

-- 4. Criar política de SELECT
DROP POLICY IF EXISTS "Users can view their own XP transactions" ON xp_transactions;
CREATE POLICY "Users can view their own XP transactions"
  ON xp_transactions FOR SELECT
  USING (user_id = (SELECT auth.uid()));

-- 5. Criar função para adicionar transação de XP
CREATE OR REPLACE FUNCTION add_xp_transaction(
  p_user_id UUID,
  p_amount INTEGER,
  p_reason TEXT,
  p_type TEXT,
  p_reference_id UUID DEFAULT NULL
) RETURNS void AS $$
BEGIN
  -- Inserir transação
  INSERT INTO xp_transactions (user_id, amount, reason, type, reference_id)
  VALUES (p_user_id, p_amount, p_reason, p_type, p_reference_id);
  
  -- Atualizar total de XP
  UPDATE user_xp
  SET 
    total_xp = total_xp + p_amount,
    level = FLOOR(SQRT((total_xp + p_amount) / 100)) + 1,
    updated_at = NOW()
  WHERE user_id = p_user_id;
  
  -- Criar registro se não existir
  IF NOT FOUND THEN
    INSERT INTO user_xp (user_id, total_xp, level)
    VALUES (p_user_id, p_amount, FLOOR(SQRT(p_amount / 100)) + 1);
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. Atualizar trigger de criação de partida
CREATE OR REPLACE FUNCTION award_xp_on_match_create() RETURNS TRIGGER AS $$
BEGIN
  PERFORM add_xp_transaction(
    NEW.organizer_id,
    50,
    'Criação de partida',
    'match_created',
    NEW.id
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 7. Atualizar trigger de participação em partida
CREATE OR REPLACE FUNCTION award_xp_on_match_participation() RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'confirmed' THEN
    PERFORM add_xp_transaction(
      NEW.user_id,
      100,
      'Participação em partida',
      'match_participated',
      NEW.match_id
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 8. Adicionar comentários
COMMENT ON TABLE xp_transactions IS 'Histórico de transações de XP dos usuários';
COMMENT ON FUNCTION add_xp_transaction IS 'Registra uma transação de XP e atualiza o total do usuário';

-- ============================================
-- FIM DA MIGRATION
-- ============================================
-- Após executar, verifique:
-- 1. SELECT * FROM xp_transactions LIMIT 1;
-- 2. SELECT add_xp_transaction(auth.uid(), 10, 'Teste', 'manual');
-- 3. SELECT * FROM xp_transactions WHERE user_id = auth.uid();
-- ============================================

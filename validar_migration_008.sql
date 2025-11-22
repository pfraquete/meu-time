-- ============================================
-- VALIDAÇÃO DA MIGRATION 008
-- ============================================
-- Execute este script no Supabase SQL Editor
-- para validar que tudo foi aplicado corretamente
-- ============================================

-- 1. Verificar se a tabela existe
SELECT 'Tabela xp_transactions' as teste, 
       CASE WHEN EXISTS (
         SELECT FROM information_schema.tables 
         WHERE table_schema = 'public' 
         AND table_name = 'xp_transactions'
       ) THEN '✅ EXISTE' ELSE '❌ NÃO EXISTE' END as resultado;

-- 2. Verificar colunas da tabela
SELECT 'Colunas da tabela' as teste, 
       column_name, 
       data_type 
FROM information_schema.columns 
WHERE table_name = 'xp_transactions' 
ORDER BY ordinal_position;

-- 3. Verificar índices
SELECT 'Índices criados' as teste,
       indexname as nome_indice
FROM pg_indexes 
WHERE tablename = 'xp_transactions';

-- 4. Verificar RLS
SELECT 'RLS habilitado' as teste,
       CASE WHEN relrowsecurity THEN '✅ SIM' ELSE '❌ NÃO' END as resultado
FROM pg_class 
WHERE relname = 'xp_transactions';

-- 5. Verificar políticas
SELECT 'Políticas RLS' as teste,
       policyname as nome_politica,
       cmd as comando
FROM pg_policies 
WHERE tablename = 'xp_transactions';

-- 6. Verificar função add_xp_transaction
SELECT 'Função add_xp_transaction' as teste,
       CASE WHEN EXISTS (
         SELECT FROM pg_proc 
         WHERE proname = 'add_xp_transaction'
       ) THEN '✅ EXISTE' ELSE '❌ NÃO EXISTE' END as resultado;

-- 7. Verificar triggers
SELECT 'Trigger award_xp_on_match_create' as teste,
       CASE WHEN EXISTS (
         SELECT FROM pg_trigger 
         WHERE tgname = 'award_xp_on_match_create'
       ) THEN '✅ EXISTE' ELSE '❌ NÃO EXISTE' END as resultado;

SELECT 'Trigger award_xp_on_match_participation' as teste,
       CASE WHEN EXISTS (
         SELECT FROM pg_trigger 
         WHERE tgname = 'award_xp_on_match_participation'
       ) THEN '✅ EXISTE' ELSE '❌ NÃO EXISTE' END as resultado;

-- 8. Testar inserção (cria transação de teste)
SELECT 'Teste de inserção' as teste;
SELECT add_xp_transaction(
  auth.uid(), 
  10, 
  'Teste de validação da migration 008', 
  'manual'
);

-- 9. Verificar transação criada
SELECT 'Transações criadas' as teste,
       id,
       amount,
       reason,
       type,
       created_at
FROM xp_transactions 
WHERE user_id = auth.uid() 
ORDER BY created_at DESC 
LIMIT 5;

-- 10. Verificar XP atualizado
SELECT 'XP do usuário' as teste,
       total_xp,
       level,
       league
FROM user_xp 
WHERE user_id = auth.uid();

-- ============================================
-- RESULTADO ESPERADO
-- ============================================
-- Todos os testes devem mostrar ✅
-- Deve aparecer 1 transação de 10 XP
-- Seu XP total deve ter aumentado em 10
-- ============================================

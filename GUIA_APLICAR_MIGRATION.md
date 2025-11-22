# 📋 Guia: Como Aplicar a Migration 008 no Supabase

## 🎯 Objetivo
Aplicar a migration 008 (xp_transactions) no seu projeto Supabase para habilitar o sistema de histórico de XP.

---

## 📝 Passo a Passo

### 1. Abrir Supabase Dashboard
1. Acesse: https://supabase.com/dashboard
2. Faça login se necessário
3. Selecione o projeto **Meu Time** (vwjgvdxdqjnxmcmyqbzn)

### 2. Abrir SQL Editor
1. No menu lateral, clique em **SQL Editor**
2. Clique em **New Query** (botão verde)

### 3. Copiar o SQL
1. Abra o arquivo: `/home/ubuntu/aplicar_no_supabase.sql`
2. Copie **TODO** o conteúdo (Ctrl+A, Ctrl+C)

### 4. Colar e Executar
1. Cole o SQL no editor (Ctrl+V)
2. Clique em **Run** (ou pressione Ctrl+Enter)
3. Aguarde a execução (deve levar ~2-3 segundos)

### 5. Verificar Sucesso
Você deve ver a mensagem: **"Success. No rows returned"**

Se houver erro, copie a mensagem e me envie.

---

## ✅ Validação

Após executar, rode estes comandos para validar:

### Verificar se a tabela existe:
```sql
SELECT * FROM xp_transactions LIMIT 1;
```
**Resultado esperado:** "No rows" (tabela vazia, mas existe)

### Testar função de adicionar XP:
```sql
SELECT add_xp_transaction(
  auth.uid(), 
  10, 
  'Teste manual', 
  'manual'
);
```
**Resultado esperado:** "Success. No rows returned"

### Ver transações criadas:
```sql
SELECT * FROM xp_transactions 
WHERE user_id = auth.uid() 
ORDER BY created_at DESC;
```
**Resultado esperado:** 1 linha com 10 XP de "Teste manual"

---

## 🎉 Pronto!

Se todos os comandos funcionaram, a migration foi aplicada com sucesso!

O sistema de XP agora vai:
- ✅ Registrar todas as transações de XP
- ✅ Dar +50 XP ao criar partida
- ✅ Dar +100 XP ao participar de partida
- ✅ Mostrar histórico no componente XPHistoryCard

---

## 🐛 Problemas Comuns

### Erro: "relation xp_transactions already exists"
**Solução:** A tabela já existe. Tudo certo!

### Erro: "permission denied"
**Solução:** Você precisa ser admin do projeto. Verifique suas permissões.

### Erro: "function add_xp_transaction already exists"
**Solução:** A função já existe. Use `CREATE OR REPLACE FUNCTION` (já está no SQL).

---

## 📞 Suporte

Se tiver qualquer problema, me envie:
1. A mensagem de erro completa
2. Screenshot do SQL Editor
3. Qual comando deu erro

Vou te ajudar a resolver! 🚀

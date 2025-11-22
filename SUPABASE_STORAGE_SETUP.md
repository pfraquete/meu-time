# Configuração do Supabase Storage

Este documento descreve como configurar o Supabase Storage para upload de avatares.

## 1. Criar Bucket de Avatares

1. Acesse o [Supabase Dashboard](https://app.supabase.com)
2. Vá para **Storage** no menu lateral
3. Clique em **Create a new bucket**
4. Configure o bucket:
   - **Name**: `avatars`
   - **Public bucket**: ✅ **Ativado** (permite acesso público aos avatares)
   - **File size limit**: `2 MB` (máximo 2 megabytes por arquivo)
   - **Allowed MIME types**: `image/jpeg,image/jpg,image/png,image/webp`

5. Clique em **Create bucket**

## 2. Configurar Políticas de Segurança (RLS)

Após criar o bucket, configure as políticas de Row Level Security:

### 2.1. Política de Upload (INSERT)

```sql
-- Permitir que usuários autenticados façam upload apenas de seus próprios avatares
CREATE POLICY "Users can upload their own avatar"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'avatars' AND
  (storage.foldername(name))[1] = 'avatars' AND
  auth.uid()::text = (regexp_match(name, '^avatars/([^-]+)'))[1]
);
```

### 2.2. Política de Leitura (SELECT)

```sql
-- Permitir que todos vejam os avatares (público)
CREATE POLICY "Anyone can view avatars"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'avatars');
```

### 2.3. Política de Atualização (UPDATE)

```sql
-- Permitir que usuários atualizem apenas seus próprios avatares
CREATE POLICY "Users can update their own avatar"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'avatars' AND
  auth.uid()::text = (regexp_match(name, '^avatars/([^-]+)'))[1]
)
WITH CHECK (
  bucket_id = 'avatars' AND
  auth.uid()::text = (regexp_match(name, '^avatars/([^-]+)'))[1]
);
```

### 2.4. Política de Exclusão (DELETE)

```sql
-- Permitir que usuários deletem apenas seus próprios avatares
CREATE POLICY "Users can delete their own avatar"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'avatars' AND
  auth.uid()::text = (regexp_match(name, '^avatars/([^-]+)'))[1]
);
```

## 3. Aplicar Políticas via Dashboard

**Opção 1: Via SQL Editor**

1. Vá para **SQL Editor** no Supabase Dashboard
2. Cole as políticas acima
3. Execute o script

**Opção 2: Via Storage Policies**

1. Vá para **Storage** → **Policies**
2. Selecione o bucket `avatars`
3. Clique em **New Policy**
4. Configure cada política manualmente:
   - **Upload Policy**: INSERT - authenticated users only
   - **Download Policy**: SELECT - public access
   - **Update Policy**: UPDATE - authenticated users (own files)
   - **Delete Policy**: DELETE - authenticated users (own files)

## 4. Testar Configuração

Execute este script no SQL Editor para verificar se o bucket foi criado corretamente:

```sql
-- Verificar se o bucket existe
SELECT * FROM storage.buckets WHERE name = 'avatars';

-- Verificar políticas aplicadas
SELECT * FROM pg_policies WHERE tablename = 'objects' AND policyname LIKE '%avatar%';
```

## 5. Estrutura de Arquivos

Os avatares serão salvos com o seguinte formato:

```
avatars/
  └── {user_id}-{timestamp}.{ext}
```

Exemplo:
```
avatars/123e4567-e89b-12d3-a456-426614174000-1700000000000.jpg
```

## 6. Formato de URL Pública

As URLs públicas dos avatares seguirão este padrão:

```
https://{project-id}.supabase.co/storage/v1/object/public/avatars/{user_id}-{timestamp}.{ext}
```

## 7. Validações Implementadas

O componente `AvatarUpload` já possui validações:

- ✅ Tipos de arquivo permitidos: JPG, PNG, WebP
- ✅ Tamanho máximo: 2MB
- ✅ Preview antes do upload
- ✅ Delete automático do avatar anterior ao fazer upload de novo
- ✅ Atualização automática do perfil com a nova URL

## 8. Troubleshooting

### Erro: "Policy violation"
- Verifique se as políticas RLS foram aplicadas corretamente
- Confirme que o usuário está autenticado

### Erro: "Bucket not found"
- Verifique se o bucket `avatars` foi criado
- Confirme o nome exato do bucket (case-sensitive)

### Upload muito lento
- Verifique a conexão com internet
- Considere reduzir o tamanho da imagem antes do upload

### Avatar não aparece após upload
- Verifique se a URL foi salva corretamente na tabela `profiles`
- Confirme que o bucket está configurado como público
- Limpe o cache do navegador

## 9. Próximos Passos

- [ ] Implementar redimensionamento de imagens no servidor
- [ ] Adicionar crop de imagem antes do upload
- [ ] Implementar compressão de imagens
- [ ] Adicionar CDN para servir avatares

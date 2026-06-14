-- Garante que o usuário autenticado pelo email tenha papel ADMIN na tabela users.
-- Execute no Supabase SQL Editor (Dashboard > SQL Editor > New query).

INSERT INTO users (id, nome, papel)
SELECT
  id,
  COALESCE(raw_user_meta_data->>'nome', split_part(email, '@', 1)) AS nome,
  'ADMIN' AS papel
FROM auth.users
WHERE email = 'vitorpassosmkt@gmail.com'
ON CONFLICT (id) DO UPDATE SET
  papel = 'ADMIN';

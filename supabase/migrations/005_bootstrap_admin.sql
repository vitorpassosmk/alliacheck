-- Bootstrap do usuário ADMIN de demonstração
-- Execute APÓS criar o usuário no Supabase Auth Dashboard:
--   Authentication > Users > Add User
--   Email: admin@madia.com.br
--   Password: (defina uma senha segura)
--
-- Depois copie o UUID do usuário criado e substitua abaixo:

INSERT INTO users (id, nome, papel) VALUES
  ('<UUID_DO_USUARIO_AQUI>', 'Admin Madiã', 'ADMIN')
ON CONFLICT (id) DO UPDATE SET
  nome = EXCLUDED.nome,
  papel = EXCLUDED.papel;

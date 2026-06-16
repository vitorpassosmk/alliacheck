-- Adiciona FK de eventos.usuario_id para public.users.id
-- Necessário para o PostgREST fazer o join eventos → users nos selects aninhados (ex: eventos(*, users(nome, papel)))
-- A FK original para auth.users permanece intacta; esta é adicional.
ALTER TABLE eventos
  ADD CONSTRAINT eventos_usuario_id_fkey_public
  FOREIGN KEY (usuario_id) REFERENCES users(id) ON DELETE SET NULL;

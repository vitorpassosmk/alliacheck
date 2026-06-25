-- Permite que qualquer usuário autenticado veja perfis de outros usuários
-- Necessário para o JOIN eventos → users(nome, papel) na EventTimeline
--
-- Raiz do bug: "select_own_profile" usava USING (id = auth.uid()), então
-- quando o PostgREST fazia o join de eventos com users, só resolvia o nome
-- para eventos do próprio usuário logado; os demais apareciam como "Sistema".
--
-- Num sistema single-tenant (mesma empresa) não há problema em expor
-- nome e papel dos colegas — todos já trabalham juntos.
CREATE POLICY "select_any_authenticated"
  ON users
  FOR SELECT
  TO authenticated
  USING (true);

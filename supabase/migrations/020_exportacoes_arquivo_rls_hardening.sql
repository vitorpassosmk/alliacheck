-- Hardening da RLS de exportacoes_arquivo (achado da revisão de segurança automática).
-- Antes: INSERT/SELECT liberados para qualquer authenticated (with check/using (true)),
-- o que permitiria a um usuário autenticado forjar um registro de "limpeza" diretamente
-- via API do Supabase (fora da rota /api/relatorios/exportar-fretes) ou ler o log de
-- auditoria sem ser ADMIN/SUPERVISOR. A rota da API já só insere com
-- executado_por = user.id e já é role-gated para ADMIN/SUPERVISOR — esta migration
-- apenas espelha essa mesma regra na RLS, como defesa em profundidade.

drop policy if exists "exportacoes_arquivo_insert_authenticated" on exportacoes_arquivo;
drop policy if exists "exportacoes_arquivo_select_authenticated" on exportacoes_arquivo;

create policy "exportacoes_arquivo_insert_admin_supervisor"
  on exportacoes_arquivo for insert
  to authenticated
  with check (
    executado_por = auth.uid()
    and exists (
      select 1 from users
      where id = auth.uid() and papel in ('ADMIN', 'SUPERVISOR')
    )
  );

create policy "exportacoes_arquivo_select_admin_supervisor"
  on exportacoes_arquivo for select
  to authenticated
  using (
    exists (
      select 1 from users
      where id = auth.uid() and papel in ('ADMIN', 'SUPERVISOR')
    )
  );

-- Sem policy de UPDATE/DELETE (mantém o registro imutável, como já era).

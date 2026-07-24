-- Registro permanente e imutável de exportações + limpeza de fretes concluídos/cancelados
-- (feature de liberação de espaço). Nunca recebe UPDATE/DELETE, mesma política de `eventos`.
-- Mesmo que os eventos detalhados dos fretes exportados sejam removidos junto, esta tabela
-- prova quem executou a limpeza, quando, e quais fretes foram removidos.
create table if not exists exportacoes_arquivo (
  id uuid primary key default gen_random_uuid(),
  executado_por uuid references users(id) on delete set null,
  executado_em timestamptz not null default now(),
  quantidade_fretes integer not null,
  numeros_fretes text[] not null,
  ip_address text,
  user_agent text
);

alter table exportacoes_arquivo enable row level security;

-- Qualquer usuário autenticado pode ler o histórico de exportações (transparência/auditoria).
create policy "exportacoes_arquivo_select_authenticated"
  on exportacoes_arquivo for select
  to authenticated
  using (true);

-- Apenas INSERT é permitido (via rota de API, com service role ou usuário autenticado ADMIN/SUPERVISOR
-- já validado na aplicação). Não há policy de UPDATE nem DELETE: a tabela é apenas-inserção.
create policy "exportacoes_arquivo_insert_authenticated"
  on exportacoes_arquivo for insert
  to authenticated
  with check (true);

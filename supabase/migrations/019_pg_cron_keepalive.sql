-- Keep-alive do Supabase (plano free pausa o projeto após 7 dias sem atividade).
-- Um job interno do próprio Postgres (pg_cron) grava um heartbeat a cada 3 dias,
-- sem depender de nenhuma infraestrutura externa nem expor endpoint público.
--
-- Pré-requisito: habilitar a extensão "pg_cron" em Database > Extensions no painel
-- do Supabase antes de rodar esta migration (gratuita, mas não vem ativada por padrão).

create extension if not exists pg_cron with schema extensions;

create table if not exists system_heartbeat (
  id smallint primary key default 1,
  last_ping timestamptz not null default now(),
  constraint system_heartbeat_singleton check (id = 1)
);

alter table system_heartbeat enable row level security;
-- Sem policies: ninguém via API/PostgREST lê ou escreve nesta tabela.
-- O job do pg_cron roda como owner do banco e ignora RLS.

insert into system_heartbeat (id, last_ping) values (1, now())
  on conflict (id) do nothing;

select cron.schedule(
  'supabase-keepalive',
  '0 3 */3 * *', -- a cada 3 dias, às 03:00 UTC — bem dentro da janela de 7 dias de inatividade
  $$ update system_heartbeat set last_ping = now() where id = 1; $$
);

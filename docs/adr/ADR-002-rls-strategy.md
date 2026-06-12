# ADR-002 — Estratégia de RLS: authenticated vs papel

**Status:** Aceito  
**Data:** 2026-06-11

## Decisão

SELECT aberto a todos os usuários autenticados. Mutations (INSERT/UPDATE) validadas nas API Routes por papel.

## Motivo

- Sistema single-tenant: todos na mesma empresa têm acesso à mesma base
- Controle de papel mais legível no código TypeScript do que em policies SQL complexas
- Eventos são imutáveis: sem policy de UPDATE/DELETE = bloqueado por padrão com RLS ativo
- Simplicidade para equipe pequena

## Consequências

- Toda API Route deve verificar papel antes de executar mutations
- Qualquer usuário autenticado pode ler todos os dados (aceitável para single-tenant)
- Se multi-tenant for adicionado no futuro, RLS precisa ser revisado

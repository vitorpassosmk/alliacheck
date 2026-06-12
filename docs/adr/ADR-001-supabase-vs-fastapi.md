# ADR-001 — Supabase vs FastAPI + PostgreSQL

**Status:** Aceito  
**Data:** 2026-06-11

## Decisão

Utilizar Supabase como backend completo (Auth, Database, Storage, Realtime).

## Motivo

- RLS nativo elimina lógica de autorização duplicada
- Storage + Realtime integrados sem infra adicional
- Auth gerenciado: tokens JWT, refresh automático, magic link
- Time to market ~40% menor para sistema single-tenant
- Sem servidor separado para manter (reduz custo operacional)

## Consequências

- Vendor lock-in parcial no Supabase
- Lógica crítica de negócio validada nas API Routes do Next.js
- Sem necessidade de FastAPI, Docker ou ORM externo

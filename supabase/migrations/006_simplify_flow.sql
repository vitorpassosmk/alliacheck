-- Migration: 006_simplify_flow.sql
-- Simplifica o pipeline de viagem para:
--   ABERTO → CARREGANDO → AGUARDANDO_CTE → CTE_EMITIDO → EM_VIAGEM → FINALIZADO
--
-- Mudanças:
--   1. Remove PROGRAMADO e adiciona AGUARDANDO_CTE e CTE_EMITIDO ao CHECK de status
--   2. Migra fretes com status PROGRAMADO → ABERTO
--   3. Adiciona coluna chave_cte CHAR(44) (nullable)
--   4. Remove coluna cte_status
--   5. Remove tabela documentos (CASCADE)

-- ============================================================
-- 1. Migrar registros PROGRAMADO → ABERTO antes de mudar o constraint
-- ============================================================
UPDATE fretes
SET status = 'ABERTO'
WHERE status = 'PROGRAMADO';

-- ============================================================
-- 2. Substituir o CHECK constraint de status em fretes
-- ============================================================

-- Remover constraint antiga (nome gerado pelo Postgres: fretes_status_check)
ALTER TABLE fretes DROP CONSTRAINT IF EXISTS fretes_status_check;

-- Adicionar novo CHECK com os valores do pipeline simplificado
ALTER TABLE fretes
  ADD CONSTRAINT fretes_status_check
  CHECK (status IN (
    'ABERTO',
    'CARREGANDO',
    'AGUARDANDO_CTE',
    'CTE_EMITIDO',
    'EM_VIAGEM',
    'FINALIZADO',
    'CANCELADO'
  ));

-- ============================================================
-- 3. Adicionar coluna chave_cte (nullable, 44 caracteres)
-- ============================================================
ALTER TABLE fretes
  ADD COLUMN IF NOT EXISTS chave_cte char(44);

-- ============================================================
-- 4. Remover coluna cte_status (e seu CHECK implícito)
-- ============================================================
ALTER TABLE fretes
  DROP COLUMN IF EXISTS cte_status;

-- ============================================================
-- 5. Remover tabela documentos (e políticas RLS dependentes)
-- ============================================================
DROP TABLE IF EXISTS documentos CASCADE;

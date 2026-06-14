-- Migration: 008_madia_redesign.sql
-- Redesign operacional Madiã:
--   1. Novo pipeline: ABERTO→PROGRAMADO→CARREGANDO→CTE_EMITIDO→AGUARDANDO_LIBERACAO→EM_VIAGEM→CONCLUIDA
--   2. numero_frete editável (prefixo F-XXXX + sequência Postgres)
--   3. Novos campos em fretes: tipo_produto, valor_mercadoria, numero_gr, numero_contrato, numero_ciot, valor_adiantamento
--   4. Motoristas: tipo_motorista (FROTA|AGREGADO) + dados bancários
--   5. Veículos: CARRETA_LS, tipo_veiculo (FROTA|AGREGADO), placa dupla, cpf_proprietario, dados bancários do proprietário

-- ============================================================
-- 1. FRETES: dropar constraint ANTES de migrar dados
-- (a constraint antiga não conhece CONCLUIDA nem PROGRAMADO)
-- ============================================================

ALTER TABLE fretes DROP CONSTRAINT IF EXISTS fretes_status_check;

-- ============================================================
-- 2. FRETES: migrar dados de status legados
-- ============================================================

-- FINALIZADO → CONCLUIDA (renomeação semântica)
UPDATE fretes SET status = 'CONCLUIDA' WHERE status = 'FINALIZADO';

-- AGUARDANDO_CTE → CARREGANDO (esses fretes precisarão redigitar o CT-e)
UPDATE fretes SET status = 'CARREGANDO' WHERE status = 'AGUARDANDO_CTE';

-- ============================================================
-- 3. FRETES: adicionar nova CHECK constraint de status
-- ============================================================

ALTER TABLE fretes
  ADD CONSTRAINT fretes_status_check
  CHECK (status IN (
    'ABERTO',
    'PROGRAMADO',
    'CARREGANDO',
    'CTE_EMITIDO',
    'AGUARDANDO_LIBERACAO',
    'EM_VIAGEM',
    'CONCLUIDA',
    'CANCELADO'
  ));

-- ============================================================
-- 3. FRETES: numero_frete com sequência Postgres
-- ============================================================

CREATE SEQUENCE IF NOT EXISTS frete_numero_seq START 1;

ALTER TABLE fretes ADD COLUMN IF NOT EXISTS numero_frete TEXT;

-- Popular registros existentes de forma sequencial (por data de criação)
WITH numbered AS (
  SELECT id,
         'F-' || LPAD(ROW_NUMBER() OVER (ORDER BY criado_em ASC)::TEXT, 4, '0') AS num
  FROM fretes
)
UPDATE fretes
SET numero_frete = numbered.num
FROM numbered
WHERE fretes.id = numbered.id;

-- Avançar a sequência para além dos registros já criados
DO $$
DECLARE cnt INT;
BEGIN
  SELECT COUNT(*) INTO cnt FROM fretes;
  IF cnt > 0 THEN
    PERFORM setval('frete_numero_seq', cnt);
  END IF;
END $$;

-- Tornar NOT NULL após popular todos os registros existentes
ALTER TABLE fretes ALTER COLUMN numero_frete SET NOT NULL;

-- Constraint de unicidade
ALTER TABLE fretes DROP CONSTRAINT IF EXISTS fretes_numero_frete_unique;
ALTER TABLE fretes ADD CONSTRAINT fretes_numero_frete_unique UNIQUE (numero_frete);

-- Default para novos inserts (usa a sequência)
ALTER TABLE fretes
  ALTER COLUMN numero_frete
  SET DEFAULT ('F-' || LPAD(nextval('frete_numero_seq')::TEXT, 4, '0'));

-- ============================================================
-- 4. FRETES: novos campos operacionais e financeiros
-- ============================================================

ALTER TABLE fretes ADD COLUMN IF NOT EXISTS tipo_produto       TEXT;
ALTER TABLE fretes ADD COLUMN IF NOT EXISTS valor_mercadoria   NUMERIC(15,2) CHECK (valor_mercadoria IS NULL OR valor_mercadoria > 0);
ALTER TABLE fretes ADD COLUMN IF NOT EXISTS numero_gr          TEXT;
ALTER TABLE fretes ADD COLUMN IF NOT EXISTS numero_contrato    TEXT;
ALTER TABLE fretes ADD COLUMN IF NOT EXISTS numero_ciot        TEXT;
ALTER TABLE fretes ADD COLUMN IF NOT EXISTS valor_adiantamento NUMERIC(12,2) CHECK (valor_adiantamento IS NULL OR valor_adiantamento > 0);

-- ============================================================
-- 5. MOTORISTAS: tipo_motorista + dados bancários
-- ============================================================

ALTER TABLE motoristas ADD COLUMN IF NOT EXISTS tipo_motorista TEXT;
ALTER TABLE motoristas DROP CONSTRAINT IF EXISTS motoristas_tipo_motorista_check;
ALTER TABLE motoristas ADD CONSTRAINT motoristas_tipo_motorista_check
  CHECK (tipo_motorista IS NULL OR tipo_motorista IN ('FROTA', 'AGREGADO'));

ALTER TABLE motoristas ADD COLUMN IF NOT EXISTS banco        TEXT;
ALTER TABLE motoristas ADD COLUMN IF NOT EXISTS agencia_conta TEXT;
ALTER TABLE motoristas ADD COLUMN IF NOT EXISTS chave_pix    TEXT;

-- ============================================================
-- 6. VEÍCULOS: CARRETA_LS + tipo_veiculo + placa dupla + dados bancários do proprietário
-- ============================================================

-- Atualizar CHECK de tipo para incluir CARRETA_LS
ALTER TABLE veiculos DROP CONSTRAINT IF EXISTS veiculos_tipo_check;

ALTER TABLE veiculos
  ADD CONSTRAINT veiculos_tipo_check
  CHECK (tipo IN ('VAN', 'TOCO', 'TRUCK', 'BITRUCK', 'CARRETA', 'CARRETA_LS', 'BITREM'));

-- tipo_veiculo (frota ou agregado)
ALTER TABLE veiculos ADD COLUMN IF NOT EXISTS tipo_veiculo TEXT;
ALTER TABLE veiculos DROP CONSTRAINT IF EXISTS veiculos_tipo_veiculo_check;
ALTER TABLE veiculos ADD CONSTRAINT veiculos_tipo_veiculo_check
  CHECK (tipo_veiculo IS NULL OR tipo_veiculo IN ('FROTA', 'AGREGADO'));

-- Placa dupla para veículos articulados
ALTER TABLE veiculos ADD COLUMN IF NOT EXISTS tem_placas_separadas BOOLEAN DEFAULT FALSE;
ALTER TABLE veiculos ADD COLUMN IF NOT EXISTS placa_carreta        TEXT;

-- Dados do proprietário
ALTER TABLE veiculos ADD COLUMN IF NOT EXISTS cpf_proprietario            TEXT;
ALTER TABLE veiculos ADD COLUMN IF NOT EXISTS banco_proprietario          TEXT;
ALTER TABLE veiculos ADD COLUMN IF NOT EXISTS agencia_conta_proprietario  TEXT;
ALTER TABLE veiculos ADD COLUMN IF NOT EXISTS chave_pix_proprietario      TEXT;

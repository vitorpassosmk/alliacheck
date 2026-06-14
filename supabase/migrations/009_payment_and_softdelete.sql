-- migration 009: rastreamento de pagamento e soft-delete de fretes

-- Adicionar campos de pagamento na tabela fretes
ALTER TABLE fretes
  ADD COLUMN IF NOT EXISTS pago_em        TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS pago_por       UUID REFERENCES users(id),
  ADD COLUMN IF NOT EXISTS excluido_em    TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS excluido_por   UUID REFERENCES users(id);

-- Comentários explicativos
COMMENT ON COLUMN fretes.pago_em     IS 'Timestamp em que o pagamento foi confirmado pelo financeiro';
COMMENT ON COLUMN fretes.pago_por    IS 'Usuário que confirmou o pagamento';
COMMENT ON COLUMN fretes.excluido_em IS 'Soft-delete: timestamp de exclusão (preserva rastreabilidade)';
COMMENT ON COLUMN fretes.excluido_por IS 'Usuário que executou a exclusão';

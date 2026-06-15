-- Migration 010: Ajustes operacionais solicitados pelo cliente Madiã
-- Items: custo_agregado, data_carregamento opcional, adiantamento pago, cnpj_proprietario

-- Item 1+13: custo total pago ao proprietário do caminhão ao final da viagem
ALTER TABLE fretes ADD COLUMN IF NOT EXISTS custo_agregado NUMERIC(12,2) CHECK (custo_agregado > 0);

-- Item 2: data de carregamento passa a ser opcional na criação do frete
-- (será exigida somente na transição ABERTO → PROGRAMADO se não tiver sido preenchida antes)
ALTER TABLE fretes ALTER COLUMN data_carregamento DROP NOT NULL;

-- Item 11: rastreio do pagamento de adiantamento (separado do pagamento final pago_em)
ALTER TABLE fretes
  ADD COLUMN IF NOT EXISTS adiantamento_pago_em  TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS adiantamento_pago_por UUID REFERENCES users(id);

-- Item 7: proprietário do veículo pode ter CNPJ em vez de (ou além de) CPF
ALTER TABLE veiculos ADD COLUMN IF NOT EXISTS cnpj_proprietario TEXT;

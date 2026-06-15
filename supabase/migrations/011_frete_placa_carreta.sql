-- Adiciona placa da carreta por frete para registro operacional por viagem
ALTER TABLE fretes ADD COLUMN IF NOT EXISTS placa_carreta text;

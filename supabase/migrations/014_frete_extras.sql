-- Placa do cavalo (trator) por frete — permite informar placa diferente da registrada no veículo
-- sem alterar o cadastro do veículo. Usado em combinações cavalo+carreta com placas distintas.
ALTER TABLE fretes
  ADD COLUMN IF NOT EXISTS placa_cavalo VARCHAR(8);

-- Indica que o motorista é funcionário agregado ao proprietário do veículo.
-- Quando true, a seção de pagamentos exibe os dados bancários de ambos (proprietário e motorista)
-- pois pela ANTT o adiantamento/frete pode ser pago para o proprietário ou seu funcionário.
ALTER TABLE fretes
  ADD COLUMN IF NOT EXISTS motorista_e_funcionario_agregado BOOLEAN NOT NULL DEFAULT false;

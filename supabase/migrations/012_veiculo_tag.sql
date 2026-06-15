-- Adiciona campo TAG ao veículo (identificador eletrônico de pedágio / rastreamento)
ALTER TABLE veiculos ADD COLUMN IF NOT EXISTS tag TEXT;

-- Adiciona campo whatsapp à tabela motoristas
ALTER TABLE motoristas ADD COLUMN IF NOT EXISTS whatsapp TEXT;

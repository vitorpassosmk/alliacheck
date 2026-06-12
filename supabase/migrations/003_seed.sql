-- Clientes
INSERT INTO clientes (razao_social, cnpj, cidade, uf, contato_nome, contato_telefone) VALUES
  ('Petrobras Logística S.A.', '33.000.167/0001-01', 'São Paulo',           'SP', 'Maria Santos', '(11) 99999-0001'),
  ('Embraer S.A.',             '07.689.002/0001-89', 'São José dos Campos', 'SP', 'Carlos Lima',  '(12) 99999-0002');

-- Motoristas
-- Carlos Mendes: validade_cnh 2026-08-20 → alerta de CNH próxima do vencimento
INSERT INTO motoristas (nome, cpf, cnh, categoria_cnh, validade_cnh, rntrc, telefone, status) VALUES
  ('João da Silva', '123.456.789-00', 'SP-001234', 'E', '2027-03-15', 'RNTRC-001', '(12) 98888-1111', 'ATIVO'),
  ('Carlos Mendes', '987.654.321-00', 'SP-005678', 'E', '2026-08-20', 'RNTRC-002', '(12) 98888-2222', 'ATIVO');

-- Veículos
INSERT INTO veiculos (placa, tipo, modelo, ano, proprietario, rntrc) VALUES
  ('MHG-8834', 'CARRETA', 'Scania R450',         2021, 'João da Silva', 'RNTRC-001'),
  ('PLK-2241', 'TRUCK',   'Mercedes Atego 2428', 2019, 'Carlos Mendes', 'RNTRC-002');

-- Fretes de exemplo: criar via dashboard após subir o sistema
-- Sugestão: criar 5 fretes cobrindo todos os status:
--   1x ABERTO (sem motorista)
--   1x PROGRAMADO (com motorista + veículo + data)
--   1x CARREGANDO (cte_status = AGUARDANDO_NF)
--   1x EM_VIAGEM
--   1x FINALIZADO com cte_status = NF_RECEBIDA

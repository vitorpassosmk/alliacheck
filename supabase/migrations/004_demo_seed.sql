-- Seed de demonstração para o ALLiA Check — Madiã Transportes
-- Execute apenas em ambiente de desenvolvimento/demo

-- Limpar dados existentes (ordem respeitando FKs)
DELETE FROM eventos;
DELETE FROM documentos;
DELETE FROM fretes;
DELETE FROM motoristas;
DELETE FROM veiculos;
DELETE FROM clientes;

-- =====================
-- CLIENTES
-- =====================
INSERT INTO clientes (id, razao_social, cnpj, cidade, uf, contato_nome, contato_telefone) VALUES
  ('a1000000-0000-0000-0000-000000000001', 'Distribuidora Horizonte Ltda',    '12.345.678/0001-90', 'São Paulo',     'SP', 'Carlos Mendes',    '(11) 99100-1234'),
  ('a1000000-0000-0000-0000-000000000002', 'Comercial Andrade & Filhos',       '98.765.432/0001-10', 'Campinas',      'SP', 'Ana Andrade',       '(19) 99200-5678'),
  ('a1000000-0000-0000-0000-000000000003', 'Supermercado Boa Compra S.A.',     '11.222.333/0001-44', 'Ribeirão Preto','SP', 'Pedro Gonçalves',   '(16) 99300-9012');

-- =====================
-- MOTORISTAS
-- =====================
INSERT INTO motoristas (id, nome, cpf, cnh, categoria_cnh, validade_cnh, rntrc, telefone, status) VALUES
  ('b2000000-0000-0000-0000-000000000001', 'Roberto Carlos Santos',  '111.222.333-44', '12345678901', 'E', '2027-03-15', '12345-6', '(11) 98000-1111', 'ATIVO'),
  ('b2000000-0000-0000-0000-000000000002', 'Antônio José Ferreira',  '222.333.444-55', '23456789012', 'D', '2026-08-20', '23456-7', '(11) 98000-2222', 'ATIVO'),
  ('b2000000-0000-0000-0000-000000000003', 'Marcos Paulo Oliveira',  '333.444.555-66', '34567890123', 'E', '2028-01-10', '34567-8', '(11) 98000-3333', 'ATIVO'),
  ('b2000000-0000-0000-0000-000000000004', 'José Luiz Rodrigues',    '444.555.666-77', '45678901234', 'C', '2025-11-30', NULL,       '(11) 98000-4444', 'ATIVO'),
  ('b2000000-0000-0000-0000-000000000005', 'Fernando Henrique Lima', '555.666.777-88', '56789012345', 'E', '2027-06-25', '56789-0', '(11) 98000-5555', 'INATIVO');

-- =====================
-- VEÍCULOS
-- =====================
INSERT INTO veiculos (id, placa, tipo, modelo, ano, proprietario, rntrc) VALUES
  ('c3000000-0000-0000-0000-000000000001', 'BRZ-1A23', 'CARRETA',  'Scania R450',      2021, 'Madiã Transportes', '78901-2'),
  ('c3000000-0000-0000-0000-000000000002', 'CDX-4B56', 'TRUCK',    'Mercedes-Benz 2546', 2020, 'Madiã Transportes', '89012-3'),
  ('c3000000-0000-0000-0000-000000000003', 'EFG-7C89', 'TOCO',     'Volkswagen Delivery', 2022, 'Madiã Transportes', '90123-4'),
  ('c4000000-0000-0000-0000-000000000004', 'HIJ-0D12', 'BITRUCK',  'Iveco Trakker 420', 2019, 'Madiã Transportes', NULL);

-- =====================
-- FRETES (vários estados)
-- =====================

-- 1. ABERTO — aguardando programação
INSERT INTO fretes (id, cliente_id, status, cte_status, origem_cidade, origem_uf, destino_cidade, destino_uf, valor_frete, criado_em, atualizado_em)
VALUES ('f0000000-0000-0000-0000-000000000001',
  'a1000000-0000-0000-0000-000000000001', 'ABERTO', 'PENDENTE',
  'São Paulo', 'SP', 'Campinas', 'SP', 1800.00,
  NOW() - INTERVAL '1 day', NOW() - INTERVAL '1 day');

-- 2. ABERTO — sem cliente
INSERT INTO fretes (id, status, cte_status, origem_cidade, origem_uf, destino_cidade, destino_uf, criado_em, atualizado_em)
VALUES ('f0000000-0000-0000-0000-000000000002',
  'ABERTO', 'PENDENTE',
  'Ribeirão Preto', 'SP', 'Franca', 'SP',
  NOW() - INTERVAL '2 hours', NOW() - INTERVAL '2 hours');

-- 3. PROGRAMADO — com motorista, veículo e data
INSERT INTO fretes (id, cliente_id, motorista_id, veiculo_id, status, cte_status,
  origem_cidade, origem_uf, destino_cidade, destino_uf,
  tipo_veiculo, valor_frete, data_carregamento, data_entrega_prevista, criado_em, atualizado_em)
VALUES ('f0000000-0000-0000-0000-000000000003',
  'a1000000-0000-0000-0000-000000000002',
  'b2000000-0000-0000-0000-000000000001',
  'c3000000-0000-0000-0000-000000000001',
  'PROGRAMADO', 'AGUARDANDO_NF',
  'Campinas', 'SP', 'Santos', 'SP',
  'CARRETA', 4500.00,
  (NOW() + INTERVAL '1 day')::date,
  (NOW() + INTERVAL '3 days')::date,
  NOW() - INTERVAL '2 days', NOW() - INTERVAL '1 day');

-- 4. CARREGANDO
INSERT INTO fretes (id, cliente_id, motorista_id, veiculo_id, status, cte_status,
  origem_cidade, origem_uf, destino_cidade, destino_uf,
  tipo_veiculo, valor_frete, data_carregamento, criado_em, atualizado_em)
VALUES ('f0000000-0000-0000-0000-000000000004',
  'a1000000-0000-0000-0000-000000000003',
  'b2000000-0000-0000-0000-000000000002',
  'c3000000-0000-0000-0000-000000000002',
  'CARREGANDO', 'NF_RECEBIDA',
  'Ribeirão Preto', 'SP', 'São Paulo', 'SP',
  'TRUCK', 2800.00, NOW()::date,
  NOW() - INTERVAL '3 days', NOW() - INTERVAL '30 minutes');

-- 5. EM_VIAGEM
INSERT INTO fretes (id, cliente_id, motorista_id, veiculo_id, status, cte_status,
  origem_cidade, origem_uf, destino_cidade, destino_uf,
  tipo_veiculo, valor_frete, data_carregamento, data_entrega_prevista, criado_em, atualizado_em)
VALUES ('f0000000-0000-0000-0000-000000000005',
  'a1000000-0000-0000-0000-000000000001',
  'b2000000-0000-0000-0000-000000000003',
  'c3000000-0000-0000-0000-000000000003',
  'EM_VIAGEM', 'CT_E_EMITIDO',
  'São Paulo', 'SP', 'Belo Horizonte', 'MG',
  'TOCO', 3200.00,
  (NOW() - INTERVAL '1 day')::date,
  NOW()::date,
  NOW() - INTERVAL '4 days', NOW() - INTERVAL '4 hours');

-- 6. FINALIZADO — completo
INSERT INTO fretes (id, cliente_id, motorista_id, veiculo_id, status, cte_status,
  origem_cidade, origem_uf, destino_cidade, destino_uf,
  tipo_veiculo, valor_frete, data_carregamento, data_entrega_prevista, data_entrega_real, criado_em, atualizado_em)
VALUES ('f0000000-0000-0000-0000-000000000006',
  'a1000000-0000-0000-0000-000000000002',
  'b2000000-0000-0000-0000-000000000004',
  'c4000000-0000-0000-0000-000000000004',
  'FINALIZADO', 'CT_E_EMITIDO',
  'Campinas', 'SP', 'Rio de Janeiro', 'RJ',
  'BITRUCK', 5100.00,
  (NOW() - INTERVAL '5 days')::date,
  (NOW() - INTERVAL '3 days')::date,
  (NOW() - INTERVAL '3 days')::date,
  NOW() - INTERVAL '7 days', NOW() - INTERVAL '3 days');

-- 7. FINALIZADO — segundo
INSERT INTO fretes (id, cliente_id, motorista_id, veiculo_id, status, cte_status,
  origem_cidade, origem_uf, destino_cidade, destino_uf,
  tipo_veiculo, valor_frete, data_carregamento, data_entrega_real, criado_em, atualizado_em)
VALUES ('f0000000-0000-0000-0000-000000000007',
  'a1000000-0000-0000-0000-000000000003',
  'b2000000-0000-0000-0000-000000000001',
  'c3000000-0000-0000-0000-000000000001',
  'FINALIZADO', 'CT_E_EMITIDO',
  'São Paulo', 'SP', 'Curitiba', 'PR',
  'CARRETA', 6800.00,
  (NOW() - INTERVAL '10 days')::date,
  (NOW() - INTERVAL '8 days')::date,
  NOW() - INTERVAL '12 days', NOW() - INTERVAL '8 days');

-- 8. CANCELADO
INSERT INTO fretes (id, cliente_id, status, cte_status, origem_cidade, origem_uf, destino_cidade, destino_uf,
  observacoes, criado_em, atualizado_em)
VALUES ('f0000000-0000-0000-0000-000000000008',
  'a1000000-0000-0000-0000-000000000001',
  'CANCELADO', 'PENDENTE',
  'São Paulo', 'SP', 'Manaus', 'AM',
  'Cancelado: cliente solicitou cancelamento por mudança na demanda.',
  NOW() - INTERVAL '8 days', NOW() - INTERVAL '7 days');

-- =====================
-- EVENTOS DE AUDITORIA
-- =====================
INSERT INTO eventos (frete_id, tipo, descricao, status_novo, criado_em) VALUES
  -- Frete 1 (ABERTO)
  ('f0000000-0000-0000-0000-000000000001', 'FRETE_CRIADO', 'Frete criado', 'ABERTO', NOW() - INTERVAL '1 day'),

  -- Frete 3 (PROGRAMADO)
  ('f0000000-0000-0000-0000-000000000003', 'FRETE_CRIADO', 'Frete criado', 'ABERTO', NOW() - INTERVAL '2 days'),
  ('f0000000-0000-0000-0000-000000000003', 'STATUS_ALTERADO', 'Frete programado com motorista e veículo', 'PROGRAMADO', NOW() - INTERVAL '1 day'),
  ('f0000000-0000-0000-0000-000000000003', 'CTE_STATUS_ALTERADO', 'Aguardando recebimento da NF-e', 'AGUARDANDO_NF', NOW() - INTERVAL '1 day'),

  -- Frete 4 (CARREGANDO / NF_RECEBIDA)
  ('f0000000-0000-0000-0000-000000000004', 'FRETE_CRIADO', 'Frete criado', 'ABERTO', NOW() - INTERVAL '3 days'),
  ('f0000000-0000-0000-0000-000000000004', 'STATUS_ALTERADO', 'Frete programado', 'PROGRAMADO', NOW() - INTERVAL '2 days'),
  ('f0000000-0000-0000-0000-000000000004', 'STATUS_ALTERADO', 'Início do carregamento', 'CARREGANDO', NOW() - INTERVAL '1 hour'),
  ('f0000000-0000-0000-0000-000000000004', 'DOCUMENTO_ENVIADO', 'NF-e recebida e validada', 'NF_RECEBIDA', NOW() - INTERVAL '30 minutes'),

  -- Frete 5 (EM_VIAGEM / CT_E_EMITIDO)
  ('f0000000-0000-0000-0000-000000000005', 'FRETE_CRIADO', 'Frete criado', 'ABERTO', NOW() - INTERVAL '4 days'),
  ('f0000000-0000-0000-0000-000000000005', 'STATUS_ALTERADO', 'Frete programado', 'PROGRAMADO', NOW() - INTERVAL '3 days'),
  ('f0000000-0000-0000-0000-000000000005', 'STATUS_ALTERADO', 'Início do carregamento', 'CARREGANDO', NOW() - INTERVAL '2 days'),
  ('f0000000-0000-0000-0000-000000000005', 'STATUS_ALTERADO', 'Veículo em trânsito', 'EM_VIAGEM', NOW() - INTERVAL '4 hours'),
  ('f0000000-0000-0000-0000-000000000005', 'CTE_EMITIDO', 'CT-e emitido com sucesso', 'CT_E_EMITIDO', NOW() - INTERVAL '4 hours'),

  -- Frete 6 (FINALIZADO)
  ('f0000000-0000-0000-0000-000000000006', 'FRETE_CRIADO', 'Frete criado', 'ABERTO', NOW() - INTERVAL '7 days'),
  ('f0000000-0000-0000-0000-000000000006', 'STATUS_ALTERADO', 'Frete programado', 'PROGRAMADO', NOW() - INTERVAL '6 days'),
  ('f0000000-0000-0000-0000-000000000006', 'STATUS_ALTERADO', 'Início do carregamento', 'CARREGANDO', NOW() - INTERVAL '5 days'),
  ('f0000000-0000-0000-0000-000000000006', 'STATUS_ALTERADO', 'Veículo em trânsito', 'EM_VIAGEM', NOW() - INTERVAL '4 days'),
  ('f0000000-0000-0000-0000-000000000006', 'STATUS_ALTERADO', 'Entrega realizada com sucesso', 'FINALIZADO', NOW() - INTERVAL '3 days'),

  -- Frete 7 (FINALIZADO)
  ('f0000000-0000-0000-0000-000000000007', 'FRETE_CRIADO', 'Frete criado', 'ABERTO', NOW() - INTERVAL '12 days'),
  ('f0000000-0000-0000-0000-000000000007', 'STATUS_ALTERADO', 'Entrega realizada', 'FINALIZADO', NOW() - INTERVAL '8 days'),

  -- Frete 8 (CANCELADO)
  ('f0000000-0000-0000-0000-000000000008', 'FRETE_CRIADO', 'Frete criado', 'ABERTO', NOW() - INTERVAL '8 days'),
  ('f0000000-0000-0000-0000-000000000008', 'FRETE_CANCELADO', 'Cancelado: cliente solicitou cancelamento', 'CANCELADO', NOW() - INTERVAL '7 days');

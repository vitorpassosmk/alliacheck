-- users (perfil estendido do auth.users do Supabase)
CREATE TABLE users (
  id        uuid REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  nome      text NOT NULL,
  papel     text NOT NULL CHECK (papel IN ('ADMIN','SUPERVISOR','CONFERENTE')),
  telefone  text,
  ativo     bool DEFAULT true,
  criado_em timestamptz DEFAULT now()
);

-- clientes (empresas que contratam o frete)
CREATE TABLE clientes (
  id               uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  razao_social     text NOT NULL,
  cnpj             text,
  cidade           text,
  uf               char(2),
  contato_nome     text,
  contato_telefone text,
  ativo            bool DEFAULT true
);

-- motoristas
CREATE TABLE motoristas (
  id            uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  nome          text NOT NULL,
  cpf           text NOT NULL,
  cnh           text NOT NULL,
  categoria_cnh text,
  validade_cnh  date NOT NULL,
  rntrc         text,
  telefone      text,
  status        text DEFAULT 'ATIVO'
    CHECK (status IN ('ATIVO','INATIVO','BLOQUEADO')),
  criado_em     timestamptz DEFAULT now()
);

-- veiculos
CREATE TABLE veiculos (
  id           uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  placa        text UNIQUE NOT NULL,
  tipo         text NOT NULL
    CHECK (tipo IN ('VAN','TOCO','TRUCK','BITRUCK','CARRETA','BITREM')),
  modelo       text,
  ano          int,
  proprietario text,
  rntrc        text,
  ativo        bool DEFAULT true
);

-- fretes (entidade central do sistema)
CREATE TABLE fretes (
  id                    uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  cliente_id            uuid REFERENCES clientes(id),
  motorista_id          uuid REFERENCES motoristas(id),
  veiculo_id            uuid REFERENCES veiculos(id),
  status                text DEFAULT 'ABERTO'
    CHECK (status IN (
      'ABERTO','PROGRAMADO','CARREGANDO','EM_VIAGEM','FINALIZADO','CANCELADO'
    )),
  cte_status            text DEFAULT 'PENDENTE'
    CHECK (cte_status IN (
      'PENDENTE','AGUARDANDO_NF','NF_RECEBIDA','CT_E_EMITIDO','CT_E_CANCELADO'
    )),
  origem_cidade         text NOT NULL,
  origem_uf             char(2) NOT NULL,
  destino_cidade        text NOT NULL,
  destino_uf            char(2) NOT NULL,
  tipo_veiculo          text,
  valor_frete           numeric(12,2) CHECK (valor_frete IS NULL OR valor_frete > 0),
  data_carregamento     date,
  data_entrega_prevista date,
  data_entrega_real     date,
  observacoes           text,
  criado_por            uuid REFERENCES auth.users(id),
  criado_em             timestamptz DEFAULT now(),
  atualizado_em         timestamptz DEFAULT now()
);

-- Atualizar atualizado_em automaticamente
CREATE EXTENSION IF NOT EXISTS moddatetime;
CREATE TRIGGER fretes_atualizado_em
  BEFORE UPDATE ON fretes
  FOR EACH ROW EXECUTE FUNCTION moddatetime(atualizado_em);

-- documentos
CREATE TABLE documentos (
  id            uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  frete_id      uuid REFERENCES fretes(id) ON DELETE CASCADE NOT NULL,
  tipo          text NOT NULL
    CHECK (tipo IN ('NFE','CTE','CNH','CRLV','RNTRC','OUTROS')),
  nome_arquivo  text NOT NULL,
  url           text NOT NULL,
  chave_acesso  char(44),
  valor         numeric(12,2),
  enviado_por   uuid REFERENCES auth.users(id),
  criado_em     timestamptz DEFAULT now()
);

-- eventos (log imutável de status — NUNCA alterar registros)
CREATE TABLE eventos (
  id              uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  frete_id        uuid REFERENCES fretes(id) ON DELETE CASCADE NOT NULL,
  tipo            text NOT NULL,
  descricao       text,
  status_anterior text,
  status_novo     text,
  usuario_id      uuid REFERENCES auth.users(id),
  ip_address      inet,
  user_agent      text,
  criado_em       timestamptz DEFAULT now()
);

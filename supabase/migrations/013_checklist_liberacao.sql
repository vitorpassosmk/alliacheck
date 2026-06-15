-- Itens configuráveis do checklist de liberação operacional
CREATE TABLE checklist_itens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  descricao TEXT NOT NULL,
  ordem INT NOT NULL DEFAULT 0,
  ativo BOOLEAN NOT NULL DEFAULT true,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Itens padrão (editáveis pelo gestor futuramente via painel)
INSERT INTO checklist_itens (descricao, ordem) VALUES
  ('N° GR (seguro de carga) verificado', 1),
  ('CT-e em mãos do motorista', 2),
  ('N° Contrato conferido', 3),
  ('CIOT registrado corretamente', 4),
  ('Documentação do motorista (CNH válida)', 5),
  ('Dados bancários do proprietário conferidos', 6);

-- Respostas por frete — quem marcou e quando
CREATE TABLE checklist_respostas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  frete_id UUID NOT NULL REFERENCES fretes(id),
  item_id UUID NOT NULL REFERENCES checklist_itens(id),
  marcado_em TIMESTAMPTZ NOT NULL DEFAULT now(),
  marcado_por UUID NOT NULL,
  UNIQUE(frete_id, item_id)
);

-- Sinalização desnormalizada: todos os itens estão marcados (evita join a cada consulta)
ALTER TABLE fretes
  ADD COLUMN IF NOT EXISTS checklist_liberacao_ok BOOLEAN NOT NULL DEFAULT false;

-- RLS
ALTER TABLE checklist_itens ENABLE ROW LEVEL SECURITY;
ALTER TABLE checklist_respostas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "authenticated_select_checklist_itens"
  ON checklist_itens FOR SELECT TO authenticated USING (true);

CREATE POLICY "authenticated_select_checklist_respostas"
  ON checklist_respostas FOR SELECT TO authenticated USING (true);

CREATE POLICY "authenticated_insert_checklist_respostas"
  ON checklist_respostas FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = marcado_por);

CREATE POLICY "authenticated_delete_checklist_respostas"
  ON checklist_respostas FOR DELETE TO authenticated USING (true);

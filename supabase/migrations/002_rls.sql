-- Ativar RLS em todas as tabelas
ALTER TABLE users       ENABLE ROW LEVEL SECURITY;
ALTER TABLE clientes    ENABLE ROW LEVEL SECURITY;
ALTER TABLE motoristas  ENABLE ROW LEVEL SECURITY;
ALTER TABLE veiculos    ENABLE ROW LEVEL SECURITY;
ALTER TABLE fretes      ENABLE ROW LEVEL SECURITY;
ALTER TABLE documentos  ENABLE ROW LEVEL SECURITY;
ALTER TABLE eventos     ENABLE ROW LEVEL SECURITY;

-- SELECT: qualquer usuário autenticado (single-tenant — mesma empresa)
CREATE POLICY "select_authenticated" ON clientes   FOR SELECT TO authenticated USING (true);
CREATE POLICY "select_authenticated" ON motoristas FOR SELECT TO authenticated USING (true);
CREATE POLICY "select_authenticated" ON veiculos   FOR SELECT TO authenticated USING (true);
CREATE POLICY "select_authenticated" ON fretes     FOR SELECT TO authenticated USING (true);
CREATE POLICY "select_authenticated" ON documentos FOR SELECT TO authenticated USING (true);
CREATE POLICY "select_authenticated" ON eventos    FOR SELECT TO authenticated USING (true);
CREATE POLICY "select_own_profile"   ON users      FOR SELECT TO authenticated
  USING (id = auth.uid());

-- INSERT: todos autenticados (validação de papel nas API Routes)
CREATE POLICY "insert_authenticated" ON clientes   FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "insert_authenticated" ON motoristas FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "insert_authenticated" ON veiculos   FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "insert_authenticated" ON fretes     FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "insert_authenticated" ON documentos FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "insert_authenticated" ON eventos    FOR INSERT TO authenticated WITH CHECK (true);

-- UPDATE: todos autenticados
CREATE POLICY "update_authenticated" ON clientes   FOR UPDATE TO authenticated USING (true);
CREATE POLICY "update_authenticated" ON motoristas FOR UPDATE TO authenticated USING (true);
CREATE POLICY "update_authenticated" ON veiculos   FOR UPDATE TO authenticated USING (true);
CREATE POLICY "update_authenticated" ON fretes     FOR UPDATE TO authenticated USING (true);
CREATE POLICY "update_authenticated" ON documentos FOR UPDATE TO authenticated USING (true);

-- eventos: DENY UPDATE e DENY DELETE (log imutável)
-- sem policies de UPDATE/DELETE = bloqueado por padrão com RLS ativo

-- Storage bucket para documentos
INSERT INTO storage.buckets (id, name, public) VALUES ('documentos', 'documentos', false);
CREATE POLICY "storage_authenticated"
  ON storage.objects FOR ALL TO authenticated
  USING (bucket_id = 'documentos');

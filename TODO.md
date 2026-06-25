# ALLiA Check — TODO

Última atualização: 2026-06-25 (sessão 20 — campo Observações na programação ABERTO→PROGRAMADO; ajustes BlocosBancarios para FROTA; migration 015 RLS users; deploy produção commit 15a26e9)

---

## Implementado

### Core / Infraestrutura
- [x] Setup Next.js 14 + TypeScript Strict + Tailwind + Shadcn UI
- [x] Integração Supabase (auth, RLS, server client)
- [x] Multi-tenant com design tokens
- [x] Controle de papéis: ADMIN, SUPERVISOR, CONFERENTE
- [x] Auditoria via tabela `eventos` (imutável, sem UPDATE/DELETE)
- [x] FK `eventos.usuario_id → public.users.id` para JOIN via PostgREST (migration 011)

### Máquina de Estados de Fretes
- [x] ABERTO → PROGRAMADO (exige motorista, veículo, data carregamento, data prevista entrega)
- [x] PROGRAMADO → CARREGANDO
- [x] CARREGANDO → CTE_EMITIDO (exige chave CT-e 44 dígitos com módulo 11)
- [x] CTE_EMITIDO → AGUARDANDO_LIBERACAO
- [x] AGUARDANDO_LIBERACAO → EM_VIAGEM (via checklist + adiantamento)
- [x] EM_VIAGEM → CONCLUIDA (exige data de descarga)
- [x] Cancelamento por ADMIN (exceto FINALIZADO e EM_VIAGEM)

### Checklist de Liberação Operacional
- [x] Tabela `checklist_itens` com 6 itens configuráveis (migration 013)
- [x] Tabela `checklist_respostas` por frete com UPSERT idempotente
- [x] Flag desnormalizada `checklist_liberacao_ok` em fretes
- [x] API `/api/fretes/[id]/checklist` (GET + POST com toggle + recomputa flag)
- [x] LiberacaoPanel com checklist server-driven no FreteDetailModal
- [x] Gate no adiantamento: botão desabilitado + validação 422 na API se checklist pendente

### Pagamentos
- [x] Página de Pagamentos com 3 seções: adiantamentos, pagamentos finais, histórico
- [x] Confirmação de adiantamento avança para EM_VIAGEM (ADMIN/SUPERVISOR)
- [x] Confirmação de pagamento final avança para CONCLUIDA
- [x] Busca por número do frete e número de contrato
- [x] Modal de dados bancários ao clicar nos cards

### Kanban
- [x] Board com colunas por status
- [x] CPF do motorista visível nos cards
- [x] Data prevista de entrega nos cards EM_VIAGEM e CONCLUIDA
- [x] Data real de descarga nos cards CONCLUIDA

### Veículos
- [x] CRUD completo
- [x] Campo TAG (migration 012)
- [x] Campo RNTRC visível e editável no formulário
- [x] Exibição de RNTRC e TAG na listagem
- [x] TAG exibida no modal de detalhes do frete (FreteDetailModal)

### Usuários (sessão 2026-06-18)
- [x] ADMIN pode excluir usuários com confirmação de senha
- [x] Exclusão remove de `public.users` E `auth.users` (email reutilizável sem erro de duplicata)
- [x] ADMIN não pode excluir a própria conta
- [x] Validação de CPF com módulo 11 (`lib/validations/cpf.ts`) — aplicada em motoristas e veículos
- [x] FreteCorrecaoModal — formulário unificado de correção de fretes com confirmação de senha
- [x] Deploy preview: `https://madia-dispatch-6q5ua8n95-vitor-passos-projects.vercel.app`

### Segurança e Qualidade (sessão 2026-06-15)
- [x] SUPERVISOR não pode criar usuários ADMIN (escalada de privilégio bloqueada)
- [x] novoStatus validado via Zod enum antes de uso na máquina de estados
- [x] PATCH /api/motoristas/[id] exige papel ADMIN ou SUPERVISOR
- [x] PATCH /api/veiculos/[id] exige papel ADMIN ou SUPERVISOR
- [x] Race condition em adiantamento: UPDATE filtrado por status + adiantamento_pago_em null
- [x] Race condition em pagamento: UPDATE filtrado por status + pago_em null
- [x] Erros de upsert/delete no checklist retornam 500 (não falham silenciosamente)
- [x] Erros de inserção de eventos de auditoria logados via console.error
- [x] IP de auditoria extrai apenas o primeiro endereço do x-forwarded-for (helper extractIp)

### Fretes
- [x] Tabela com colunas: Nº, Rota, Status, Motorista, Veículo, Carregamento, Descarga, Valor
- [x] Modal de detalhes com timeline de eventos
- [x] Soft delete (`excluido_em`)
- [x] Custo do agregado sem duplicação: somente-leitura na programação se preenchido na criação; obrigatório caso contrário (migration 014)
- [x] Placa do cavalo (trator) editável por frete sem alterar cadastro do veículo (`placa_cavalo`, migration 014)
- [x] Flag `motorista_e_funcionario_agregado` por frete — exibe dados bancários de proprietário E motorista quando ativo (migration 014)

---

## Pendente / Backlog

### Operacional
- [ ] Página de relatórios / exportação CSV
- [ ] Notificações (push ou email) para mudanças de status
- [ ] Gestão de checklist_itens (CRUD via interface de admin)

### Técnico
- [ ] Testes automatizados (unitários e integração)
- [ ] Variáveis de ambiente documentadas (.env.example)
- [ ] Rate limiting nas APIs
- [ ] Número de frete via sequence PostgreSQL (evitar race condition em criação simultânea)
- [ ] Dados financeiros (CPF, PIX, banco) filtrados por papel no GET /api/fretes (LGPD)
- [ ] Rollback de auth.createUser se insert em public.users falhar (usuário órfão)
- [ ] toggleItem no checklist: tratar erro de rede e bloquear clique duplo no frontend
- [ ] GET /api/fretes no dashboard: verificar res.ok antes de parsear JSON
- [x] CLAUDE.md atualizado: cancelamento por SUPERVISOR alinhado com o código (decisão deliberada mantida)

---

## Decisões Técnicas Registradas

- **Checklist desnormalizado:** `checklist_liberacao_ok` boolean em fretes evita JOIN em toda carga da página Pagamentos. Atualizado atomicamente pela API de checklist.
- **Adiantamento = gate de EM_VIAGEM:** a transição para EM_VIAGEM só ocorre via Pagamentos (confirmar adiantamento), nunca via botão no modal.
- **FK dupla em eventos.usuario_id:** mantida `auth.users` (original) + adicionada `public.users` para permitir JOIN aninhado via PostgREST.
- **Sem Prisma / ORM:** todas as queries direto no Supabase client para manter controle total sobre RLS.
- **Custo do agregado — hierarquia criação > programação:** se preenchido na criação, o campo fica somente-leitura na programação (protegido por senha via fluxo de edição). Se não preenchido na criação, é obrigatório na transição ABERTO→PROGRAMADO — tanto no frontend quanto no backend.
- **3 casos para dados bancários (ANTT):** Case A = motorista IS proprietário (CPF match) → banco único. Case B = funcionário agregado (flag explícita) → mostra banco proprietário + banco motorista. Case C = demais → banco do proprietário apenas.
- **Placas por viagem:** `placa_cavalo` e `placa_carreta` em fretes são específicos da viagem e nunca alteram o cadastro em `veiculos`.
- **Race conditions em pagamentos:** UPDATE de adiantamento e pagamento final incluem filtros de status e null-check na própria cláusula `.update()` para garantir idempotência sem transação explícita.
- **extractIp:** helper centralizado em `lib/api-helpers.ts` extrai só o primeiro IP do x-forwarded-for; evita gravar a cadeia de proxies Vercel/Cloudflare inteira nos eventos de auditoria.
- **Cancelamento por SUPERVISOR:** código permite SUPERVISOR cancelar fretes (decisão deliberada). CLAUDE.md atualizado para refletir o código.
- **Exclusão de usuário — sem evento de auditoria:** `eventos.frete_id` é NOT NULL, impossibilitando registro de ações em nível de usuário. Decisão: prosseguir sem log de auditoria para esta ação.
- **Ordem de exclusão de usuário:** `public.users` primeiro (trigger ON DELETE SET NULL em `eventos.usuario_id`) → depois `auth.users`. Inversão causaria violação de FK.

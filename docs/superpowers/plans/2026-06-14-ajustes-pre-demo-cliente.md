# Ajustes Pré-Demo Cliente — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Corrigir scroll do kanban, habilitar deleção por SUPERVISOR, adicionar checklist de conferência em AGUARDANDO_LIBERACAO com lógica de proprietário, e fazer deploy de produção.

**Architecture:** Todas as mudanças são no frontend (KanbanColumn, FreteDetailModal) e uma na API (rota DELETE de frete). O estado `dadosBancariosConferidos` vive em `FreteDetailModal` e é passado por props para `TransitionForm` e `LiberacaoPanel`.

**Tech Stack:** Next.js 16, TypeScript Strict, Tailwind, Shadcn UI, Supabase, Vercel CLI

---

## Contexto para o agente

- Projeto em: `madia-dispatch/` dentro do diretório de trabalho
- `src/components/kanban/KanbanColumn.tsx` — coluna do kanban (problema de scroll)
- `src/components/fretes/FreteDetailModal.tsx` — modal de detalhes do frete (checklist + permissão)
- `src/app/api/fretes/[id]/route.ts` — rota DELETE (permissão SUPERVISOR)
- Fretes passam por: ABERTO → PROGRAMADO → CARREGANDO → CTE_EMITIDO → AGUARDANDO_LIBERACAO → EM_VIAGEM → CONCLUIDA
- Em AGUARDANDO_LIBERACAO, todos os dados (CIOT, contrato, GR, CT-e) já estão salvos no banco. O único passo manual é confirmar os dados bancários.
- `frete.motoristas.cpf` e `frete.veiculos.cpf_proprietario` permitem saber se o motorista é o dono do caminhão.

---

## Task 1: Habilitar scroll vertical nas colunas do kanban

**Files:**
- Modify: `src/components/kanban/KanbanColumn.tsx:31`

- [ ] **Step 1: Abrir e ler o arquivo**

  Ler `src/components/kanban/KanbanColumn.tsx` para confirmar a linha exata.

- [ ] **Step 2: Alterar overflow-y-hidden para overflow-y-auto**

  Linha 31 — alterar a classe da div que contém os cards:
  ```tsx
  // ANTES:
  <div className="flex flex-col gap-1.5 flex-1 min-h-0 overflow-y-hidden pt-1">
  
  // DEPOIS:
  <div className="flex flex-col gap-1.5 flex-1 min-h-0 overflow-y-auto pt-1">
  ```

- [ ] **Step 3: Confirmar que o KanbanBoard pai permite o scroll fluir**

  Em `KanbanBoard.tsx`, a div externa tem `h-full` e `overflow-x-auto`. As colunas têm `h-full`. O scroll vertical nas colunas funcionará porque cada coluna tem `flex-1 min-h-0` e agora `overflow-y-auto`. Sem mudanças adicionais necessárias.

---

## Task 2: Estender permissão de deleção de frete para SUPERVISOR

**Files:**
- Modify: `src/app/api/fretes/[id]/route.ts:18`
- Modify: `src/components/fretes/FreteDetailModal.tsx:244`

- [ ] **Step 1: Atualizar a rota DELETE da API**

  Em `src/app/api/fretes/[id]/route.ts`, na função `DELETE`, alterar a verificação de papel:
  ```typescript
  // ANTES (linha 18):
  if (perfil?.papel !== 'ADMIN') {
    return Response.json({ error: 'Apenas ADMINs podem excluir fretes' }, { status: 403 })
  }
  
  // DEPOIS:
  if (!['ADMIN', 'SUPERVISOR'].includes(perfil?.papel ?? '')) {
    return Response.json({ error: 'Apenas ADMIN e SUPERVISOR podem excluir fretes' }, { status: 403 })
  }
  ```

  Também atualizar a mensagem no evento de auditoria para incluir o papel:
  ```typescript
  // ANTES (linha 42):
  descricao: `Frete ${frete.numero_frete} excluído por ADMIN`,
  
  // DEPOIS:
  descricao: `Frete ${frete.numero_frete} excluído por ${perfil.papel}`,
  ```

- [ ] **Step 2: Atualizar podeExcluir no FreteDetailModal**

  Em `src/components/fretes/FreteDetailModal.tsx`, alterar a condição `podeExcluir` (linha ~244):
  ```tsx
  // ANTES:
  const podeExcluir =
    papel === 'ADMIN' &&
    frete !== undefined &&
    !['EM_VIAGEM', 'CONCLUIDA'].includes(frete?.status ?? '')
  
  // DEPOIS:
  const podeExcluir =
    ['ADMIN', 'SUPERVISOR'].includes(papel ?? '') &&
    frete !== undefined &&
    !['EM_VIAGEM', 'CONCLUIDA'].includes(frete?.status ?? '')
  ```

---

## Task 3: Adicionar checklist de conferência em AGUARDANDO_LIBERACAO

Esta é a maior alteração. Envolve:
1. Adicionar estado `dadosBancariosConferidos` no modal pai
2. Passar esse estado para `TransitionForm` (bloquear o botão de liberar)
3. Redesenhar `LiberacaoPanel` com checklist + checkbox manual + lógica de proprietário

**Files:**
- Modify: `src/components/fretes/FreteDetailModal.tsx` (múltiplos pontos)

### 3a — Adicionar estado e passar para TransitionForm

- [ ] **Step 1: Adicionar estado dadosBancariosConferidos no FreteDetailModal**

  Logo após os estados existentes (cerca de linha 98), adicionar:
  ```tsx
  const [dadosBancariosConferidos, setDadosBancariosConferidos] = useState(false)
  ```

- [ ] **Step 2: Adicionar dadosBancariosConferidos à interface TransitionFormProps**

  Na interface `TransitionFormProps` (linha ~463), adicionar a prop:
  ```tsx
  dadosBancariosConferidos: boolean
  ```

- [ ] **Step 3: Passar a prop para o componente TransitionForm no JSX do modal**

  No bloco JSX onde `<TransitionForm .../>` é renderizado (linha ~277), adicionar:
  ```tsx
  dadosBancariosConferidos={dadosBancariosConferidos}
  ```

- [ ] **Step 4: Receber a prop em TransitionForm e usá-la no caso AGUARDANDO_LIBERACAO**

  Na assinatura de `TransitionForm` (linha ~488), adicionar `dadosBancariosConferidos` nos parâmetros:
  ```tsx
  function TransitionForm({
    // ... props existentes ...
    dadosBancariosConferidos,
  }: TransitionFormProps) {
  ```

  E no case `AGUARDANDO_LIBERACAO` (linha ~627), adicionar `disabled`:
  ```tsx
  if (status === 'AGUARDANDO_LIBERACAO') {
    return (
      <Button
        size="sm"
        className="bg-green-600 hover:bg-green-700 text-white"
        onClick={() => onAvancar('EM_VIAGEM')}
        disabled={isPending || !dadosBancariosConferidos}
      >
        {dadosBancariosConferidos
          ? 'Pagamento Realizado — Liberar para Viagem'
          : 'Confirme os dados bancários abaixo para liberar'}
      </Button>
    )
  }
  ```

### 3b — Redesenhar LiberacaoPanel com checklist e lógica de proprietário

- [ ] **Step 5: Atualizar a interface de props de LiberacaoPanel**

  Alterar a assinatura do componente `LiberacaoPanel` para aceitar o callback:
  ```tsx
  // ANTES:
  function LiberacaoPanel({ frete }: { frete: FreteCompleto }) {
  
  // DEPOIS:
  function LiberacaoPanel({
    frete,
    onConferido,
  }: {
    frete: FreteCompleto
    onConferido: (v: boolean) => void
  }) {
  ```

- [ ] **Step 6: Passar onConferido para LiberacaoPanel no JSX do modal**

  Localizar onde `<LiberacaoPanel frete={frete} />` é renderizado (linha ~335) e alterar para:
  ```tsx
  <LiberacaoPanel frete={frete} onConferido={setDadosBancariosConferidos} />
  ```

- [ ] **Step 7: Reescrever o corpo de LiberacaoPanel**

  Substituir o corpo completo da função `LiberacaoPanel` pelo código abaixo.
  
  A lógica central:
  - `motoristaPropriétario = m.cpf === v.cpf_proprietario` — motorista é o dono
  - Checklist mostra os 5 itens com ícone verde (✓) ou vermelho (✗)
  - Só o checkbox de dados bancários é manual
  - Se motoristaPropriétario: mostrar seção única "Motorista / Proprietário" com dados bancários do motorista
  - Se diferente: mostrar seção "Proprietário do Veículo" com dados bancários do veículo; mostrar dados do motorista separadamente com label "Motorista (não é o proprietário)"

  ```tsx
  function LiberacaoPanel({
    frete,
    onConferido,
  }: {
    frete: FreteCompleto
    onConferido: (v: boolean) => void
  }) {
    const [bancarioConferido, setBancarioConferido] = useState(false)
    const m = frete.motoristas
    const v = frete.veiculos
  
    const motoristaPropriétario = !!(m && v && m.cpf && v.cpf_proprietario && m.cpf === v.cpf_proprietario)
  
    function handleBancarioChange(checked: boolean) {
      setBancarioConferido(checked)
      onConferido(checked)
    }
  
    // Itens do checklist (os 4 primeiros são auto-detectados)
    const checklistItems = [
      { label: 'N° GR (seguro)', value: frete.numero_gr, key: 'gr' },
      { label: 'Chave CT-e', value: frete.chave_cte, key: 'cte' },
      { label: 'N° Contrato', value: frete.numero_contrato, key: 'contrato' },
      { label: 'CIOT', value: frete.numero_ciot, key: 'ciot' },
    ]
  
    return (
      <div className="p-4 border border-amber-200 bg-amber-50 rounded-lg space-y-4">
        <h3 className="text-sm font-semibold flex items-center gap-2 text-amber-800">
          <FileText className="h-4 w-4" />
          Conferência de Liberação
        </h3>
  
        {/* Checklist de documentos */}
        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Documentos</p>
          {checklistItems.map((item) => (
            <div key={item.key} className="flex items-start gap-2 text-sm">
              {item.value ? (
                <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5 shrink-0" />
              ) : (
                <XCircle className="h-4 w-4 text-red-500 mt-0.5 shrink-0" />
              )}
              <span className="font-medium min-w-[110px]">{item.label}:</span>
              <span className="font-mono text-xs text-muted-foreground break-all">
                {item.value ?? <span className="text-red-500 italic">não registrado</span>}
              </span>
            </div>
          ))}
  
          {/* Checkbox manual — dados bancários */}
          <div className="flex items-start gap-2 pt-1">
            <Checkbox
              id="bancario-conferido"
              checked={bancarioConferido}
              onCheckedChange={(v) => handleBancarioChange(v === true)}
              className="mt-0.5"
            />
            <label
              htmlFor="bancario-conferido"
              className="text-sm font-medium cursor-pointer select-none"
            >
              Dados bancários do proprietário conferidos
            </label>
          </div>
        </div>
  
        <div className="border-t border-amber-200 pt-3 grid grid-cols-2 gap-4 text-sm">
          {/* Motorista */}
          {m && (
            <div className="space-y-1">
              <p className="font-medium text-xs text-muted-foreground uppercase tracking-wide">Motorista</p>
              <p>{m.nome}</p>
              <p className="text-muted-foreground">CNH: {m.cnh}</p>
              {m.validade_cnh && (
                <p className="text-muted-foreground">
                  Validade: {new Date(m.validade_cnh + 'T00:00:00').toLocaleDateString('pt-BR')}
                </p>
              )}
            </div>
          )}
  
          {/* Adiantamento */}
          <div className="space-y-1">
            <p className="font-medium text-xs text-muted-foreground uppercase tracking-wide">Adiantamento</p>
            {frete.valor_adiantamento ? (
              <p className="text-lg font-semibold text-amber-900">
                R$ {frete.valor_adiantamento.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </p>
            ) : (
              <p className="text-muted-foreground italic">Não informado</p>
            )}
          </div>
  
          {/* Dados bancários para pagamento */}
          {motoristaPropriétario ? (
            /* Motorista é o proprietário — seção unificada */
            (m && (m.banco || m.agencia_conta || m.chave_pix)) ? (
              <div className="col-span-2 space-y-1 bg-green-50 border border-green-200 rounded-md p-3">
                <p className="font-medium text-xs text-green-800 uppercase tracking-wide flex items-center gap-1">
                  <CreditCard className="h-3 w-3" /> Dados para Pagamento — Motorista / Proprietário
                </p>
                {m.banco && <p className="text-muted-foreground">Banco: {m.banco}</p>}
                {m.agencia_conta && <p className="text-muted-foreground">Ag/Conta: {m.agencia_conta}</p>}
                {m.chave_pix && <p className="text-muted-foreground">PIX: {m.chave_pix}</p>}
              </div>
            ) : null
          ) : (
            <>
              {/* Proprietário do veículo — destinatário do pagamento */}
              {v && (v.banco_proprietario || v.agencia_conta_proprietario || v.chave_pix_proprietario) && (
                <div className="col-span-2 space-y-1 bg-green-50 border border-green-200 rounded-md p-3">
                  <p className="font-medium text-xs text-green-800 uppercase tracking-wide flex items-center gap-1">
                    <CreditCard className="h-3 w-3" /> Dados para Pagamento — Proprietário do Veículo
                    {v.proprietario && <span className="ml-1 normal-case font-normal">({v.proprietario})</span>}
                  </p>
                  {v.banco_proprietario && <p className="text-muted-foreground">Banco: {v.banco_proprietario}</p>}
                  {v.agencia_conta_proprietario && <p className="text-muted-foreground">Ag/Conta: {v.agencia_conta_proprietario}</p>}
                  {v.chave_pix_proprietario && <p className="text-muted-foreground">PIX: {v.chave_pix_proprietario}</p>}
                </div>
              )}
  
              {/* Dados bancários do motorista — apenas informativo */}
              {m && (m.banco || m.agencia_conta || m.chave_pix) && (
                <div className="col-span-2 space-y-1">
                  <p className="font-medium text-xs text-muted-foreground uppercase tracking-wide flex items-center gap-1">
                    <CreditCard className="h-3 w-3" /> Dados Bancários — Motorista
                    <span className="normal-case font-normal text-amber-600">(não é o proprietário)</span>
                  </p>
                  {m.banco && <p className="text-muted-foreground">Banco: {m.banco}</p>}
                  {m.agencia_conta && <p className="text-muted-foreground">Ag/Conta: {m.agencia_conta}</p>}
                  {m.chave_pix && <p className="text-muted-foreground">PIX: {m.chave_pix}</p>}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    )
  }
  ```

- [ ] **Step 8: Adicionar imports necessários**

  No topo de `FreteDetailModal.tsx`, adicionar os imports que ainda não existem:
  ```tsx
  import { CheckCircle2, XCircle } from 'lucide-react'
  import { Checkbox } from '@/components/ui/checkbox'
  ```
  
  Verificar que `CreditCard` e `FileText` já estão importados (estão na linha 16).
  Verificar que `Checkbox` já está no `components.json` (está — foi instalado na sessão anterior).

---

## Task 4: Verificar build sem erros de TypeScript

**Files:** nenhum arquivo novo

- [ ] **Step 1: Rodar o type check**

  ```bash
  cd madia-dispatch && npx tsc --noEmit 2>&1
  ```
  
  Corrigir qualquer erro de tipo antes de prosseguir. Erros comuns esperados:
  - `dadosBancariosConferidos` não passado como prop → verificar que a interface foi atualizada
  - `onConferido` não passado para `LiberacaoPanel` → verificar o JSX no modal
  - Import de `CheckCircle2` ou `XCircle` não encontrado → confirmar que `lucide-react` está instalado (está)

---

## Task 5: Commit e deploy em produção

**Files:** nenhum novo

- [ ] **Step 1: Verificar se há alterações não commitadas antes das nossas mudanças**

  ```bash
  cd madia-dispatch && git status
  ```

- [ ] **Step 2: Commitar todas as mudanças da sessão 10 + ajustes atuais**

  Se houver mudanças de sessões anteriores não commitadas, incluir tudo:
  ```bash
  cd madia-dispatch
  git add src/components/kanban/KanbanColumn.tsx
  git add src/components/fretes/FreteDetailModal.tsx
  git add src/app/api/fretes/[id]/route.ts
  git commit -m "feat: checklist conferencia liberacao, delete supervisor, scroll kanban"
  ```

- [ ] **Step 3: Deploy em produção no Vercel**

  ```bash
  cd madia-dispatch && npx vercel --prod 2>&1
  ```
  
  Aguardar conclusão e copiar a URL de produção para o cliente.

---

## Self-Review — Cobertura dos requisitos

| Requisito do usuário | Tarefa | Status |
|---|---|---|
| URL de produção desatualizada | Task 5 (deploy) | ✓ coberto |
| Checklist em AGUARDANDO_LIBERACAO (CIOT, GR, CT-e, contrato, dados bancários) | Task 3 | ✓ coberto |
| Dados de pagamento do proprietário, não do motorista | Task 3 step 7 (lógica motoristaPropriétário) | ✓ coberto |
| Supervisor e admin podem excluir fretes | Task 2 | ✓ coberto |
| Scroll vertical nas colunas do kanban | Task 1 | ✓ coberto |

### Verificações adicionais

- **Checkbox `Checkbox`**: instalado em sessões anteriores (visto em `src/components/ui/checkbox`). Confirmar antes de executar.
- **Estado `dadosBancariosConferidos`**: reset automático ao fechar o modal — componente desmonta quando `freteDetalhe` é null, não precisa de reset explícito.
- **Migração pendente**: as migrations 008 e 009 ainda precisam ser aplicadas no Supabase para que os campos `excluido_em`, `pago_em` etc. existam. Se o banco não tiver esses campos, o DELETE vai falhar. **Atenção:** Aplicar as migrations no Supabase SQL Editor antes de testar em produção.

# Retroceder Etapa de Frete com Senha — Plano de Implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Permitir que ADMIN e SUPERVISOR revertam o status de um frete para a etapa imediatamente anterior, mediante confirmação de senha, sem alterar nenhum fluxo de avanço existente.

**Architecture:** Endpoint dedicado `POST /api/fretes/[id]/reverter` completamente separado da rota de avanço. Mapa de retrocesso adicionado à state machine como export independente. Botão "Retroceder etapa" no `FreteDetailModal` com `PasswordConfirmDialog` existente — verificação de senha 100% client-side (mesmo padrão de cancelamento e exclusão).

**Tech Stack:** Next.js 16, TypeScript strict, Supabase (server client), Zod implícito via guards manuais, Sonner (toast), TanStack Query (invalidação de cache), Lucide React (ícone ChevronLeft).

## Global Constraints

- TypeScript strict — sem `any`
- Sem `console.log` — apenas `console.error` para erros de DB
- Senha verificada client-side via `supabase.auth.signInWithPassword` — não trafega para o servidor
- Evento imutável em `eventos` a cada retrocesso — falha de insert deve ser logada mas não deve bloquear a resposta
- Filtro `is('excluido_em', null)` obrigatório em toda query na tabela `fretes`
- Permissão: apenas ADMIN e SUPERVISOR (403 para CONFERENTE)
- Campos preservados — nenhum campo é nulificado ao retroceder

---

## Mapa de arquivos

| Arquivo | Ação |
|---|---|
| `src/lib/state-machine.ts` | Modificar — adicionar `TRANSICOES_REVERTER` |
| `src/app/api/fretes/[id]/reverter/route.ts` | Criar |
| `src/components/fretes/FreteDetailModal.tsx` | Modificar — botão + dialog + handler |

---

### Task 1: Adicionar TRANSICOES_REVERTER à state machine

**Files:**
- Modify: `src/lib/state-machine.ts`

**Interfaces:**
- Produces: `TRANSICOES_REVERTER` — `Partial<Record<StatusViagem, StatusViagem>>` exportado; usado pela API (Task 2) e pelo componente (Task 3)

- [ ] **Step 1: Abrir o arquivo e localizar o ponto de inserção**

  O arquivo atual termina com `COLUNAS_KANBAN`. Adicionar o novo export logo após `validarTransicao` (linha 24), antes de `COLUNAS_KANBAN`.

- [ ] **Step 2: Adicionar o export TRANSICOES_REVERTER**

  Em `src/lib/state-machine.ts`, após a função `validarTransicao`, inserir:

  ```ts
  export const TRANSICOES_REVERTER: Partial<Record<StatusViagem, StatusViagem>> = {
    PROGRAMADO:           'ABERTO',
    CARREGANDO:           'PROGRAMADO',
    CTE_EMITIDO:          'CARREGANDO',
    AGUARDANDO_LIBERACAO: 'CTE_EMITIDO',
    EM_VIAGEM:            'AGUARDANDO_LIBERACAO',
    CONCLUIDA:            'EM_VIAGEM',
  }
  ```

  ABERTO e CANCELADO não têm entrada — tentar revertê-los retornará undefined.

- [ ] **Step 3: Verificar que o arquivo compila sem erros**

  ```bash
  npx tsc --noEmit
  ```

  Resultado esperado: sem erros em `state-machine.ts`.

- [ ] **Step 4: Commit**

  ```bash
  git add src/lib/state-machine.ts
  git commit -m "feat: adicionar TRANSICOES_REVERTER à state machine"
  ```

---

### Task 2: Criar endpoint POST /api/fretes/[id]/reverter

**Files:**
- Create: `src/app/api/fretes/[id]/reverter/route.ts`

**Interfaces:**
- Consumes: `TRANSICOES_REVERTER` de `@/lib/state-machine`; `invalidUUID`, `extractIp` de `@/lib/api-helpers`; `createClient` de `@/lib/supabase/server`
- Produces: `POST /api/fretes/:id/reverter` → `{ ok: true, statusAnterior: string }` (200) ou erro `{ error: string }` (401/403/404/422/500)

- [ ] **Step 1: Criar o arquivo da rota**

  Criar `src/app/api/fretes/[id]/reverter/route.ts` com o seguinte conteúdo:

  ```ts
  import { createClient } from '@/lib/supabase/server'
  import { TRANSICOES_REVERTER } from '@/lib/state-machine'
  import { invalidUUID, extractIp } from '@/lib/api-helpers'
  import type { StatusViagem } from '@/lib/state-machine'

  export async function POST(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
  ) {
    const { id } = await params
    const uuidErr = invalidUUID(id)
    if (uuidErr) return uuidErr

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return Response.json({ error: 'Não autorizado' }, { status: 401 })

    const { data: perfil } = await supabase
      .from('users').select('papel').eq('id', user.id).single()

    if (!perfil || !['ADMIN', 'SUPERVISOR'].includes(perfil.papel)) {
      return Response.json(
        { error: 'Apenas ADMIN e SUPERVISOR podem retroceder status' },
        { status: 403 }
      )
    }

    const { data: frete } = await supabase
      .from('fretes')
      .select('status')
      .eq('id', id)
      .is('excluido_em', null)
      .single()

    if (!frete) return Response.json({ error: 'Frete não encontrado' }, { status: 404 })

    const statusAnterior = TRANSICOES_REVERTER[frete.status as StatusViagem]
    if (!statusAnterior) {
      return Response.json(
        { error: `Status ${frete.status} não pode ser retrocedido` },
        { status: 422 }
      )
    }

    const { error: updateError } = await supabase
      .from('fretes')
      .update({ status: statusAnterior })
      .eq('id', id)
      .is('excluido_em', null)

    if (updateError) {
      console.error('[fretes/reverter] update error', updateError)
      return Response.json({ error: 'Erro interno' }, { status: 500 })
    }

    const { error: eventoError } = await supabase.from('eventos').insert({
      frete_id: id,
      tipo: 'STATUS_REVERT',
      descricao: `Etapa retrocedida: ${frete.status} → ${statusAnterior}`,
      status_anterior: frete.status,
      status_novo: statusAnterior,
      usuario_id: user.id,
      ip_address: extractIp(request),
      user_agent: request.headers.get('user-agent'),
    })

    if (eventoError) {
      console.error('[fretes/reverter] evento error', eventoError)
    }

    return Response.json({ ok: true, statusAnterior })
  }
  ```

- [ ] **Step 2: Verificar que o arquivo compila sem erros**

  ```bash
  npx tsc --noEmit
  ```

  Resultado esperado: sem erros no novo arquivo.

- [ ] **Step 3: Testar a rota manualmente via curl (servidor rodando)**

  ```bash
  # Deve retornar 401 sem sessão (substituir ID por um UUID válido)
  curl -X POST http://localhost:3000/api/fretes/00000000-0000-0000-0000-000000000000/reverter
  # Resultado esperado: {"error":"Não autorizado"}
  ```

- [ ] **Step 4: Commit**

  ```bash
  git add src/app/api/fretes/[id]/reverter/route.ts
  git commit -m "feat: criar endpoint POST /api/fretes/[id]/reverter"
  ```

---

### Task 3: Adicionar botão "Retroceder etapa" no FreteDetailModal

**Files:**
- Modify: `src/components/fretes/FreteDetailModal.tsx`

**Interfaces:**
- Consumes: `TRANSICOES_REVERTER` de `@/lib/state-machine`; `PasswordConfirmDialog` de `@/components/common/PasswordConfirmDialog`; `verificarSenha` (já existe no arquivo); `queryClient.invalidateQueries` (já existe)
- Produces: botão visível para ADMIN/SUPERVISOR quando status ≠ ABERTO e ≠ CANCELADO; executa POST /api/fretes/:id/reverter após verificação de senha; invalida queries `['frete', freteId]` e `['fretes']`

- [ ] **Step 1: Adicionar import de ChevronLeft e TRANSICOES_REVERTER**

  Localizar a linha de import dos ícones (atualmente linha 17):
  ```ts
  import { MapPin, User, Truck, Calendar, AlertTriangle, CreditCard, FileText, Trash2, Pencil, CheckCircle2, Tag } from 'lucide-react'
  ```

  Substituir por:
  ```ts
  import { MapPin, User, Truck, Calendar, AlertTriangle, CreditCard, FileText, Trash2, Pencil, CheckCircle2, Tag, ChevronLeft } from 'lucide-react'
  ```

  Localizar a linha de import da state machine (atualmente linha 14):
  ```ts
  import { TRANSICOES_VIAGEM } from '@/lib/state-machine'
  ```

  Substituir por:
  ```ts
  import { TRANSICOES_VIAGEM, TRANSICOES_REVERTER } from '@/lib/state-machine'
  ```

- [ ] **Step 2: Adicionar estados para o diálogo de retrocesso**

  Localizar o bloco de estados existentes (após `const [editAberto, setEditAberto] = useState(false)`, linha ~90). Adicionar imediatamente após:

  ```ts
  // Diálogo de senha — retroceder status
  const [reverterOpen, setReverterOpen] = useState(false)
  const [reverterLoading, setReverterLoading] = useState(false)
  ```

- [ ] **Step 3: Adicionar computed variables podeRetroceder e statusAnteriorCalculado**

  Localizar o bloco de computed vars existente (onde `podeCancelar`, `podeExcluir`, `podeEditar` são definidos, ~linha 255). Adicionar após essas definições:

  ```ts
  const podeRetroceder =
    ['ADMIN', 'SUPERVISOR'].includes(papel ?? '') &&
    frete !== undefined &&
    !['ABERTO', 'CANCELADO'].includes(frete.status)

  const statusAnteriorCalculado = frete
    ? TRANSICOES_REVERTER[frete.status as StatusViagem]
    : undefined
  ```

- [ ] **Step 4: Adicionar handler handleConfirmarReverter**

  Localizar a função `handleConfirmarEdit` (linha ~234). Adicionar imediatamente após o fechamento dessa função:

  ```ts
  async function handleConfirmarReverter(senha: string) {
    setReverterLoading(true)
    try {
      const ok = await verificarSenha(senha)
      if (!ok) { toast.error('Senha incorreta.'); return }
      const res = await fetch(`/api/fretes/${freteId}/reverter`, { method: 'POST' })
      if (!res.ok) {
        const json = await res.json().catch(() => ({}))
        toast.error(json.error ?? 'Erro ao retroceder status.')
        return
      }
      toast.success('Etapa retrocedida com sucesso.')
      setReverterOpen(false)
      queryClient.invalidateQueries({ queryKey: ['frete', freteId] })
      queryClient.invalidateQueries({ queryKey: ['fretes'] })
    } catch { toast.error('Erro ao retroceder status.') }
    finally { setReverterLoading(false) }
  }
  ```

- [ ] **Step 5: Adicionar botão Retroceder etapa no JSX**

  Localizar o bloco JSX de ações de status (linha ~318):
  ```tsx
  {/* Ações de status */}
  {frete.status !== 'CONCLUIDA' && frete.status !== 'CANCELADO' && (
    <div className="flex flex-col gap-3 p-4 bg-muted/40 rounded-lg border">
  ```

  Após o fechamento desse bloco (após o `)}` que fecha o `{frete.status !== 'CONCLUIDA' ...}`), adicionar:

  ```tsx
  {podeRetroceder && statusAnteriorCalculado && (
    <div className="flex justify-start">
      <Button
        size="sm"
        variant="outline"
        className="text-amber-600 border-amber-300 hover:bg-amber-50"
        onClick={() => setReverterOpen(true)}
      >
        <ChevronLeft className="h-3.5 w-3.5 mr-1" />
        Retroceder etapa
      </Button>
    </div>
  )}
  ```

- [ ] **Step 6: Adicionar PasswordConfirmDialog para retrocesso**

  No final do componente, após o `PasswordConfirmDialog` de edição (linha ~547-558), adicionar:

  ```tsx
  <PasswordConfirmDialog
    open={reverterOpen}
    onOpenChange={(v) => { if (!reverterLoading) setReverterOpen(v) }}
    onConfirm={handleConfirmarReverter}
    loading={reverterLoading}
    title="Retroceder etapa"
    description={
      statusAnteriorCalculado
        ? `Digite sua senha para retroceder de ${frete?.status} para ${statusAnteriorCalculado}.`
        : 'Digite sua senha para retroceder o status.'
    }
  />
  ```

- [ ] **Step 7: Verificar que o arquivo compila sem erros TypeScript**

  ```bash
  npx tsc --noEmit
  ```

  Resultado esperado: zero erros.

- [ ] **Step 8: Testar manualmente no browser**

  1. Iniciar o servidor: `npm run dev`
  2. Logar como ADMIN ou SUPERVISOR
  3. Abrir um frete em status CONCLUIDA → verificar que o botão "Retroceder etapa" aparece em âmbar
  4. Clicar no botão → dialog de senha abre com texto "retroceder de CONCLUIDA para EM_VIAGEM"
  5. Digitar senha correta → toast "Etapa retrocedida com sucesso" → modal atualiza para EM_VIAGEM
  6. Verificar timeline do frete → evento "Etapa retrocedida: CONCLUIDA → EM_VIAGEM" aparece
  7. Logar como CONFERENTE → verificar que o botão NÃO aparece
  8. Abrir frete em ABERTO → verificar que o botão NÃO aparece
  9. Abrir frete em CANCELADO → verificar que o botão NÃO aparece
  10. Digitar senha errada → toast "Senha incorreta", dialog permanece aberto

- [ ] **Step 9: Commit**

  ```bash
  git add src/components/fretes/FreteDetailModal.tsx
  git commit -m "feat: adicionar botão retroceder etapa com confirmação de senha no FreteDetailModal"
  ```

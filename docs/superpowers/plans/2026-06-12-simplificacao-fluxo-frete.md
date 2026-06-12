# Simplificação do Fluxo de Conferência de Fretes — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Substituir o pipeline dual (viagem_status + cte_status) por um fluxo linear de 6 estados na viagem principal, removendo checklist, upload de documentos e toda a lógica de NF-e; adicionando os estados AGUARDANDO_CTE e CTE_EMITIDO com registro da chave CT-e (44 dígitos).

**Architecture:** Refatoração limpa de dentro para fora — começar pelo banco e state machine (fundação), depois API, depois UI. Cada task produz código compilável e não quebra o anterior.

**Tech Stack:** Next.js 14, TypeScript Strict, Supabase (SQL migrations + client), TanStack Query, React Hook Form + Zod, Shadcn UI, Tailwind

---

## File Map

| Arquivo | Ação |
|---------|------|
| `supabase/migrations/006_simplify_flow.sql` | **Criar** — altera schema do banco |
| `src/lib/state-machine.ts` | **Modificar** — novo pipeline, remover cte |
| `src/lib/validations/chave-cte.ts` | **Criar** — re-exporta validador existente com nome correto |
| `src/types/database.types.ts` | **Modificar** — atualizar tipos manualmente para refletir schema |
| `src/app/api/fretes/route.ts` | **Modificar** — motorista/veiculo/data obrigatórios no POST |
| `src/app/api/fretes/[id]/route.ts` | **Modificar** — remover cte_status do select |
| `src/app/api/fretes/[id]/status/route.ts` | **Modificar** — novo pipeline, lógica chave_cte |
| `src/components/kanban/StatusBadge.tsx` | **Modificar** — novos estados, remover CTEStatusBadge |
| `src/components/kanban/FreteCard.tsx` | **Modificar** — card rico, chave_cte, badge CT-e ✓ |
| `src/components/kanban/KanbanColumn.tsx` | **Modificar** — bordas coloridas AGUARDANDO_CTE/CTE_EMITIDO |
| `src/components/kanban/KanbanBoard.tsx` | **Modificar** — COLUNAS_KANBAN atualizado via state-machine |
| `src/components/fretes/FreteFormModal.tsx` | **Modificar** — motorista/veiculo/data obrigatórios |
| `src/components/fretes/FreteDetailModal.tsx` | **Modificar** — remover tabs docs/checklist, input chave CT-e |
| `src/app/(dashboard)/dashboard/page.tsx` | **Modificar** — KPIs atualizados (6 estados) |
| `src/app/(dashboard)/fretes/page.tsx` | **Modificar** — remover coluna CT-e, atualizar STATUS_OPTIONS |
| `src/components/checklist/ConferenceChecklist.tsx` | **Deletar** |
| `src/lib/checklist-items.ts` | **Deletar** |
| `src/components/documentos/DocumentUpload.tsx` | **Deletar** |
| `src/components/documentos/DocumentList.tsx` | **Deletar** |
| `src/app/api/fretes/[id]/checklist/route.ts` | **Deletar** |
| `src/app/api/fretes/[id]/cte/route.ts` | **Deletar** |
| `src/app/api/documentos/route.ts` | **Deletar** |

---

## Task 1: Migration do banco de dados

**Files:**
- Create: `supabase/migrations/006_simplify_flow.sql`

- [ ] **Step 1: Criar migration**

```sql
-- supabase/migrations/006_simplify_flow.sql

-- 1. Remover coluna cte_status da tabela fretes
ALTER TABLE fretes DROP COLUMN IF EXISTS cte_status;

-- 2. Adicionar coluna chave_cte
ALTER TABLE fretes ADD COLUMN IF NOT EXISTS chave_cte char(44);

-- 3. Atualizar constraint de status para remover PROGRAMADO e adicionar novos estados
ALTER TABLE fretes DROP CONSTRAINT IF EXISTS fretes_status_check;
ALTER TABLE fretes ADD CONSTRAINT fretes_status_check
  CHECK (status IN (
    'ABERTO','CARREGANDO','AGUARDANDO_CTE','CTE_EMITIDO','EM_VIAGEM','FINALIZADO','CANCELADO'
  ));

-- 4. Atualizar registros existentes com status PROGRAMADO para ABERTO
UPDATE fretes SET status = 'ABERTO' WHERE status = 'PROGRAMADO';

-- 5. Drop tabela documentos (não é mais usada)
DROP TABLE IF EXISTS documentos CASCADE;
```

- [ ] **Step 2: Aplicar migration no Supabase**

Acesse o Supabase Dashboard → SQL Editor e execute o conteúdo do arquivo `supabase/migrations/006_simplify_flow.sql`.

Ou via Supabase CLI:
```bash
npx supabase db push
```

Verificação esperada: coluna `cte_status` removida, `chave_cte` adicionada, constraint atualizada, tabela `documentos` removida.

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/006_simplify_flow.sql
git commit -m "feat: migration simplificacao fluxo frete"
```

---

## Task 2: State machine e validador CT-e

**Files:**
- Modify: `src/lib/state-machine.ts`
- Create: `src/lib/validations/chave-cte.ts`

- [ ] **Step 1: Reescrever state-machine.ts**

Substituir todo o conteúdo de `src/lib/state-machine.ts` por:

```typescript
export type StatusViagem =
  | 'ABERTO'
  | 'CARREGANDO'
  | 'AGUARDANDO_CTE'
  | 'CTE_EMITIDO'
  | 'EM_VIAGEM'
  | 'FINALIZADO'
  | 'CANCELADO'

export const TRANSICOES_VIAGEM: Record<StatusViagem, StatusViagem[]> = {
  ABERTO:          ['CARREGANDO', 'CANCELADO'],
  CARREGANDO:      ['AGUARDANDO_CTE', 'CANCELADO'],
  AGUARDANDO_CTE:  ['CTE_EMITIDO', 'CANCELADO'],
  CTE_EMITIDO:     ['EM_VIAGEM', 'CANCELADO'],
  EM_VIAGEM:       ['FINALIZADO', 'CANCELADO'],
  FINALIZADO:      [],
  CANCELADO:       [],
}

export function validarTransicao(atual: StatusViagem, novo: StatusViagem): boolean {
  return (TRANSICOES_VIAGEM[atual] ?? []).includes(novo)
}

export const COLUNAS_KANBAN: StatusViagem[] = [
  'ABERTO',
  'CARREGANDO',
  'AGUARDANDO_CTE',
  'CTE_EMITIDO',
  'EM_VIAGEM',
  'FINALIZADO',
]

export const STATUS_LABEL: Record<StatusViagem, string> = {
  ABERTO:         'Aberto',
  CARREGANDO:     'Carregando',
  AGUARDANDO_CTE: 'Aguard. CT-e',
  CTE_EMITIDO:    'CT-e Emitido',
  EM_VIAGEM:      'Em Viagem',
  FINALIZADO:     'Finalizado',
  CANCELADO:      'Cancelado',
}
```

- [ ] **Step 2: Criar chave-cte.ts**

```typescript
// src/lib/validations/chave-cte.ts
export { validarChaveNFe as validarChaveCTe } from './chave-nfe'
```

- [ ] **Step 3: Verificar compilação**

```bash
cd "c:/Users/vl-pa/OneDrive/Documentos/ALLiA Check Madiã/madia-dispatch"
npx tsc --noEmit 2>&1 | head -30
```

Esperado: erros relacionados aos tipos obsoletos (cte_status, StatusCTE, PROGRAMADO) — serão resolvidos nas próximas tasks.

- [ ] **Step 4: Commit**

```bash
git add src/lib/state-machine.ts src/lib/validations/chave-cte.ts
git commit -m "feat: novo pipeline de estados e validador chave CTE"
```

---

## Task 3: Atualizar tipos TypeScript

**Files:**
- Modify: `src/types/database.types.ts`

O arquivo é gerado automaticamente pelo Supabase CLI. Como estamos em desenvolvimento sem CLI configurado localmente, atualizar manualmente as partes relevantes.

- [ ] **Step 1: Localizar e atualizar o tipo de fretes**

Abra `src/types/database.types.ts`. Encontre o tipo da tabela `fretes` (dentro de `Tables<'fretes'>`). Faça as seguintes alterações:

1. Remover a propriedade `cte_status` (e variantes `Insert`/`Update`)
2. Adicionar a propriedade `chave_cte` (e variantes):

```typescript
// Remover estas linhas onde aparecerem em fretes Row/Insert/Update:
cte_status: string
// ou
cte_status: Database["public"]["Enums"]["..."] | null

// Adicionar:
chave_cte: string | null
```

3. Atualizar o enum/check de `status` nos tipos de fretes. Encontre onde `status` é tipado como string literal union e adicione os novos valores:

```typescript
// Se status for tipado como string literal, substituir por:
status: 'ABERTO' | 'CARREGANDO' | 'AGUARDANDO_CTE' | 'CTE_EMITIDO' | 'EM_VIAGEM' | 'FINALIZADO' | 'CANCELADO'
```

4. Remover o tipo da tabela `documentos` inteiramente (todas as referências a `documentos` dentro de `Tables`).

- [ ] **Step 2: Verificar compilação**

```bash
npx tsc --noEmit 2>&1 | head -40
```

Esperado: erros diminuem (os que restarem serão de componentes que ainda referenciam `cte_status` — resolvidos nas próximas tasks).

- [ ] **Step 3: Commit**

```bash
git add src/types/database.types.ts
git commit -m "chore: atualizar tipos database apos migration"
```

---

## Task 4: Deletar arquivos obsoletos

**Files a deletar:**
- `src/components/checklist/ConferenceChecklist.tsx`
- `src/lib/checklist-items.ts`
- `src/components/documentos/DocumentUpload.tsx`
- `src/components/documentos/DocumentList.tsx`
- `src/app/api/fretes/[id]/checklist/route.ts`
- `src/app/api/fretes/[id]/cte/route.ts`
- `src/app/api/documentos/route.ts`

- [ ] **Step 1: Deletar arquivos**

```bash
cd "c:/Users/vl-pa/OneDrive/Documentos/ALLiA Check Madiã/madia-dispatch"
Remove-Item src/components/checklist/ConferenceChecklist.tsx
Remove-Item src/lib/checklist-items.ts
Remove-Item src/components/documentos/DocumentUpload.tsx
Remove-Item src/components/documentos/DocumentList.tsx
Remove-Item src/app/api/fretes/[id]/checklist/route.ts
Remove-Item src/app/api/fretes/[id]/cte/route.ts
Remove-Item src/app/api/documentos/route.ts
```

Se os diretórios ficarem vazios, pode removê-los também:
```bash
# Verificar se ficaram vazios:
ls src/components/checklist/
ls src/components/documentos/
ls src/app/api/fretes/[id]/
```

- [ ] **Step 2: Commit**

```bash
git add -u
git commit -m "chore: remover checklist, documentos e rotas obsoletas"
```

---

## Task 5: Atualizar API de fretes (POST e status)

**Files:**
- Modify: `src/app/api/fretes/route.ts`
- Modify: `src/app/api/fretes/[id]/status/route.ts`

- [ ] **Step 1: Atualizar FreteCreateSchema em route.ts**

Em `src/app/api/fretes/route.ts`, substituir o `FreteCreateSchema` por:

```typescript
const FreteCreateSchema = z.object({
  cliente_id: z.string().uuid().nullable().optional(),
  origem_cidade: z.string().min(1),
  origem_uf: z.string().length(2),
  destino_cidade: z.string().min(1),
  destino_uf: z.string().length(2),
  tipo_veiculo: z.string().optional().nullable(),
  valor_frete: z.number().positive().optional().nullable(),
  data_carregamento: z.string().min(1, 'Data de carregamento obrigatória'),
  data_entrega_prevista: z.string().optional().nullable(),
  motorista_id: z.string().uuid('Motorista obrigatório'),
  veiculo_id: z.string().uuid('Veículo obrigatório'),
  observacoes: z.string().optional().nullable(),
})
```

- [ ] **Step 2: Reescrever status/route.ts**

Substituir todo o conteúdo de `src/app/api/fretes/[id]/status/route.ts` por:

```typescript
import { createClient } from '@/lib/supabase/server'
import { validarTransicao } from '@/lib/state-machine'
import { validarChaveCTe } from '@/lib/validations/chave-cte'
import { invalidUUID } from '@/lib/api-helpers'
import type { StatusViagem } from '@/lib/state-machine'

export async function PATCH(
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
    return Response.json({ error: 'Permissão insuficiente' }, { status: 403 })
  }

  const body: { status: StatusViagem; motivo?: string; chave_cte?: string } =
    await request.json()

  const { status: novoStatus, motivo, chave_cte } = body
  const motivoSanitizado = motivo?.trim().slice(0, 500)

  const { data: frete } = await supabase
    .from('fretes')
    .select('status')
    .eq('id', id)
    .single()

  if (!frete) return Response.json({ error: 'Frete não encontrado' }, { status: 404 })

  if (!validarTransicao(frete.status as StatusViagem, novoStatus)) {
    return Response.json(
      { error: `Transição ${frete.status} → ${novoStatus} não permitida` },
      { status: 422 }
    )
  }

  // Transição para CTE_EMITIDO exige chave válida
  if (novoStatus === 'CTE_EMITIDO') {
    if (!chave_cte || !validarChaveCTe(chave_cte)) {
      return Response.json(
        { error: 'Chave CT-e inválida. Deve ter 44 dígitos válidos.' },
        { status: 422 }
      )
    }
  }

  const updatePayload: Record<string, unknown> = { status: novoStatus }
  if (novoStatus === 'CTE_EMITIDO' && chave_cte) {
    updatePayload.chave_cte = chave_cte.replace(/\D/g, '')
  }
  if (novoStatus === 'CANCELADO' && motivoSanitizado) {
    updatePayload.observacoes = motivoSanitizado
  }

  const { error: updateError } = await supabase
    .from('fretes')
    .update(updatePayload)
    .eq('id', id)

  if (updateError) {
    console.error('[fretes/status] update error', updateError)
    return Response.json({ error: 'Erro interno' }, { status: 500 })
  }

  await supabase.from('eventos').insert({
    frete_id: id,
    tipo: 'STATUS_CHANGE',
    descricao: motivoSanitizado ?? `Status alterado para ${novoStatus}`,
    status_anterior: frete.status,
    status_novo: novoStatus,
    usuario_id: user.id,
    ip_address: request.headers.get('x-forwarded-for') ?? request.headers.get('x-real-ip'),
    user_agent: request.headers.get('user-agent'),
  })

  return Response.json({ ok: true, novoStatus })
}
```

- [ ] **Step 3: Atualizar `src/app/api/fretes/[id]/route.ts`**

Neste arquivo, localizar o `.select()` que inclui `documentos(...)` e remover essa parte. Também remover qualquer referência a `cte_status` no select ou no tipo de retorno. O select deve ficar apenas:

```typescript
.select(`
  *,
  clientes(*),
  motoristas(*),
  veiculos(*),
  eventos(*)
`)
```

- [ ] **Step 4: Verificar compilação**

```bash
npx tsc --noEmit 2>&1 | head -40
```

- [ ] **Step 5: Commit**

```bash
git add src/app/api/fretes/route.ts src/app/api/fretes/[id]/status/route.ts src/app/api/fretes/[id]/route.ts
git commit -m "feat: api fretes com novo fluxo e validacao chave CTE"
```

---

## Task 6: StatusBadge — remover CTEStatusBadge, adicionar novos estados

**Files:**
- Modify: `src/components/kanban/StatusBadge.tsx`

- [ ] **Step 1: Reescrever StatusBadge.tsx**

Substituir todo o conteúdo por:

```typescript
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import type { StatusViagem } from '@/lib/state-machine'

const statusViagem: Record<StatusViagem, { label: string; className: string }> = {
  ABERTO:          { label: 'Aberto',        className: 'bg-[#E6F1FB] text-[#185FA5] border-[#185FA5]/20' },
  CARREGANDO:      { label: 'Carregando',    className: 'bg-[#FAEEDA] text-[#854F0B] border-[#854F0B]/20' },
  AGUARDANDO_CTE:  { label: 'Aguard. CT-e', className: 'bg-[#FFF0E6] text-[#C2460A] border-[#C2460A]/20' },
  CTE_EMITIDO:     { label: 'CT-e Emitido', className: 'bg-[#E0F7FA] text-[#0E7490] border-[#0E7490]/20' },
  EM_VIAGEM:       { label: 'Em Viagem',    className: 'bg-[#E1F5EE] text-[#0F6E56] border-[#0F6E56]/20' },
  FINALIZADO:      { label: 'Finalizado',   className: 'bg-[#EAF3DE] text-[#3B6D11] border-[#3B6D11]/20' },
  CANCELADO:       { label: 'Cancelado',    className: 'bg-[#FCEBEB] text-[#A32D2D] border-[#A32D2D]/20' },
}

interface StatusBadgeProps {
  status: StatusViagem
  className?: string
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const config = statusViagem[status]
  return (
    <Badge
      variant="outline"
      className={cn('font-medium text-xs', config.className, className)}
    >
      {config.label}
    </Badge>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/kanban/StatusBadge.tsx
git commit -m "feat: StatusBadge com novos estados, remove CTEStatusBadge"
```

---

## Task 7: FreteCard — card rico com dados completos

**Files:**
- Modify: `src/components/kanban/FreteCard.tsx`

- [ ] **Step 1: Reescrever FreteCard.tsx**

```typescript
'use client'

import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { MapPin, User, Truck, Calendar } from 'lucide-react'
import type { Tables } from '@/types/database.types'
import type { StatusViagem } from '@/lib/state-machine'

type FreteComRelacoes = Tables<'fretes'> & {
  clientes: Pick<Tables<'clientes'>, 'razao_social'> | null
  motoristas: Pick<Tables<'motoristas'>, 'nome'> | null
  veiculos: Pick<Tables<'veiculos'>, 'placa' | 'tipo'> | null
}

interface FreteCardProps {
  frete: FreteComRelacoes
  onClick: (frete: FreteComRelacoes) => void
}

const STATUS_COM_CTE: StatusViagem[] = ['CTE_EMITIDO', 'EM_VIAGEM', 'FINALIZADO']

export function FreteCard({ frete, onClick }: FreteCardProps) {
  const idCurto = frete.id.slice(-6).toUpperCase()
  const mostrarCte = STATUS_COM_CTE.includes(frete.status as StatusViagem)

  return (
    <Card
      className="cursor-pointer hover:shadow-md transition-shadow border"
      onClick={() => onClick(frete)}
    >
      <CardContent className="p-3 space-y-2">
        {/* Header: ID + badge CT-e */}
        <div className="flex items-center justify-between">
          <span className="text-xs font-mono text-muted-foreground">#{idCurto}</span>
          {mostrarCte && (
            <Badge variant="outline" className="text-[10px] bg-[#E0F7FA] text-[#0E7490] border-[#0E7490]/20">
              CT-e ✓
            </Badge>
          )}
        </div>

        {/* Cliente */}
        {frete.clientes && (
          <p className="text-sm font-semibold truncate">{frete.clientes.razao_social}</p>
        )}

        {/* Rota */}
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          <MapPin className="h-3 w-3 shrink-0" />
          <span className="truncate">
            {frete.origem_cidade}/{frete.origem_uf} → {frete.destino_cidade}/{frete.destino_uf}
          </span>
        </div>

        <hr className="border-border" />

        {/* Grid: motorista, veículo, data, valor */}
        <div className="grid grid-cols-2 gap-x-3 gap-y-1.5">
          {frete.motoristas && (
            <div className="col-span-2 flex items-center gap-1 text-xs text-muted-foreground">
              <User className="h-3 w-3 shrink-0" />
              <span className="truncate">{frete.motoristas.nome}</span>
            </div>
          )}
          {frete.veiculos && (
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Truck className="h-3 w-3 shrink-0" />
              <span className="truncate">{frete.veiculos.placa} · {frete.veiculos.tipo}</span>
            </div>
          )}
          {frete.data_carregamento && (
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Calendar className="h-3 w-3 shrink-0" />
              <span>{new Date(frete.data_carregamento + 'T00:00:00').toLocaleDateString('pt-BR')}</span>
            </div>
          )}
        </div>

        {/* Rodapé: tipo carga + valor */}
        <div className="flex items-center justify-between">
          {frete.tipo_veiculo && (
            <Badge variant="outline" className="text-[10px] bg-indigo-50 text-indigo-700 border-indigo-200">
              {frete.tipo_veiculo}
            </Badge>
          )}
          {frete.valor_frete && (
            <span className="text-xs text-muted-foreground font-mono ml-auto">
              {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(frete.valor_frete)}
            </span>
          )}
        </div>

        {/* Chave CT-e (quando emitido) */}
        {frete.chave_cte && (
          <p className="text-[10px] font-mono text-cyan-700 truncate bg-cyan-50 px-1.5 py-0.5 rounded">
            {frete.chave_cte}
          </p>
        )}
      </CardContent>
    </Card>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/kanban/FreteCard.tsx
git commit -m "feat: FreteCard rico com todos os dados e chave CT-e"
```

---

## Task 8: KanbanColumn — bordas coloridas por estado

**Files:**
- Modify: `src/components/kanban/KanbanColumn.tsx`

- [ ] **Step 1: Atualizar KanbanColumn.tsx**

```typescript
import { StatusBadge } from './StatusBadge'
import { FreteCard } from './FreteCard'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'
import type { StatusViagem } from '@/lib/state-machine'
import type { Tables } from '@/types/database.types'

type FreteComRelacoes = Tables<'fretes'> & {
  clientes: Pick<Tables<'clientes'>, 'razao_social'> | null
  motoristas: Pick<Tables<'motoristas'>, 'nome'> | null
  veiculos: Pick<Tables<'veiculos'>, 'placa' | 'tipo'> | null
}

interface KanbanColumnProps {
  status: StatusViagem
  fretes: FreteComRelacoes[]
  loading: boolean
  onCardClick: (frete: FreteComRelacoes) => void
}

const columnAccent: Partial<Record<StatusViagem, string>> = {
  AGUARDANDO_CTE: 'border-l-4 border-l-orange-400',
  CTE_EMITIDO:    'border-l-4 border-l-cyan-500',
}

export function KanbanColumn({ status, fretes, loading, onCardClick }: KanbanColumnProps) {
  return (
    <div className={cn(
      'snap-start flex-shrink-0 w-[300px] md:w-auto md:flex-1 flex flex-col gap-2 rounded-lg',
      columnAccent[status]
    )}>
      <div className="flex items-center justify-between px-1 py-2 sticky top-0 bg-gray-50 z-10">
        <StatusBadge status={status} />
        <span className="text-xs text-muted-foreground font-medium">{fretes.length}</span>
      </div>

      <div className="flex flex-col gap-2 min-h-[100px]">
        {loading ? (
          <>
            <Skeleton className="h-28 rounded-lg" />
            <Skeleton className="h-24 rounded-lg" />
          </>
        ) : fretes.length === 0 ? (
          <div className="text-center text-xs text-muted-foreground py-8 border-2 border-dashed rounded-lg">
            Nenhum frete
          </div>
        ) : (
          fretes.map((frete) => (
            <FreteCard key={frete.id} frete={frete} onClick={onCardClick} />
          ))
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/kanban/KanbanColumn.tsx
git commit -m "feat: KanbanColumn com bordas coloridas por estado"
```

---

## Task 9: FreteDetailModal — remover tabs, adicionar input chave CT-e

**Files:**
- Modify: `src/components/fretes/FreteDetailModal.tsx`

- [ ] **Step 1: Atualizar o tipo FreteCompleto**

No topo do arquivo, substituir `FreteCompleto`:

```typescript
type FreteCompleto = Tables<'fretes'> & {
  clientes: Tables<'clientes'> | null
  motoristas: Tables<'motoristas'> | null
  veiculos: Tables<'veiculos'> | null
  eventos: Tables<'eventos'>[]
}
```

(remover `documentos` do tipo)

- [ ] **Step 2: Atualizar statusLabel**

```typescript
const statusLabel: Record<StatusViagem, string> = {
  ABERTO:         'Iniciar Carregamento',
  CARREGANDO:     'Aguardar CT-e',
  AGUARDANDO_CTE: 'Registrar CT-e Emitido',
  CTE_EMITIDO:    'Liberar para Viagem',
  EM_VIAGEM:      'Finalizar',
  FINALIZADO:     '',
  CANCELADO:      '',
}
```

- [ ] **Step 3: Adicionar estado para chave CT-e**

Após as declarações de `useState` existentes, adicionar:

```typescript
const [chaveCte, setChaveCte] = useState('')
const [chaveCteErro, setChaveCteErro] = useState('')
```

Adicionar import:
```typescript
import { validarChaveCTe } from '@/lib/validations/chave-cte'
import { Input } from '@/components/ui/input'
```

- [ ] **Step 4: Atualizar mutationFn de avancarStatus**

```typescript
const avancarStatus = useMutation({
  mutationFn: async (novoStatus: StatusViagem) => {
    if (novoStatus === 'CTE_EMITIDO') {
      if (!validarChaveCTe(chaveCte)) {
        throw new Error('Chave CT-e inválida. Informe os 44 dígitos corretos.')
      }
    }
    const res = await fetch(`/api/fretes/${freteId}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        status: novoStatus,
        ...(novoStatus === 'CTE_EMITIDO' ? { chave_cte: chaveCte } : {}),
      }),
    })
    if (!res.ok) throw new Error((await res.json()).error ?? 'Erro ao avançar status')
    return res.json()
  },
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ['frete', freteId] })
    queryClient.invalidateQueries({ queryKey: ['fretes'] })
    setChaveCte('')
    setChaveCteErro('')
    toast.success('Status atualizado')
  },
  onError: (e: Error) => toast.error(e.message),
})
```

- [ ] **Step 5: Atualizar a seção de ações de status**

Substituir o bloco de ações (div com `bg-gray-50`) por:

```tsx
{frete.status !== 'FINALIZADO' && frete.status !== 'CANCELADO' && (
  <div className="space-y-3 p-3 bg-gray-50 rounded-lg">
    {frete.status === 'AGUARDANDO_CTE' && (
      <div className="space-y-1">
        <label className="text-xs font-medium text-muted-foreground">
          Chave CT-e (44 dígitos)
        </label>
        <Input
          placeholder="00000000000000000000000000000000000000000000"
          value={chaveCte}
          onChange={(e) => {
            setChaveCte(e.target.value.replace(/\D/g, ''))
            setChaveCteErro('')
          }}
          maxLength={44}
          className="font-mono text-xs"
        />
        {chaveCteErro && (
          <p className="text-xs text-destructive">{chaveCteErro}</p>
        )}
        <p className="text-xs text-muted-foreground">
          {chaveCte.length}/44 dígitos
        </p>
      </div>
    )}
    <div className="flex items-center gap-3">
      {podeAvancar && nextStatus && (
        <Button
          size="sm"
          onClick={() => avancarStatus.mutate(nextStatus)}
          disabled={
            avancarStatus.isPending ||
            (nextStatus === 'CTE_EMITIDO' && chaveCte.length !== 44)
          }
        >
          {statusLabel[frete.status] || `Avançar para ${nextStatus}`}
        </Button>
      )}
      <Button
        size="sm"
        variant="destructive"
        onClick={() => setCancelando(true)}
        disabled={cancelando}
      >
        <AlertTriangle className="h-3 w-3 mr-1" />
        Cancelar Frete
      </Button>
    </div>
  </div>
)}
```

- [ ] **Step 6: Atualizar as Tabs — remover Documentos e Checklist**

Substituir o bloco `<Tabs>` completo por:

```tsx
<Tabs defaultValue="info">
  <TabsList className="w-full">
    <TabsTrigger value="info" className="flex-1">Informações</TabsTrigger>
    <TabsTrigger value="historico" className="flex-1">Histórico</TabsTrigger>
  </TabsList>

  <TabsContent value="info" className="space-y-3 mt-4">
    <div className="grid grid-cols-2 gap-3 text-sm">
      {frete.clientes && (
        <div className="col-span-2">
          <span className="text-xs text-muted-foreground uppercase tracking-wide">Cliente</span>
          <p className="font-medium">{frete.clientes.razao_social}</p>
        </div>
      )}
      <div>
        <span className="text-xs text-muted-foreground uppercase tracking-wide">Origem</span>
        <p>{frete.origem_cidade}/{frete.origem_uf}</p>
      </div>
      <div>
        <span className="text-xs text-muted-foreground uppercase tracking-wide">Destino</span>
        <p>{frete.destino_cidade}/{frete.destino_uf}</p>
      </div>
      {frete.motoristas && (
        <div>
          <span className="text-xs text-muted-foreground uppercase tracking-wide">Motorista</span>
          <p>{frete.motoristas.nome}</p>
        </div>
      )}
      {frete.veiculos && (
        <div>
          <span className="text-xs text-muted-foreground uppercase tracking-wide">Veículo</span>
          <p>{frete.veiculos.placa} — {frete.veiculos.tipo}</p>
        </div>
      )}
      {frete.data_carregamento && (
        <div>
          <span className="text-xs text-muted-foreground uppercase tracking-wide">Carregamento</span>
          <p>{new Date(frete.data_carregamento + 'T00:00:00').toLocaleDateString('pt-BR')}</p>
        </div>
      )}
      {frete.data_entrega_prevista && (
        <div>
          <span className="text-xs text-muted-foreground uppercase tracking-wide">Entrega Prevista</span>
          <p>{new Date(frete.data_entrega_prevista + 'T00:00:00').toLocaleDateString('pt-BR')}</p>
        </div>
      )}
      {frete.valor_frete && (
        <div>
          <span className="text-xs text-muted-foreground uppercase tracking-wide">Valor Frete</span>
          <p className="font-mono">
            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(frete.valor_frete)}
          </p>
        </div>
      )}
      {frete.chave_cte && (
        <div className="col-span-2">
          <span className="text-xs text-muted-foreground uppercase tracking-wide">Chave CT-e</span>
          <p className="font-mono text-xs bg-cyan-50 text-cyan-800 px-2 py-1 rounded mt-1 break-all">
            {frete.chave_cte}
          </p>
        </div>
      )}
      {frete.observacoes && (
        <div className="col-span-2">
          <span className="text-xs text-muted-foreground uppercase tracking-wide">Observações</span>
          <p className="text-sm">{frete.observacoes}</p>
        </div>
      )}
    </div>
  </TabsContent>

  <TabsContent value="historico" className="mt-4">
    <EventTimeline eventos={frete.eventos ?? []} />
  </TabsContent>
</Tabs>
```

- [ ] **Step 7: Limpar imports obsoletos**

Remover imports:
```typescript
import { CTEStatusBadge } from '@/components/kanban/StatusBadge'
import { DocumentUpload } from '@/components/documentos/DocumentUpload'
import { DocumentList } from '@/components/documentos/DocumentList'
import { ConferenceChecklist } from '@/components/checklist/ConferenceChecklist'
```

Também remover o `<CTEStatusBadge>` do `DialogHeader` e quaisquer referências a `cte_status`.

- [ ] **Step 8: Verificar compilação**

```bash
npx tsc --noEmit 2>&1 | head -40
```

- [ ] **Step 9: Commit**

```bash
git add src/components/fretes/FreteDetailModal.tsx
git commit -m "feat: FreteDetailModal com novo fluxo, input chave CTE e aba info"
```

---

## Task 10: FreteFormModal — campos obrigatórios

**Files:**
- Modify: `src/components/fretes/FreteFormModal.tsx`

- [ ] **Step 1: Atualizar FreteSchema para campos obrigatórios**

Substituir o `FreteSchema`:

```typescript
const FreteSchema = z.object({
  origem_cidade: z.string().min(1, 'Obrigatório'),
  origem_uf: z.string().length(2, 'UF inválida'),
  destino_cidade: z.string().min(1, 'Obrigatório'),
  destino_uf: z.string().length(2, 'UF inválida'),
  cliente_id: z.string().uuid().nullable().optional(),
  motorista_id: z.string().uuid({ message: 'Selecione um motorista' }),
  veiculo_id: z.string().uuid({ message: 'Selecione um veículo' }),
  tipo_veiculo: z.string().nullable().optional(),
  valor_frete: z.string().optional(),
  data_carregamento: z.string().min(1, 'Data de carregamento obrigatória'),
  data_entrega_prevista: z.string().nullable().optional(),
  observacoes: z.string().nullable().optional(),
})
```

- [ ] **Step 2: Atualizar defaultValues**

```typescript
defaultValues: {
  origem_cidade: '',
  origem_uf: '',
  destino_cidade: '',
  destino_uf: '',
  cliente_id: null,
  motorista_id: '',
  veiculo_id: '',
  tipo_veiculo: null,
  valor_frete: '',
  data_carregamento: '',
  data_entrega_prevista: null,
  observacoes: null,
},
```

- [ ] **Step 3: Atualizar labels dos campos obrigatórios no formulário**

Nos campos `motorista_id`, `veiculo_id` e `data_carregamento`, atualizar o `<FormLabel>` para indicar obrigatoriedade:

```tsx
<FormLabel>Motorista <span className="text-destructive">*</span></FormLabel>
<FormLabel>Veículo <span className="text-destructive">*</span></FormLabel>
<FormLabel>Data Carregamento <span className="text-destructive">*</span></FormLabel>
```

- [ ] **Step 4: Commit**

```bash
git add src/components/fretes/FreteFormModal.tsx
git commit -m "feat: FreteFormModal com motorista, veiculo e data obrigatorios"
```

---

## Task 11: Dashboard — KPIs e página de fretes

**Files:**
- Modify: `src/app/(dashboard)/dashboard/page.tsx`
- Modify: `src/app/(dashboard)/fretes/page.tsx`

- [ ] **Step 1: Atualizar KpiData e calcularKpis no dashboard**

Substituir o tipo `KpiData` e a função `calcularKpis`:

```typescript
type KpiData = {
  aberto: number
  carregando: number
  aguardandoCte: number
  cteEmitido: number
  emViagem: number
  finalizado: number
}

function calcularKpis(fretes: FreteComRelacoes[]): KpiData {
  return {
    aberto:        fretes.filter((f) => f.status === 'ABERTO').length,
    carregando:    fretes.filter((f) => f.status === 'CARREGANDO').length,
    aguardandoCte: fretes.filter((f) => f.status === 'AGUARDANDO_CTE').length,
    cteEmitido:    fretes.filter((f) => f.status === 'CTE_EMITIDO').length,
    emViagem:      fretes.filter((f) => f.status === 'EM_VIAGEM').length,
    finalizado:    fretes.filter((f) => f.status === 'FINALIZADO').length,
  }
}
```

- [ ] **Step 2: Atualizar os 6 KpiCards no JSX**

Substituir o bloco de KpiCards por:

```tsx
<KpiCard title="Abertos"       value={kpis?.aberto ?? 0}        icon={Package}      description="Aguardando carregamento" />
<KpiCard title="Carregando"    value={kpis?.carregando ?? 0}     icon={Truck}        description="Em carregamento" />
<KpiCard title="Aguard. CT-e"  value={kpis?.aguardandoCte ?? 0}  icon={AlertCircle}  description="Aguardam emissão" variant={kpis && kpis.aguardandoCte > 0 ? 'warning' : 'default'} />
<KpiCard title="CT-e Emitido"  value={kpis?.cteEmitido ?? 0}     icon={CheckCircle2} description="Prontos para viagem" />
<KpiCard title="Em Viagem"     value={kpis?.emViagem ?? 0}       icon={TrendingUp}   description="Em trânsito" />
<KpiCard title="Finalizados"   value={kpis?.finalizado ?? 0}     icon={CheckCircle2} description="Concluídos" variant="success" />
```

- [ ] **Step 3: Atualizar STATUS_OPTIONS em fretes/page.tsx**

```typescript
const STATUS_OPTIONS: { value: StatusViagem; label: string }[] = [
  { value: 'TODOS',          label: 'Todos os status' },
  { value: 'ABERTO',         label: 'Aberto' },
  { value: 'CARREGANDO',     label: 'Carregando' },
  { value: 'AGUARDANDO_CTE', label: 'Aguard. CT-e' },
  { value: 'CTE_EMITIDO',    label: 'CT-e Emitido' },
  { value: 'EM_VIAGEM',      label: 'Em Viagem' },
  { value: 'FINALIZADO',     label: 'Finalizado' },
  { value: 'CANCELADO',      label: 'Cancelado' },
]
```

O tipo local `StatusViagem` no topo do arquivo passa a incluir os novos valores — atualizar:
```typescript
type StatusViagem = Tables<'fretes'>['status'] | 'TODOS'
```
(isso já vai funcionar automaticamente após a Task 3 atualizar os tipos do banco)

- [ ] **Step 4: Remover coluna CT-e da tabela em fretes/page.tsx**

Na tabela, remover:
```tsx
<TableHead>CT-e</TableHead>
// e na linha de dados:
<TableCell>
  <CTEStatusBadge status={frete.cte_status} />
</TableCell>
```

Também remover o import de `CTEStatusBadge`.

Atualizar o `colSpan` do estado vazio de `8` para `7`.

- [ ] **Step 5: Verificar compilação final**

```bash
npx tsc --noEmit 2>&1
```

Esperado: zero erros.

- [ ] **Step 6: Commit**

```bash
git add src/app/(dashboard)/dashboard/page.tsx src/app/(dashboard)/fretes/page.tsx
git commit -m "feat: dashboard e listagem de fretes com novo pipeline"
```

---

## Task 12: Teste end-to-end manual

- [ ] **Step 1: Iniciar o servidor de desenvolvimento**

```bash
npm run dev
```

Acesse http://localhost:3000

- [ ] **Step 2: Criar novo frete — validar obrigatoriedade**

Clique em "Novo Frete". Tente salvar sem motorista: deve exibir erro de validação. Tente sem data de carregamento: deve exibir erro. Preencha todos os campos obrigatórios e salve.

Esperado: frete criado com status `ABERTO`, aparece na coluna ABERTO do kanban.

- [ ] **Step 3: Avançar frete ABERTO → CARREGANDO**

Clique no card → modal abre → botão "Iniciar Carregamento" visível → clique.

Esperado: card move para coluna CARREGANDO, histórico registra evento.

- [ ] **Step 4: Avançar CARREGANDO → AGUARDANDO_CTE**

No modal → botão "Aguardar CT-e" → clique.

Esperado: card move para coluna AGUARDANDO_CTE (com borda laranja).

- [ ] **Step 5: Tentar avançar AGUARDANDO_CTE → CTE_EMITIDO sem chave**

No modal: botão "Registrar CT-e Emitido" deve estar desabilitado enquanto campo de chave tiver menos de 44 dígitos.

- [ ] **Step 6: Registrar chave CT-e inválida**

Digitar 44 dígitos com checksum errado (ex: todos zeros exceto último). Clicar no botão → toast de erro deve aparecer.

- [ ] **Step 7: Registrar chave CT-e válida**

Usar chave válida: `35240612345678000195570010000000011000000015` (exemplo com checksum correto, verificar via algoritmo se necessário).

Esperado: card move para CTE_EMITIDO (borda ciana), chave aparece no card e na aba Informações do modal, badge "CT-e ✓" visível.

- [ ] **Step 8: Avançar CTE_EMITIDO → EM_VIAGEM → FINALIZADO**

Dois cliques consecutivos. Esperado: fluxo completo sem erros.

- [ ] **Step 9: Verificar KPIs do dashboard**

Os 6 KPIs devem refletir os estados corretos. Não deve aparecer nenhuma referência a "CT-e Pendentes" ou "Programados".

- [ ] **Step 10: Commit final**

```bash
git add -A
git commit -m "feat: simplificacao fluxo frete completa"
```

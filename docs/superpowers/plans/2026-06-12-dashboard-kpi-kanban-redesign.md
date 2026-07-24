# Dashboard KPI Bar + Kanban Redesign — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Substituir os KpiCards por uma faixa compacta (~90px) com contadores grandes por status, e eliminar o scroll vertical nas colunas kanban com cards reduzidos.

**Architecture:** O `DashboardPage` passa a renderizar um `KpiBar` horizontal no lugar do `grid` de `KpiCard`. O `KanbanColumn` perde o `overflow-y-auto` e passa a usar `h-full flex flex-col` com `overflow-y-hidden`. O `FreteCard` é reduzido: mantém cliente, rota e número; remove motorista, veículo, data, valor e chave CT-e.

**Tech Stack:** Next.js 14, TypeScript Strict, Tailwind CSS, Shadcn UI

---

### Task 1: Criar componente KpiBar

**Files:**
- Create: `madia-dispatch/src/components/dashboard/KpiBar.tsx`

- [ ] **Step 1: Criar o arquivo com o componente**

```tsx
// madia-dispatch/src/components/dashboard/KpiBar.tsx
import { cn } from '@/lib/utils'
import type { StatusViagem } from '@/lib/state-machine'

type KpiBarData = {
  aberto: number
  carregando: number
  aguardandoCte: number
  cteEmitido: number
  emViagem: number
  finalizado: number
}

const CELLS: {
  key: keyof KpiBarData
  label: string
  numberClass: string
  borderClass: string
}[] = [
  { key: 'aberto',        label: 'Aberto',       numberClass: 'text-foreground',  borderClass: 'border-b-gray-300' },
  { key: 'carregando',    label: 'Carregando',   numberClass: 'text-foreground',  borderClass: 'border-b-gray-300' },
  { key: 'aguardandoCte', label: 'Aguard. CT-e', numberClass: 'text-orange-500',  borderClass: 'border-b-orange-400' },
  { key: 'cteEmitido',    label: 'CT-e Emitido', numberClass: 'text-cyan-500',    borderClass: 'border-b-cyan-400' },
  { key: 'emViagem',      label: 'Em Viagem',    numberClass: 'text-foreground',  borderClass: 'border-b-gray-300' },
  { key: 'finalizado',    label: 'Finalizado',   numberClass: 'text-green-600',   borderClass: 'border-b-green-500' },
]

interface KpiBarProps {
  data: KpiBarData
}

export function KpiBar({ data }: KpiBarProps) {
  return (
    <div className="grid grid-cols-6 rounded-lg border bg-card overflow-hidden shrink-0">
      {CELLS.map((cell, i) => (
        <div
          key={cell.key}
          className={cn(
            'flex flex-col items-center justify-center py-3 border-b-2',
            cell.borderClass,
            i < CELLS.length - 1 && 'border-r'
          )}
        >
          <span className={cn('text-3xl font-bold leading-none', cell.numberClass)}>
            {data[cell.key]}
          </span>
          <span className="text-xs text-muted-foreground mt-1">{cell.label}</span>
        </div>
      ))}
    </div>
  )
}
```

- [ ] **Step 2: Verificar que não há erros de TypeScript**

```bash
cd "madia-dispatch" && npx tsc --noEmit 2>&1 | head -30
```

Esperado: sem erros relacionados ao novo arquivo.

- [ ] **Step 3: Commit**

```bash
cd "madia-dispatch" && git add src/components/dashboard/KpiBar.tsx
git commit -m "feat: add KpiBar component for dashboard status overview"
```

---

### Task 2: Atualizar DashboardPage para usar KpiBar

**Files:**
- Modify: `madia-dispatch/src/app/(dashboard)/dashboard/page.tsx`

- [ ] **Step 1: Substituir o conteúdo do arquivo**

Substitua o arquivo completo por:

```tsx
'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { KanbanBoard } from '@/components/kanban/KanbanBoard'
import { FreteDetailModal } from '@/components/fretes/FreteDetailModal'
import { FreteFormModal } from '@/components/fretes/FreteFormModal'
import { KpiBar } from '@/components/dashboard/KpiBar'
import { Button } from '@/components/ui/button'
import { Plus } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'
import type { FreteComRelacoes } from '@/services/fretes.service'

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

export default function DashboardPage() {
  const [freteDetalhe, setFreteDetalhe] = useState<FreteComRelacoes | null>(null)
  const [novoFreteOpen, setNovoFreteOpen] = useState(false)

  const { data: fretes, isLoading } = useQuery<FreteComRelacoes[]>({
    queryKey: ['fretes'],
    queryFn: () => fetch('/api/fretes').then((r) => r.json()),
  })

  const kpis = fretes ? calcularKpis(fretes) : null

  return (
    <div className="flex flex-col h-full gap-3 min-h-0">
      {/* Header */}
      <div className="flex items-center justify-between shrink-0">
        <div>
          <h1 className="text-xl font-semibold">Dashboard</h1>
          <p className="text-sm text-muted-foreground">Visão geral da operação em tempo real</p>
        </div>
        <Button onClick={() => setNovoFreteOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Novo Frete
        </Button>
      </div>

      {/* KPI Bar */}
      {isLoading ? (
        <Skeleton className="h-[88px] w-full rounded-lg shrink-0" />
      ) : kpis ? (
        <KpiBar data={kpis} />
      ) : null}

      {/* Kanban */}
      <div className="flex-1 min-h-0">
        <KanbanBoard onCardClick={setFreteDetalhe} />
      </div>

      {freteDetalhe && (
        <FreteDetailModal
          freteId={freteDetalhe.id}
          open={!!freteDetalhe}
          onClose={() => setFreteDetalhe(null)}
        />
      )}

      <FreteFormModal
        open={novoFreteOpen}
        onClose={() => setNovoFreteOpen(false)}
      />
    </div>
  )
}
```

- [ ] **Step 2: Verificar TypeScript**

```bash
cd "madia-dispatch" && npx tsc --noEmit 2>&1 | head -30
```

Esperado: sem erros.

- [ ] **Step 3: Commit**

```bash
cd "madia-dispatch" && git add src/app/\(dashboard\)/dashboard/page.tsx
git commit -m "feat: replace KpiCards grid with compact KpiBar in dashboard"
```

---

### Task 3: Ajustar KanbanBoard para altura total sem scroll vertical

**Files:**
- Modify: `madia-dispatch/src/components/kanban/KanbanBoard.tsx`

- [ ] **Step 1: Atualizar o container do board**

No arquivo `KanbanBoard.tsx`, localize a linha:

```tsx
<div className="flex gap-3 overflow-x-auto snap-x snap-mandatory pb-4 min-h-full">
```

Substitua por:

```tsx
<div className="flex gap-3 overflow-x-auto snap-x snap-mandatory h-full">
```

- [ ] **Step 2: Atualizar o wrapper externo do return**

Localize:

```tsx
return (
  <div className="flex gap-3 overflow-x-auto snap-x snap-mandatory pb-4 min-h-full">
```

Verifique se há um wrapper extra. O componente completo deve ficar:

```tsx
return (
  <div className="flex gap-3 overflow-x-auto snap-x snap-mandatory h-full pb-2">
    {COLUNAS_KANBAN.map((status) => (
      <KanbanColumn
        key={status}
        status={status}
        fretes={fretesPorStatus[status]}
        loading={isLoading}
        onCardClick={onCardClick}
      />
    ))}
  </div>
)
```

- [ ] **Step 3: Commit**

```bash
cd "madia-dispatch" && git add src/components/kanban/KanbanBoard.tsx
git commit -m "feat: make KanbanBoard fill full height without vertical scroll"
```

---

### Task 4: Ajustar KanbanColumn para não scrollar verticalmente

**Files:**
- Modify: `madia-dispatch/src/components/kanban/KanbanColumn.tsx`

- [ ] **Step 1: Substituir o arquivo completo**

```tsx
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

const columnBorder: Partial<Record<StatusViagem, string>> = {
  AGUARDANDO_CTE: 'border-l-[3px] border-l-[#f97316]',
  CTE_EMITIDO:    'border-l-[3px] border-l-[#06b6d4]',
}

interface KanbanColumnProps {
  status: StatusViagem
  fretes: FreteComRelacoes[]
  loading: boolean
  onCardClick: (frete: FreteComRelacoes) => void
}

export function KanbanColumn({ status, fretes, loading, onCardClick }: KanbanColumnProps) {
  return (
    <div className={cn(
      'snap-start flex-shrink-0 w-[260px] md:w-auto md:flex-1 flex flex-col h-full rounded-t-md',
      columnBorder[status]
    )}>
      <div className="flex items-center justify-between px-1 py-2 shrink-0 bg-gray-50 rounded-t-md">
        <StatusBadge status={status} />
        <span className="text-xs text-muted-foreground font-medium">{fretes.length}</span>
      </div>

      <div className="flex flex-col gap-1.5 flex-1 min-h-0 overflow-y-hidden pt-1">
        {loading ? (
          <>
            <Skeleton className="h-16 rounded-lg shrink-0" />
            <Skeleton className="h-16 rounded-lg shrink-0" />
          </>
        ) : fretes.length === 0 ? (
          <div className="text-center text-xs text-muted-foreground py-6 border-2 border-dashed rounded-lg mx-0.5">
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

- [ ] **Step 2: Verificar TypeScript**

```bash
cd "madia-dispatch" && npx tsc --noEmit 2>&1 | head -30
```

Esperado: sem erros.

- [ ] **Step 3: Commit**

```bash
cd "madia-dispatch" && git add src/components/kanban/KanbanColumn.tsx
git commit -m "feat: remove vertical scroll from KanbanColumn, use full height layout"
```

---

### Task 5: Reduzir FreteCard — remover campos secundários

**Files:**
- Modify: `madia-dispatch/src/components/kanban/FreteCard.tsx`

- [ ] **Step 1: Substituir o arquivo completo**

```tsx
'use client'

import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { MapPin } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Tables } from '@/types/database.types'
import type { StatusViagem } from '@/lib/state-machine'

type FreteComRelacoes = Tables<'fretes'> & {
  clientes: Pick<Tables<'clientes'>, 'razao_social'> | null
  motoristas: Pick<Tables<'motoristas'>, 'nome'> | null
  veiculos: Pick<Tables<'veiculos'>, 'placa' | 'tipo'> | null
}

const CTE_STATES: StatusViagem[] = ['CTE_EMITIDO', 'EM_VIAGEM', 'FINALIZADO']

interface FreteCardProps {
  frete: FreteComRelacoes
  onClick: (frete: FreteComRelacoes) => void
}

export function FreteCard({ frete, onClick }: FreteCardProps) {
  const idCurto = frete.id.slice(-6).toUpperCase()
  const status = frete.status as StatusViagem
  const showCteBadge = CTE_STATES.includes(status)
  const isFinished = status === 'FINALIZADO'

  return (
    <Card
      className={cn(
        'cursor-pointer hover:shadow-md transition-shadow border shrink-0',
        isFinished && 'opacity-70'
      )}
      onClick={() => onClick(frete)}
    >
      <CardContent className="p-2.5 space-y-1">
        <div className="flex items-center justify-between gap-1">
          <span className="text-[11px] font-mono text-muted-foreground">#{idCurto}</span>
          {showCteBadge && (
            <Badge variant="outline" className="text-[10px] px-1 py-0 bg-[#E0F9F9] text-[#0E7490] border-[#06b6d4]/30">
              CT-e ✓
            </Badge>
          )}
        </div>

        {frete.clientes && (
          <p className="text-sm font-medium truncate leading-tight">{frete.clientes.razao_social}</p>
        )}

        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          <MapPin className="h-3 w-3 shrink-0" />
          <span className="truncate">
            {frete.origem_cidade}/{frete.origem_uf} → {frete.destino_cidade}/{frete.destino_uf}
          </span>
        </div>
      </CardContent>
    </Card>
  )
}
```

- [ ] **Step 2: Verificar TypeScript**

```bash
cd "madia-dispatch" && npx tsc --noEmit 2>&1 | head -30
```

Esperado: sem erros.

- [ ] **Step 3: Commit**

```bash
cd "madia-dispatch" && git add src/components/kanban/FreteCard.tsx
git commit -m "feat: reduce FreteCard to client, route and id for kanban density"
```

---

## Self-Review

**Cobertura da spec:**
- ✅ KPI bar ~90px com número grande e label pequeno — Task 1
- ✅ Ícones removidos — Task 1
- ✅ Cores por status (laranja Aguard. CT-e, ciano CT-e Emitido, verde Finalizado) — Task 1
- ✅ KpiCards removidos do DashboardPage — Task 2
- ✅ Skeleton substituído por faixa única — Task 2
- ✅ `flex-1 min-h-0` no kanban wrapper — Task 2
- ✅ KanbanBoard `h-full` sem pb excessivo — Task 3
- ✅ KanbanColumn `h-full flex flex-col overflow-y-hidden` — Task 4
- ✅ FreteCard reduzido: só cliente, rota, id, badge CT-e — Task 5
- ✅ Campos removidos: motorista, veículo, data, valor, chave CT-e — Task 5

**Placeholders:** nenhum encontrado.

**Consistência de tipos:** `FreteComRelacoes` definido identicamente em KanbanBoard, KanbanColumn e FreteCard — consistente com o padrão atual do projeto.

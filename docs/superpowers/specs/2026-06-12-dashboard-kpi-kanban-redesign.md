# Dashboard: KPI Bar + Kanban sem scroll vertical

**Data:** 2026-06-12  
**Status:** Aprovado

## Objetivo

Tornar os indicadores de status mais visuais e evidentes, e eliminar o scroll vertical dentro das colunas kanban, mantendo todas as informações críticas acessíveis.

## Layout geral

Página usa `h-screen` com `flex flex-col`. Três zonas de altura fixa/flexível:

1. **Header** — título + botão Novo Frete (altura fixa, sem alteração)
2. **KPI bar** — faixa horizontal ~90px com os 6 status lado a lado
3. **Kanban** — `flex-1` com `min-h-0`, ocupa todo o espaço restante sem overflow vertical

## KPI Bar

### Estrutura visual
- Altura total: ~90px
- 6 células em `grid grid-cols-6`, separadas por divisores verticais finos
- Cada célula:
  - Número do contador: `text-3xl font-bold` com cor de destaque por status
  - Label: `text-xs text-muted-foreground` abaixo do número
  - Sem ícone (removido para ganho de espaço e clareza)
  - Borda inferior fina colorida (`border-b-2`) como acento visual

### Cores por status
| Status | Cor do número | Borda inferior |
|--------|--------------|----------------|
| ABERTO | padrão (foreground) | cinza |
| CARREGANDO | padrão | cinza |
| AGUARDANDO_CTE | `text-orange-500` | laranja |
| CTE_EMITIDO | `text-cyan-500` | ciano |
| EM_VIAGEM | padrão | cinza |
| FINALIZADO | `text-green-600` | verde |

## Kanban sem scroll vertical

### KanbanBoard
- `h-full` no container, sem `overflow-y-auto`
- Colunas em `flex gap-3` com `h-full`

### KanbanColumn
- Container: `flex flex-col h-full`
- Header da coluna: sticky, altura fixa
- Lista de cards: `flex-1 min-h-0 overflow-y-hidden flex flex-col gap-1.5`

### FreteCard reduzido

Cards compactos — apenas informações de triagem rápida:

**Mantém:**
- Razão social do cliente (linha principal, `text-sm font-medium truncate`)
- Rota: origem → destino (`text-xs text-muted-foreground`)
- Número do frete em badge pequeno (`#000001`)

**Remove do card (disponível no modal):**
- Nome do motorista
- Placa/tipo do veículo
- Valor de frete
- Data de carregamento

**Dimensões:**
- Padding reduzido: `p-2.5` (era `p-3` ou mais)
- Gap entre elementos: `gap-1`
- Altura aproximada: ~60-70px por card

## Arquivos a modificar

| Arquivo | Mudança |
|---------|---------|
| `src/app/(dashboard)/dashboard/page.tsx` | Substituir `KpiCard` grid pelo novo `KpiBar`; ajustar layout flex para `h-full` |
| `src/components/kanban/KanbanColumn.tsx` | Remover overflow-y-auto, usar `h-full flex flex-col` |
| `src/components/kanban/KanbanBoard.tsx` | Ajustar container para `h-full` |
| `src/components/kanban/FreteCard.tsx` | Reduzir card, remover campos secundários |

## Não muda

- Lógica de dados, queries, realtime subscription
- Modal de detalhe (todas as informações continuam lá)
- StatusBadge no header da coluna
- Responsividade mobile (snap scroll horizontal mantido)

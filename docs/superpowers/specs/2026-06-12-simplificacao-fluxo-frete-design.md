# Simplificação do Fluxo de Conferência de Fretes

**Data:** 2026-06-12  
**Status:** Aprovado

## Contexto

O sistema atual possui dois pipelines paralelos: `viagem_status` (ABERTO → PROGRAMADO → CARREGANDO → EM_VIAGEM → FINALIZADO) e `cte_status` (PENDENTE → AGUARDANDO_NF → NF_RECEBIDA → CT_E_EMITIDO). Isso reflete uma operação onde o sistema gerenciaria o recebimento de NF-e e a solicitação de CT-e internamente.

Na operação real da Madiã, quem emite a NF-e é o cliente contratante, e o CT-e é gerado por um sistema externo da Madiã (SEFAZ). O funcionário do ALLiA Check apenas atualiza o status visual do frete. Portanto, toda a camada de checklist, upload de documentos e status secundário de CT-e é desnecessária e cria ruído operacional.

O objetivo é ter um pipeline único, linear e visualmente legível, onde o funcionário avança o frete etapa a etapa e registra o número do CT-e quando disponível.

---

## Novo Fluxo de Estados

```
ABERTO → CARREGANDO → AGUARDANDO_CTE → CTE_EMITIDO → EM_VIAGEM → FINALIZADO
```

Cancelamento permitido em qualquer estado exceto FINALIZADO.

### Regras de transição

| De | Para | Pré-requisito |
|----|------|---------------|
| Criação | ABERTO | motorista_id + veiculo_id + data_carregamento (obrigatórios no formulário) |
| ABERTO | CARREGANDO | — |
| CARREGANDO | AGUARDANDO_CTE | — |
| AGUARDANDO_CTE | CTE_EMITIDO | chave CT-e válida (44 dígitos, validação módulo 11) |
| CTE_EMITIDO | EM_VIAGEM | — |
| EM_VIAGEM | FINALIZADO | — |

---

## O que é removido

- Estado `PROGRAMADO` do enum `viagem_status`
- Campo `cte_status` e seu enum inteiro (`cte_status_enum`) da tabela `fretes`
- `ConferenceChecklist` component (`src/components/checklist/ConferenceChecklist.tsx`)
- `checklist-items.ts` (`src/lib/checklist-items.ts`)
- Rota `/api/fretes/[id]/checklist` (`src/app/api/fretes/[id]/checklist/route.ts`)
- Rota `/api/fretes/[id]/cte` (`src/app/api/fretes/[id]/cte/route.ts`)
- `DocumentUpload` component (`src/components/documentos/DocumentUpload.tsx`)
- `DocumentList` component (`src/components/documentos/DocumentList.tsx`)
- Rota `/api/documentos` (`src/app/api/documentos/route.ts`)
- Tabela `documentos` (migration de drop)
- Abas "Documentos" e "Checklist" no `FreteDetailModal`
- KPI "CT-e Pendentes" no dashboard

---

## O que é adicionado

### Banco de dados (nova migration)
- Coluna `chave_cte` (char(44), nullable) na tabela `fretes`
- Dois novos valores no enum `viagem_status`: `AGUARDANDO_CTE` e `CTE_EMITIDO`
- Remover `PROGRAMADO` do enum `viagem_status`
- Remover coluna `cte_status` da tabela `fretes`
- Drop da tabela `documentos`

### Validação
- Reutilizar `src/lib/validations/chave-nfe.ts` para validar a chave CT-e (mesmo algoritmo 44 dígitos + módulo 11) — renomear para `chave-cte.ts` ou criar alias

### State machine (`src/lib/state-machine.ts`)
- Remover `PROGRAMADO` das transições de viagem
- Remover toda a lógica de `cte_status`
- Adicionar `AGUARDANDO_CTE` e `CTE_EMITIDO` no pipeline de viagem
- A transição `AGUARDANDO_CTE → CTE_EMITIDO` recebe `chave_cte` como parâmetro obrigatório

### API de status (`src/app/api/fretes/[id]/status/route.ts`)
- Ao transicionar para `CTE_EMITIDO`: receber `chave_cte` no body, validar com o validador existente, salvar na tabela `fretes`
- Remover toda referência a `cte_status`

### Formulário de criação (`src/components/fretes/FreteFormModal.tsx`)
- `motorista_id`, `veiculo_id` e `data_carregamento` passam a ser **obrigatórios**
- Remover qualquer lógica de `PROGRAMADO`

### FreteDetailModal (`src/components/fretes/FreteDetailModal.tsx`)
- Remover abas "Documentos" e "Checklist"
- Manter abas: "Info" e "Histórico" (eventos)
- Na transição para `CTE_EMITIDO`: exibir campo inline para digitar a chave CT-e (44 dígitos) antes de confirmar
- Exibir a `chave_cte` na aba Info quando preenchida

---

## Design Visual

### Kanban (`src/components/kanban/`)
- **6 colunas:** Aberto · Carregando · Aguard. CT-e · CT-e Emitido · Em Viagem · Finalizado
- Coluna `AGUARDANDO_CTE`: borda lateral laranja (`border-left: 2px solid #f97316`) — sinaliza necessidade de ação
- Coluna `CTE_EMITIDO`: borda lateral ciana (`border-left: 2px solid #06b6d4`)
- Coluna `FINALIZADO`: cards com `opacity: 0.7` — é histórico

### Cards (`src/components/kanban/FreteCard.tsx`)
Informações exibidas:
- ID do frete (monospace, cor muted)
- Nome do cliente (destaque)
- Rota: `Origem, UF → Destino, UF`
- Motorista
- Placa + tipo de veículo
- Data de carregamento
- Valor do frete (se informado, senão `—`)
- Tipo de carga (badge roxo)
- Chave CT-e (exibida no card quando `CTE_EMITIDO` ou posterior, monospace pequeno)
- Badge "CT-e ✓" (ciano) em `CTE_EMITIDO`, `EM_VIAGEM` e `FINALIZADO`

### StatusBadge (`src/components/kanban/StatusBadge.tsx`)
Novas cores:
- `AGUARDANDO_CTE`: laranja (`#f97316`)
- `CTE_EMITIDO`: ciano (`#06b6d4`)
- Remover badges de `PROGRAMADO` e todos os `cte_status`

### KPI bar (`src/app/(dashboard)/dashboard/page.tsx`)
- Substituir "Programados" e "CT-e Pendentes" por "Aguard. CT-e" (laranja) e "CT-e Emitido" (ciano)
- 6 KPIs: Abertos · Carregando · Aguard. CT-e · CT-e Emitido · Em Viagem · Finalizados

---

## Arquivos modificados (resumo)

| Arquivo | Ação |
|---------|------|
| `supabase/migrations/00X_simplify_flow.sql` | Nova migration: novos enum values, drop colunas/tabela, add chave_cte |
| `src/lib/state-machine.ts` | Refatorar pipeline viagem, remover cte_status |
| `src/lib/validations/chave-nfe.ts` | Reutilizar para CT-e (ou criar alias `chave-cte.ts`) |
| `src/types/database.types.ts` | Regenerar via Supabase CLI após migration |
| `src/app/api/fretes/route.ts` | motorista_id, veiculo_id, data_carregamento obrigatórios no POST |
| `src/app/api/fretes/[id]/status/route.ts` | Tratar chave_cte na transição para CTE_EMITIDO, remover cte_status |
| `src/components/fretes/FreteFormModal.tsx` | Campos obrigatórios, remover lógica de PROGRAMADO |
| `src/components/fretes/FreteDetailModal.tsx` | Remover abas, adicionar input chave CT-e, exibir chave_cte |
| `src/components/kanban/KanbanBoard.tsx` | 6 colunas, remover PROGRAMADO |
| `src/components/kanban/KanbanColumn.tsx` | Bordas coloridas para AGUARDANDO_CTE e CTE_EMITIDO |
| `src/components/kanban/FreteCard.tsx` | Campos ricos, chave CT-e, badge CT-e ✓ |
| `src/components/kanban/StatusBadge.tsx` | Novas cores, remover estados obsoletos |
| `src/app/(dashboard)/dashboard/page.tsx` | KPIs atualizados |
| `src/app/(dashboard)/fretes/page.tsx` | Remover coluna CT-e status da tabela |
| **Deletar:** `src/components/checklist/ConferenceChecklist.tsx` | — |
| **Deletar:** `src/lib/checklist-items.ts` | — |
| **Deletar:** `src/components/documentos/DocumentUpload.tsx` | — |
| **Deletar:** `src/components/documentos/DocumentList.tsx` | — |
| **Deletar:** `src/app/api/fretes/[id]/checklist/route.ts` | — |
| **Deletar:** `src/app/api/fretes/[id]/cte/route.ts` | — |
| **Deletar:** `src/app/api/documentos/route.ts` | — |

---

## Verificação

1. Criar novo frete: campos motorista + veículo + data devem ser obrigatórios
2. Avançar frete ABERTO → CARREGANDO → AGUARDANDO_CTE sem pré-requisitos
3. Tentar avançar AGUARDANDO_CTE → CTE_EMITIDO sem chave: deve bloquear
4. Informar chave inválida (< 44 dígitos ou checksum errado): deve mostrar erro
5. Informar chave válida: transiciona, salva `chave_cte`, exibe no card e na aba Info
6. Avançar CTE_EMITIDO → EM_VIAGEM → FINALIZADO sem restrições
7. Kanban deve exibir 6 colunas com cores corretas
8. KPIs devem refletir os 6 estados
9. Confirmar que abas Checklist e Documentos não existem mais no modal

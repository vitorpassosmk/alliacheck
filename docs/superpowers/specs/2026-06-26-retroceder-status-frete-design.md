# Design: Retroceder etapa de frete com senha

**Data:** 2026-06-26  
**Status:** Aprovado

---

## Objetivo

Permitir que ADMIN e SUPERVISOR revertam o status de um frete para a etapa imediatamente anterior, mediante confirmação de senha, sem alterar nenhum fluxo de avanço já existente.

---

## Escopo

- Qualquer etapa pode retroceder uma posição (exceto ABERTO e CANCELADO)
- Campos preenchidos na etapa revertida são preservados (não apagados)
- Senha verificada client-side via `supabase.auth.signInWithPassword` (mesmo padrão existente)
- Evento imutável registrado a cada retrocesso

---

## Arquitetura

### 1. State machine — `src/lib/state-machine.ts`

Adicionar (sem modificar nada existente):

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

ABERTO e CANCELADO não têm entrada — tentar revertê-los retorna 422.

### 2. API — `src/app/api/fretes/[id]/reverter/route.ts` (arquivo novo)

**Método:** `POST`

**Fluxo:**
1. Valida UUID do parâmetro `id`
2. Autentica usuário via `supabase.auth.getUser()`
3. Busca papel do usuário em `public.users`
4. Rejeita com 403 se papel não for ADMIN ou SUPERVISOR
5. Busca frete por `id` (com filtro `excluido_em IS NULL`)
6. Consulta `TRANSICOES_REVERTER[frete.status]`; retorna 422 se não houver retrocesso
7. Executa `UPDATE fretes SET status = statusAnterior WHERE id = $id`
8. Insere evento na tabela `eventos`:
   - `tipo: 'STATUS_REVERT'`
   - `descricao: "Etapa retrocedida: {STATUS_ATUAL} → {STATUS_ANTERIOR}"`
   - `status_anterior: frete.status`
   - `status_novo: statusAnterior`
   - `usuario_id`, `ip_address`, `user_agent`
9. Retorna `{ ok: true, statusAnterior }`

**Sem validações de campo** — ao retroceder, nenhum campo adicional é exigido nem limpo.

### 3. UI — `src/components/fretes/FreteDetailModal.tsx`

Dois novos estados locais:
- `reverterOpen: boolean` — controla abertura do PasswordConfirmDialog
- `reverterLoading: boolean` — controla spinner durante a operação

**Botão "Retroceder etapa":**
- Visível quando: `(perfil === 'ADMIN' || perfil === 'SUPERVISOR') && status !== 'ABERTO' && status !== 'CANCELADO'`
- Estilo: `variant="outline"` com classe de cor âmbar para indicar ação de correção
- Ícone: `ChevronLeft` (lucide-react)
- Posicionado na área de ações, separado do botão de avançar

**Fluxo ao clicar:**
1. `reverterOpen = true` → abre `PasswordConfirmDialog`
2. Título: `"Retroceder etapa"`
3. Descrição: `"Digite sua senha para retroceder de {STATUS_ATUAL} para {STATUS_ANTERIOR}."`
4. Usuário digita senha → `supabase.auth.signInWithPassword({ email: user.email, password: senha })`
5. Se autenticação falha → `toast.error('Senha incorreta')`, dialog permanece aberto
6. Se autenticação ok → `POST /api/fretes/[id]/reverter`
7. Sucesso → `toast.success('Etapa revertida com sucesso')` + `queryClient.invalidateQueries(['frete', id])` + fechar dialog
8. Erro da API → `toast.error(mensagem)`, dialog fecha

### 4. Auditoria

Evento gerado automaticamente a cada retrocesso:

| Campo | Valor |
|---|---|
| `tipo` | `'STATUS_REVERT'` |
| `descricao` | `"Etapa retrocedida: CONCLUIDA → EM_VIAGEM"` |
| `status_anterior` | status antes |
| `status_novo` | status após |
| `usuario_id` | ID do usuário autenticado |
| `ip_address` | via `extractIp(request)` |
| `user_agent` | header da requisição |

A `EventTimeline` já renderiza todos os eventos sem modificação.

---

## Permissões

| Ação | ADMIN | SUPERVISOR | CONFERENTE |
|---|---|---|---|
| Retroceder status | ✓ | ✓ | — |

---

## O que NÃO muda

- `TRANSICOES_VIAGEM` — inalterado
- `validarTransicao` — inalterado
- `PATCH /api/fretes/[id]/status` — inalterado
- Todos os outros componentes e rotas — inalterados

---

## Arquivos a criar/modificar

| Arquivo | Ação |
|---|---|
| `src/lib/state-machine.ts` | Adicionar `TRANSICOES_REVERTER` |
| `src/app/api/fretes/[id]/reverter/route.ts` | Criar |
| `src/components/fretes/FreteDetailModal.tsx` | Adicionar botão + dialog |

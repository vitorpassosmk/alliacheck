export type StatusViagem =
  | 'ABERTO'
  | 'PROGRAMADO'
  | 'CARREGANDO'
  | 'EM_VIAGEM'
  | 'FINALIZADO'
  | 'CANCELADO'

export type StatusCTE =
  | 'PENDENTE'
  | 'AGUARDANDO_NF'
  | 'NF_RECEBIDA'
  | 'CT_E_EMITIDO'
  | 'CT_E_CANCELADO'

export const TRANSICOES_VIAGEM: Record<StatusViagem, StatusViagem[]> = {
  ABERTO:     ['PROGRAMADO', 'CANCELADO'],
  PROGRAMADO: ['CARREGANDO', 'ABERTO', 'CANCELADO'],
  CARREGANDO: ['EM_VIAGEM', 'PROGRAMADO'],
  EM_VIAGEM:  ['FINALIZADO'],
  FINALIZADO: [],
  CANCELADO:  [],
}

export const TRANSICOES_CTE: Record<StatusCTE, StatusCTE[]> = {
  PENDENTE:        ['AGUARDANDO_NF'],
  AGUARDANDO_NF:   ['NF_RECEBIDA', 'PENDENTE'],
  NF_RECEBIDA:     ['CT_E_EMITIDO'],
  CT_E_EMITIDO:    ['CT_E_CANCELADO'],
  CT_E_CANCELADO:  ['PENDENTE'],
}

export function validarTransicao(atual: StatusViagem, novo: StatusViagem): boolean {
  return (TRANSICOES_VIAGEM[atual] ?? []).includes(novo)
}

export function validarTransicaoCTE(atual: StatusCTE, novo: StatusCTE): boolean {
  return (TRANSICOES_CTE[atual] ?? []).includes(novo)
}

/** Retorna o novo cte_status derivado da transição de viagem, ou null se não houver impacto */
export function derivarCteStatus(novoStatus: StatusViagem, cteAtual: StatusCTE): StatusCTE | null {
  if (novoStatus === 'CARREGANDO' && cteAtual === 'PENDENTE') {
    return 'AGUARDANDO_NF'
  }
  return null
}

export const COLUNAS_KANBAN: StatusViagem[] = [
  'ABERTO',
  'PROGRAMADO',
  'CARREGANDO',
  'EM_VIAGEM',
  'FINALIZADO',
]

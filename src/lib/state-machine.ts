export type StatusViagem =
  | 'ABERTO'
  | 'CARREGANDO'
  | 'AGUARDANDO_CTE'
  | 'CTE_EMITIDO'
  | 'EM_VIAGEM'
  | 'FINALIZADO'
  | 'CANCELADO'

export const TRANSICOES_VIAGEM: Record<StatusViagem, StatusViagem[]> = {
  ABERTO:        ['CARREGANDO', 'CANCELADO'],
  CARREGANDO:    ['AGUARDANDO_CTE', 'CANCELADO'],
  AGUARDANDO_CTE: ['CTE_EMITIDO', 'CANCELADO'],
  CTE_EMITIDO:   ['EM_VIAGEM', 'CANCELADO'],
  EM_VIAGEM:     ['FINALIZADO'],
  FINALIZADO:    [],
  CANCELADO:     [],
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

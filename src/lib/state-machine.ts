export type StatusViagem =
  | 'ABERTO'
  | 'PROGRAMADO'
  | 'CARREGANDO'
  | 'CTE_EMITIDO'
  | 'AGUARDANDO_LIBERACAO'
  | 'EM_VIAGEM'
  | 'CONCLUIDA'
  | 'CANCELADO'

export const TRANSICOES_VIAGEM: Record<StatusViagem, StatusViagem[]> = {
  ABERTO:               ['PROGRAMADO', 'CANCELADO'],
  PROGRAMADO:           ['CARREGANDO', 'CANCELADO'],
  CARREGANDO:           ['CTE_EMITIDO', 'CANCELADO'],
  CTE_EMITIDO:          ['AGUARDANDO_LIBERACAO', 'CANCELADO'],
  AGUARDANDO_LIBERACAO: ['EM_VIAGEM', 'CANCELADO'],
  EM_VIAGEM:            ['CONCLUIDA'],
  CONCLUIDA:            [],
  CANCELADO:            [],
}

export function validarTransicao(atual: StatusViagem, novo: StatusViagem): boolean {
  return (TRANSICOES_VIAGEM[atual] ?? []).includes(novo)
}

export const COLUNAS_KANBAN: StatusViagem[] = [
  'ABERTO',
  'PROGRAMADO',
  'CARREGANDO',
  'CTE_EMITIDO',
  'AGUARDANDO_LIBERACAO',
  'EM_VIAGEM',
  'CONCLUIDA',
]

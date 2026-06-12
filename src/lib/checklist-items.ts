export const CHECKLIST_ITEMS = [
  'Chave NF-e conferida (44 dígitos válidos)',
  'Valor do frete confere com a nota fiscal',
  'Dados do remetente estão corretos',
  'Dados do destinatário estão corretos',
  'Tipo e peso da carga conferem',
  'Motorista autorizado para esta carga',
] as const

export type ChecklistItem = typeof CHECKLIST_ITEMS[number]

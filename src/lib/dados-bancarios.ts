interface DadosBancarios {
  banco?: string | null
  agenciaConta?: string | null
  pix?: string | null
}

export function temDadosBancarios({ banco, agenciaConta, pix }: DadosBancarios): boolean {
  return !!(banco || agenciaConta || pix)
}

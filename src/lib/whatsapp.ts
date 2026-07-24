/** Remove tudo que não é dígito e garante o prefixo DDI 55 (Brasil). Retorna null se o número não tiver um tamanho válido. */
export function normalizarTelefoneBR(raw: string): string | null {
  const digits = raw.replace(/\D/g, '')
  if (!digits) return null

  if (digits.length === 10 || digits.length === 11) {
    return `55${digits}`
  }
  if ((digits.length === 12 || digits.length === 13) && digits.startsWith('55')) {
    return digits
  }
  return null
}

/** Monta o link do WhatsApp Web/App para o número informado, ou null se o número for inválido/ausente. */
export function buildWhatsAppLink(numero?: string | null): string | null {
  if (!numero) return null
  const normalizado = normalizarTelefoneBR(numero)
  return normalizado ? `https://wa.me/${normalizado}` : null
}

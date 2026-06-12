export function validarChaveNFe(chave: string): boolean {
  const d = chave.replace(/\D/g, '')
  if (d.length !== 44) return false
  if (/^0+$/.test(d)) return false

  let sum = 0
  for (let i = 0; i < 43; i++) {
    const w = [2, 3, 4, 5, 6, 7, 8, 9][(43 - i - 1) % 8]
    sum += parseInt(d[i]) * w
  }

  const rem = sum % 11
  const dv = rem < 2 ? 0 : 11 - rem
  return dv === parseInt(d[43])
}

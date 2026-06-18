export function validarCPF(cpf: string): boolean {
  const n = cpf.replace(/\D/g, '')
  if (n.length !== 11 || /^(\d)\1+$/.test(n)) return false

  const calc = (digits: string, len: number): number => {
    let sum = 0
    for (let i = 0; i < len; i++) sum += parseInt(digits[i]) * (len + 1 - i)
    const rem = sum % 11
    return rem < 2 ? 0 : 11 - rem
  }

  return calc(n, 9) === parseInt(n[9]) && calc(n, 10) === parseInt(n[10])
}

export function formatarCPF(cpf: string): string {
  const n = cpf.replace(/\D/g, '').slice(0, 11)
  return n
    .replace(/^(\d{3})(\d)/, '$1.$2')
    .replace(/^(\d{3})\.(\d{3})(\d)/, '$1.$2.$3')
    .replace(/\.(\d{3})(\d)/, '.$1-$2')
}

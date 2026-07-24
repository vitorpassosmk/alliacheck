const FORMULA_TRIGGER_RE = /^[=+\-@\t\r]/

/**
 * Neutraliza injeção de fórmula (CSV/Excel Injection — OWASP): campos livres vindos
 * do banco (observações, nomes, etc.) podem começar com `=`, `+`, `-` ou `@`, que o
 * Excel/Sheets interpreta como início de fórmula ao abrir o arquivo. Prefixar com
 * aspas simples força o valor a ser lido como texto literal.
 */
export function sanitizarCelula(valor: string): string {
  return FORMULA_TRIGGER_RE.test(valor) ? `'${valor}` : valor
}

/** Aplica `sanitizarCelula` a todos os campos de string de um objeto (linha de planilha). */
export function sanitizarLinha<T extends Record<string, unknown>>(linha: T): T {
  const resultado = { ...linha }
  for (const chave of Object.keys(resultado) as (keyof T)[]) {
    const valor = resultado[chave]
    if (typeof valor === 'string') {
      resultado[chave] = sanitizarCelula(valor) as T[keyof T]
    }
  }
  return resultado
}

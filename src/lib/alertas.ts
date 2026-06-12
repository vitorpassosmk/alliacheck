import { differenceInDays, parseISO } from 'date-fns'

export function diasParaVencer(data: string): number {
  return differenceInDays(parseISO(data), new Date())
}

export function cnhProximaVencimento(validadeCnh: string): boolean {
  return diasParaVencer(validadeCnh) <= 30
}

export function cnhVencida(validadeCnh: string): boolean {
  return diasParaVencer(validadeCnh) < 0
}

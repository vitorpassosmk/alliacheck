import { cn } from '@/lib/utils'

type KpiBarData = {
  aberto: number
  carregando: number
  aguardandoCte: number
  cteEmitido: number
  emViagem: number
  finalizado: number
}

const CELLS: {
  key: keyof KpiBarData
  label: string
  numberClass: string
  borderClass: string
}[] = [
  { key: 'aberto',        label: 'Aberto',       numberClass: 'text-foreground',  borderClass: 'border-b-gray-300' },
  { key: 'carregando',    label: 'Carregando',   numberClass: 'text-foreground',  borderClass: 'border-b-gray-300' },
  { key: 'aguardandoCte', label: 'Aguard. CT-e', numberClass: 'text-orange-500',  borderClass: 'border-b-orange-400' },
  { key: 'cteEmitido',    label: 'CT-e Emitido', numberClass: 'text-cyan-500',    borderClass: 'border-b-cyan-400' },
  { key: 'emViagem',      label: 'Em Viagem',    numberClass: 'text-foreground',  borderClass: 'border-b-gray-300' },
  { key: 'finalizado',    label: 'Finalizado',   numberClass: 'text-green-600',   borderClass: 'border-b-green-500' },
]

interface KpiBarProps {
  data: KpiBarData
}

export function KpiBar({ data }: KpiBarProps) {
  return (
    <div className="grid grid-cols-6 rounded-lg border bg-card overflow-hidden shrink-0">
      {CELLS.map((cell, i) => (
        <div
          key={cell.key}
          className={cn(
            'flex flex-col items-center justify-center py-3 border-b-2',
            cell.borderClass,
            i < CELLS.length - 1 && 'border-r'
          )}
        >
          <span className={cn('text-3xl font-bold leading-none', cell.numberClass)}>
            {data[cell.key]}
          </span>
          <span className="text-xs text-muted-foreground mt-1">{cell.label}</span>
        </div>
      ))}
    </div>
  )
}

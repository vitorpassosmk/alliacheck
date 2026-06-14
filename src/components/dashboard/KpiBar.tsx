import { cn } from '@/lib/utils'

export type KpiBarData = {
  aberto: number
  programado: number
  carregando: number
  cteEmitido: number
  aguardandoLiberacao: number
  emViagem: number
  concluida: number
}

const CELLS: {
  key: keyof KpiBarData
  label: string
  numberClass: string
  borderClass: string
}[] = [
  { key: 'aberto',              label: 'Aberto',           numberClass: 'text-[#185FA5]',  borderClass: 'border-b-[#185FA5]' },
  { key: 'programado',          label: 'Programado',       numberClass: 'text-[#6D28D9]',  borderClass: 'border-b-[#7c3aed]' },
  { key: 'carregando',          label: 'Carregando',       numberClass: 'text-[#854F0B]',  borderClass: 'border-b-[#d97706]' },
  { key: 'cteEmitido',          label: 'CT-e Emitido',    numberClass: 'text-[#0E7490]',  borderClass: 'border-b-[#06b6d4]' },
  { key: 'aguardandoLiberacao', label: 'Aguard. Lib.',    numberClass: 'text-[#92400E]',  borderClass: 'border-b-[#d97706]' },
  { key: 'emViagem',            label: 'Em Viagem',       numberClass: 'text-[#0F6E56]',  borderClass: 'border-b-[#0F6E56]' },
  { key: 'concluida',           label: 'Concluída',       numberClass: 'text-[#3B6D11]',  borderClass: 'border-b-[#3B6D11]' },
]

interface KpiBarProps {
  data: KpiBarData
}

export function KpiBar({ data }: KpiBarProps) {
  return (
    <div className="grid grid-cols-7 rounded-lg border bg-card overflow-hidden shrink-0">
      {CELLS.map((cell, i) => (
        <div
          key={cell.key}
          className={cn(
            'flex flex-col items-center justify-center py-3 border-b-2',
            cell.borderClass,
            i < CELLS.length - 1 && 'border-r'
          )}
        >
          <span className={cn('text-2xl font-bold leading-none', cell.numberClass)}>
            {data[cell.key]}
          </span>
          <span className="text-xs text-muted-foreground mt-1">{cell.label}</span>
        </div>
      ))}
    </div>
  )
}

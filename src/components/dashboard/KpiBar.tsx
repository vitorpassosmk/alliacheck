'use client'

import { cn } from '@/lib/utils'
import {
  FileText,
  Truck,
  CheckCircle,
  XCircle,
  Package,
  Clock,
  Loader2,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

export type KpiBarData = {
  aberto: number
  programado: number
  carregando: number
  cteEmitido: number
  aguardandoLiberacao: number
  emViagem: number
  concluida: number
}

interface KpiBarProps {
  data: KpiBarData
  periodoInicio?: string
  periodoFim?: string
  onPeriodoChange?: (inicio: string, fim: string) => void
}

const CELLS: {
  key: keyof KpiBarData
  label: string
  numberClass: string
  Icon: LucideIcon
}[] = [
  { key: 'aberto',              label: 'Aberto',        numberClass: 'text-[#185FA5]', Icon: FileText  },
  { key: 'programado',          label: 'Programado',    numberClass: 'text-[#6D28D9]', Icon: Clock     },
  { key: 'carregando',          label: 'Carregando',    numberClass: 'text-[#854F0B]', Icon: Loader2   },
  { key: 'cteEmitido',          label: 'CT-e Emitido',  numberClass: 'text-[#0E7490]', Icon: Package   },
  { key: 'aguardandoLiberacao', label: 'Aguard. Lib.',  numberClass: 'text-[#92400E]', Icon: Clock     },
  { key: 'emViagem',            label: 'Em Viagem',     numberClass: 'text-[#0F6E56]', Icon: Truck     },
  { key: 'concluida',           label: 'Concluída',     numberClass: 'text-[#3B6D11]', Icon: CheckCircle },
]

export function KpiBar({ data, periodoInicio = '', periodoFim = '', onPeriodoChange }: KpiBarProps) {
  function handleInicioChange(e: React.ChangeEvent<HTMLInputElement>) {
    onPeriodoChange?.(e.target.value, periodoFim)
  }

  function handleFimChange(e: React.ChangeEvent<HTMLInputElement>) {
    onPeriodoChange?.(periodoInicio, e.target.value)
  }

  return (
    <div className="flex flex-col gap-2 shrink-0">
      {/* Filtro de período */}
      <div className="flex items-center justify-end gap-3">
        <label className="flex items-center gap-1.5 text-sm text-slate-600">
          De:
          <input
            type="date"
            value={periodoInicio}
            onChange={handleInicioChange}
            className="border border-slate-200 rounded-md px-2 py-1 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-300"
          />
        </label>
        <label className="flex items-center gap-1.5 text-sm text-slate-600">
          Até:
          <input
            type="date"
            value={periodoFim}
            onChange={handleFimChange}
            className="border border-slate-200 rounded-md px-2 py-1 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-300"
          />
        </label>
      </div>

      {/* Cards de KPI */}
      <div className="grid grid-cols-7 gap-2">
        {CELLS.map((cell) => {
          const { Icon } = cell
          return (
            <div
              key={cell.key}
              className="bg-white rounded-xl border border-slate-100 shadow-sm px-4 py-3 flex flex-col gap-1"
            >
              <span className={cn('text-2xl font-bold leading-none', cell.numberClass)}>
                {data[cell.key]}
              </span>
              <span className="flex items-center gap-1 text-xs font-medium text-slate-500 uppercase tracking-wide mt-1">
                <Icon className="w-4 h-4 shrink-0" />
                {cell.label}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

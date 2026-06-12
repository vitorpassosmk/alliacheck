import { StatusBadge } from './StatusBadge'
import { FreteCard } from './FreteCard'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'
import type { StatusViagem } from '@/lib/state-machine'
import type { Tables } from '@/types/database.types'

type FreteComRelacoes = Tables<'fretes'> & {
  clientes: Pick<Tables<'clientes'>, 'razao_social'> | null
  motoristas: Pick<Tables<'motoristas'>, 'nome'> | null
  veiculos: Pick<Tables<'veiculos'>, 'placa' | 'tipo'> | null
}

const columnBorder: Partial<Record<StatusViagem, string>> = {
  AGUARDANDO_CTE: 'border-l-[3px] border-l-[#f97316]',
  CTE_EMITIDO:    'border-l-[3px] border-l-[#06b6d4]',
}

interface KanbanColumnProps {
  status: StatusViagem
  fretes: FreteComRelacoes[]
  loading: boolean
  onCardClick: (frete: FreteComRelacoes) => void
}

export function KanbanColumn({ status, fretes, loading, onCardClick }: KanbanColumnProps) {
  return (
    <div className={cn(
      'snap-start flex-shrink-0 w-[300px] md:w-auto md:flex-1 flex flex-col gap-2 rounded-t-md',
      columnBorder[status]
    )}>
      <div className="flex items-center justify-between px-1 py-2 sticky top-0 bg-gray-50 z-10">
        <StatusBadge status={status} />
        <span className="text-xs text-muted-foreground font-medium">{fretes.length}</span>
      </div>

      <div className="flex flex-col gap-2 min-h-[100px]">
        {loading ? (
          <>
            <Skeleton className="h-28 rounded-lg" />
            <Skeleton className="h-24 rounded-lg" />
          </>
        ) : fretes.length === 0 ? (
          <div className="text-center text-xs text-muted-foreground py-8 border-2 border-dashed rounded-lg">
            Nenhum frete
          </div>
        ) : (
          fretes.map((frete) => (
            <FreteCard key={frete.id} frete={frete} onClick={onCardClick} />
          ))
        )}
      </div>
    </div>
  )
}

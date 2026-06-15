import { StatusBadge } from './StatusBadge'
import { FreteCard } from './FreteCard'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'
import type { StatusViagem } from '@/lib/state-machine'
import type { FreteComRelacoes } from '@/services/fretes.service'

const columnBorder: Partial<Record<StatusViagem, string>> = {
  CTE_EMITIDO:          'border-l-[3px] border-l-[#06b6d4]',
  AGUARDANDO_LIBERACAO: 'border-l-[3px] border-l-[#d97706]',
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
      'snap-start flex-shrink-0 w-[260px] md:w-auto md:flex-1 flex flex-col h-full rounded-t-md',
      columnBorder[status]
    )}>
      <div className="flex items-center justify-between px-1 py-2 shrink-0 bg-gray-50 rounded-t-md">
        <StatusBadge status={status} />
        <span className="text-xs text-muted-foreground font-medium">{fretes.length}</span>
      </div>

      <div className="flex flex-col gap-1.5 flex-1 min-h-0 overflow-y-auto pt-1">
        {loading ? (
          <>
            <Skeleton className="h-16 rounded-lg shrink-0" />
            <Skeleton className="h-16 rounded-lg shrink-0" />
          </>
        ) : fretes.length === 0 ? (
          <div className="text-center text-xs text-muted-foreground py-6 border-2 border-dashed rounded-lg mx-0.5">
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

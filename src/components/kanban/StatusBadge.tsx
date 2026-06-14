import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import type { StatusViagem } from '@/lib/state-machine'

const statusViagem: Record<StatusViagem, { label: string; className: string }> = {
  ABERTO:               { label: 'Aberto',            className: 'bg-[#E6F1FB] text-[#185FA5] border-[#185FA5]/20' },
  PROGRAMADO:           { label: 'Programado',         className: 'bg-[#F3EEFF] text-[#6D28D9] border-[#7c3aed]/30' },
  CARREGANDO:           { label: 'Carregando',         className: 'bg-[#FAEEDA] text-[#854F0B] border-[#854F0B]/20' },
  CTE_EMITIDO:          { label: 'CT-e Emitido',      className: 'bg-[#E0F9F9] text-[#0E7490] border-[#06b6d4]/30' },
  AGUARDANDO_LIBERACAO: { label: 'Aguard. Liberação', className: 'bg-[#FFFBEB] text-[#92400E] border-[#d97706]/30' },
  EM_VIAGEM:            { label: 'Em Viagem',         className: 'bg-[#E1F5EE] text-[#0F6E56] border-[#0F6E56]/20' },
  CONCLUIDA:            { label: 'Concluída',         className: 'bg-[#EAF3DE] text-[#3B6D11] border-[#3B6D11]/20' },
  CANCELADO:            { label: 'Cancelado',         className: 'bg-[#FCEBEB] text-[#A32D2D] border-[#A32D2D]/20' },
}

interface StatusBadgeProps {
  status: StatusViagem
  className?: string
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const config = statusViagem[status] ?? { label: status, className: '' }
  return (
    <Badge
      variant="outline"
      className={cn('font-medium text-xs', config.className, className)}
    >
      {config.label}
    </Badge>
  )
}

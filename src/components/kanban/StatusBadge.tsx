import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import type { StatusViagem, StatusCTE } from '@/lib/state-machine'

const statusViagem: Record<StatusViagem, { label: string; className: string }> = {
  ABERTO:     { label: 'Aberto',     className: 'bg-[#E6F1FB] text-[#185FA5] border-[#185FA5]/20' },
  PROGRAMADO: { label: 'Programado', className: 'bg-[#EEEDFE] text-[#534AB7] border-[#534AB7]/20' },
  CARREGANDO: { label: 'Carregando', className: 'bg-[#FAEEDA] text-[#854F0B] border-[#854F0B]/20' },
  EM_VIAGEM:  { label: 'Em Viagem',  className: 'bg-[#E1F5EE] text-[#0F6E56] border-[#0F6E56]/20' },
  FINALIZADO: { label: 'Finalizado', className: 'bg-[#EAF3DE] text-[#3B6D11] border-[#3B6D11]/20' },
  CANCELADO:  { label: 'Cancelado',  className: 'bg-[#FCEBEB] text-[#A32D2D] border-[#A32D2D]/20' },
}

const statusCTE: Record<StatusCTE, { label: string; className: string }> = {
  PENDENTE:        { label: 'Pendente',     className: 'bg-gray-100 text-gray-600 border-gray-300' },
  AGUARDANDO_NF:   { label: 'Aguard. NF',   className: 'bg-amber-100 text-amber-700 border-amber-300' },
  NF_RECEBIDA:     { label: 'NF Recebida',  className: 'bg-blue-100 text-blue-700 border-blue-300' },
  CT_E_EMITIDO:    { label: 'CT-e Emitido', className: 'bg-green-100 text-green-700 border-green-300' },
  CT_E_CANCELADO:  { label: 'CT-e Cancel.', className: 'bg-red-100 text-red-700 border-red-300' },
}

interface StatusBadgeProps {
  status: StatusViagem
  className?: string
}

interface CTEStatusBadgeProps {
  status: StatusCTE
  pulsante?: boolean
  className?: string
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const config = statusViagem[status]
  return (
    <Badge
      variant="outline"
      className={cn('font-medium text-xs', config.className, className)}
    >
      {config.label}
    </Badge>
  )
}

export function CTEStatusBadge({ status, pulsante, className }: CTEStatusBadgeProps) {
  const config = statusCTE[status]
  return (
    <Badge
      variant="outline"
      className={cn(
        'font-medium text-xs',
        config.className,
        pulsante && status === 'NF_RECEBIDA' && 'animate-pulse',
        className
      )}
    >
      {config.label}
    </Badge>
  )
}

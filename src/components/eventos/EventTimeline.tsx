import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import type { Tables } from '@/types/database.types'

const tipoLabel: Record<string, { label: string; cor: string }> = {
  FRETE_CRIADO:       { label: 'Frete criado',          cor: 'bg-blue-500' },
  STATUS_CHANGE:      { label: 'Status alterado',        cor: 'bg-violet-500' },
  CTE_STATUS_CHANGE:  { label: 'CT-e status alterado',   cor: 'bg-indigo-500' },
  DOCUMENTO_ANEXADO:  { label: 'Documento anexado',      cor: 'bg-green-500' },
  CHECKLIST_ITEM:     { label: 'Item conferido',         cor: 'bg-teal-500' },
}

interface EventTimelineProps {
  eventos: Tables<'eventos'>[]
}

export function EventTimeline({ eventos }: EventTimelineProps) {
  if (eventos.length === 0) {
    return (
      <div className="text-center py-8 text-sm text-muted-foreground">
        Nenhum evento registrado
      </div>
    )
  }

  return (
    <div className="relative space-y-4">
      {/* Linha vertical */}
      <div className="absolute left-2.5 top-3 bottom-3 w-px bg-border" />

      {eventos.map((evento) => {
        const config = tipoLabel[evento.tipo] ?? { label: evento.tipo, cor: 'bg-gray-400' }
        return (
          <div key={evento.id} className="flex gap-4 relative">
            {/* Ponto */}
            <div className={`h-5 w-5 rounded-full shrink-0 ${config.cor} z-10 mt-0.5`} />

            <div className="flex-1 pb-4">
              <div className="flex items-start justify-between gap-2">
                <div className="space-y-0.5">
                  <p className="text-sm font-medium">{config.label}</p>
                  {evento.descricao && (
                    <p className="text-sm text-muted-foreground">{evento.descricao}</p>
                  )}
                  {(evento.status_anterior || evento.status_novo) && (
                    <p className="text-xs text-muted-foreground">
                      {evento.status_anterior} → {evento.status_novo}
                    </p>
                  )}
                </div>
                <div className="text-right shrink-0">
                  <p className="text-xs text-muted-foreground">
                    {format(new Date(evento.criado_em), "dd/MM/yy HH:mm", { locale: ptBR })}
                  </p>
                  {evento.ip_address && (
                    <p className="text-xs text-muted-foreground font-mono">
                      {evento.ip_address}
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}

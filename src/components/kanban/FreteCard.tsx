'use client'

import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { MapPin } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Tables } from '@/types/database.types'
import type { StatusViagem } from '@/lib/state-machine'

type FreteComRelacoes = Tables<'fretes'> & {
  clientes: Pick<Tables<'clientes'>, 'razao_social'> | null
  motoristas: Pick<Tables<'motoristas'>, 'nome'> | null
  veiculos: Pick<Tables<'veiculos'>, 'placa' | 'tipo'> | null
}

const CTE_STATES: StatusViagem[] = ['CTE_EMITIDO', 'EM_VIAGEM', 'FINALIZADO']

interface FreteCardProps {
  frete: FreteComRelacoes
  onClick: (frete: FreteComRelacoes) => void
}

export function FreteCard({ frete, onClick }: FreteCardProps) {
  const idCurto = frete.id.slice(-6).toUpperCase()
  const status = frete.status as StatusViagem
  const showCteBadge = CTE_STATES.includes(status)
  const isFinished = status === 'FINALIZADO'

  return (
    <Card
      className={cn(
        'cursor-pointer hover:shadow-md transition-shadow border shrink-0',
        isFinished && 'opacity-70'
      )}
      onClick={() => onClick(frete)}
    >
      <CardContent className="p-2.5 space-y-1">
        <div className="flex items-center justify-between gap-1">
          <span className="text-[11px] font-mono text-muted-foreground">#{idCurto}</span>
          {showCteBadge && (
            <Badge variant="outline" className="text-[10px] px-1 py-0 bg-[#E0F9F9] text-[#0E7490] border-[#06b6d4]/30">
              CT-e ✓
            </Badge>
          )}
        </div>

        {frete.clientes && (
          <p className="text-sm font-medium truncate leading-tight">{frete.clientes.razao_social}</p>
        )}

        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          <MapPin className="h-3 w-3 shrink-0" />
          <span className="truncate">
            {frete.origem_cidade}/{frete.origem_uf} → {frete.destino_cidade}/{frete.destino_uf}
          </span>
        </div>
      </CardContent>
    </Card>
  )
}

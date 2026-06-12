'use client'

import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { MapPin, User, Truck, Calendar } from 'lucide-react'
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
        'cursor-pointer hover:shadow-md transition-shadow border',
        isFinished && 'opacity-70'
      )}
      onClick={() => onClick(frete)}
    >
      <CardContent className="p-3 space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs font-mono text-muted-foreground">#{idCurto}</span>
          {showCteBadge && (
            <Badge variant="outline" className="text-xs bg-[#E0F9F9] text-[#0E7490] border-[#06b6d4]/30">
              CT-e ✓
            </Badge>
          )}
        </div>

        {frete.clientes && (
          <p className="text-sm font-medium truncate">{frete.clientes.razao_social}</p>
        )}

        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          <MapPin className="h-3 w-3 shrink-0" />
          <span className="truncate">
            {frete.origem_cidade}/{frete.origem_uf} → {frete.destino_cidade}/{frete.destino_uf}
          </span>
        </div>

        {frete.motoristas && (
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <User className="h-3 w-3 shrink-0" />
            <span className="truncate">{frete.motoristas.nome}</span>
          </div>
        )}

        {frete.veiculos && (
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Truck className="h-3 w-3 shrink-0" />
            <span>{frete.veiculos.placa} · {frete.veiculos.tipo}</span>
          </div>
        )}

        {frete.data_carregamento && (
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Calendar className="h-3 w-3 shrink-0" />
            <span>Carregamento: {new Date(frete.data_carregamento + 'T00:00:00').toLocaleDateString('pt-BR')}</span>
          </div>
        )}

        {frete.valor_frete ? (
          <p className="text-xs text-muted-foreground">
            R$ {frete.valor_frete.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </p>
        ) : (
          <p className="text-xs text-muted-foreground">—</p>
        )}


        {showCteBadge && frete.chave_cte && (
          <p className="text-[9px] font-mono text-muted-foreground leading-tight whitespace-normal break-all">
            {frete.chave_cte.replace(/(.{11})/g, '$1 ').trim()}
          </p>
        )}
      </CardContent>
    </Card>
  )
}

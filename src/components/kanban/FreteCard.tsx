'use client'

import { Card, CardContent } from '@/components/ui/card'
import { CTEStatusBadge } from './StatusBadge'
import { MapPin, User, Truck } from 'lucide-react'
import type { Tables } from '@/types/database.types'

type FreteComRelacoes = Tables<'fretes'> & {
  clientes: Pick<Tables<'clientes'>, 'razao_social'> | null
  motoristas: Pick<Tables<'motoristas'>, 'nome'> | null
  veiculos: Pick<Tables<'veiculos'>, 'placa' | 'tipo'> | null
}

interface FreteCardProps {
  frete: FreteComRelacoes
  onClick: (frete: FreteComRelacoes) => void
}

export function FreteCard({ frete, onClick }: FreteCardProps) {
  const idCurto = frete.id.slice(-6).toUpperCase()

  return (
    <Card
      className="cursor-pointer hover:shadow-md transition-shadow border"
      onClick={() => onClick(frete)}
    >
      <CardContent className="p-3 space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs font-mono text-muted-foreground">#{idCurto}</span>
          <CTEStatusBadge status={frete.cte_status} pulsante />
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
          <p className="text-xs text-muted-foreground">
            Carregamento: {new Date(frete.data_carregamento + 'T00:00:00').toLocaleDateString('pt-BR')}
          </p>
        )}
      </CardContent>
    </Card>
  )
}

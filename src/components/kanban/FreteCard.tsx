'use client'

import { Card, CardContent } from '@/components/ui/card'
import { MapPin, Calendar, Package, DollarSign, User } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { StatusViagem } from '@/lib/state-machine'
import type { FreteComRelacoes } from '@/services/fretes.service'

interface FreteCardProps {
  frete: FreteComRelacoes
  onClick: (frete: FreteComRelacoes) => void
}

export function FreteCard({ frete, onClick }: FreteCardProps) {
  const status = frete.status as StatusViagem

  if (status === 'ABERTO') {
    return <FreteCardAberto frete={frete} onClick={onClick} />
  }
  if (status === 'AGUARDANDO_LIBERACAO') {
    return <FreteCardLiberacao frete={frete} onClick={onClick} />
  }
  return <FreteCardCompacto frete={frete} onClick={onClick} />
}

// ─── Card destacado para ABERTO ──────────────────────────────────────────────

function FreteCardAberto({ frete, onClick }: FreteCardProps) {
  return (
    <Card
      className="cursor-pointer hover:shadow-lg transition-shadow border-l-4 border-l-[#185FA5] shrink-0"
      onClick={() => onClick(frete)}
    >
      <CardContent className="p-3 space-y-2">
        {/* Número do frete em destaque */}
        <div className="flex items-center justify-between">
          <span className="text-base font-bold font-mono text-[#185FA5]">{frete.numero_frete}</span>
        </div>

        {/* Rota */}
        <div className="flex items-center gap-1.5 text-sm font-medium">
          <MapPin className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
          <span className="truncate">
            {frete.origem_cidade}/{frete.origem_uf} → {frete.destino_cidade}/{frete.destino_uf}
          </span>
        </div>

        {/* Tipo de produto */}
        {frete.tipo_produto && (
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Package className="h-3 w-3 shrink-0" />
            <span className="truncate">{frete.tipo_produto}</span>
          </div>
        )}

        {/* Valor da mercadoria */}
        {frete.valor_mercadoria && (
          <div className="flex items-center gap-1.5 text-xs font-medium text-emerald-700">
            <DollarSign className="h-3 w-3 shrink-0" />
            <span>R$ {frete.valor_mercadoria.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
          </div>
        )}

        {/* Data de carregamento */}
        {frete.data_carregamento && (
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Calendar className="h-3 w-3 shrink-0" />
            <span>{new Date(frete.data_carregamento + 'T00:00:00').toLocaleDateString('pt-BR')}</span>
          </div>
        )}

        {frete.clientes && (
          <p className="text-xs text-muted-foreground truncate border-t pt-1.5">{frete.clientes.razao_social}</p>
        )}
      </CardContent>
    </Card>
  )
}

// ─── Card com indicador de liberação pendente ────────────────────────────────

function FreteCardLiberacao({ frete, onClick }: FreteCardProps) {
  return (
    <Card
      className="cursor-pointer hover:shadow-md transition-shadow border border-amber-300 bg-amber-50 shrink-0"
      onClick={() => onClick(frete)}
    >
      <CardContent className="p-2.5 space-y-1.5">
        <div className="flex items-center justify-between gap-1">
          <span className="text-xs font-mono font-semibold text-amber-800">{frete.numero_frete}</span>
          <span className="text-[10px] bg-amber-200 text-amber-800 px-1.5 py-0.5 rounded-full font-medium">
            Pag. pendente
          </span>
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
        {frete.data_carregamento && (
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Calendar className="h-3 w-3 shrink-0" />
            <span>{new Date(frete.data_carregamento + 'T00:00:00').toLocaleDateString('pt-BR')}</span>
          </div>
        )}
        {frete.valor_mercadoria && (
          <div className="flex items-center gap-1 text-xs font-medium text-emerald-700">
            <DollarSign className="h-3 w-3 shrink-0" />
            <span>R$ {frete.valor_mercadoria.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// ─── Card compacto (todos os outros estados) ─────────────────────────────────

function FreteCardCompacto({ frete, onClick }: FreteCardProps) {
  const status = frete.status as StatusViagem
  const isConcluida = status === 'CONCLUIDA'

  return (
    <Card
      className={cn(
        'cursor-pointer hover:shadow-md transition-shadow border shrink-0',
        isConcluida && 'opacity-70'
      )}
      onClick={() => onClick(frete)}
    >
      <CardContent className="p-2.5 space-y-1">
        <span className="text-[11px] font-mono text-muted-foreground">{frete.numero_frete}</span>

        {frete.clientes && (
          <p className="text-sm font-medium truncate leading-tight">{frete.clientes.razao_social}</p>
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

        {frete.data_carregamento && (
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Calendar className="h-3 w-3 shrink-0" />
            <span>{new Date(frete.data_carregamento + 'T00:00:00').toLocaleDateString('pt-BR')}</span>
          </div>
        )}

        {frete.valor_mercadoria && (
          <div className="flex items-center gap-1 text-xs font-medium text-emerald-700">
            <DollarSign className="h-3 w-3 shrink-0" />
            <span>R$ {frete.valor_mercadoria.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

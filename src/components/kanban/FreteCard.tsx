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

function DataLabel({ frete }: { frete: FreteComRelacoes }) {
  const status = frete.status as StatusViagem

  if (status === 'CONCLUIDA') {
    if (!frete.data_entrega_real) return null
    return (
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <Calendar className="h-3 w-3 shrink-0" />
        <span>Descarga: {new Date(frete.data_entrega_real + 'T00:00:00').toLocaleDateString('pt-BR')}</span>
      </div>
    )
  }

  const mostrarEntrega = status === 'EM_VIAGEM'
  const data = mostrarEntrega ? frete.data_entrega_prevista : frete.data_carregamento
  const label = mostrarEntrega ? 'Prev. entrega:' : 'Carregamento:'

  if (!data) return null
  return (
    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
      <Calendar className="h-3 w-3 shrink-0" />
      <span>{label} {new Date(data + 'T00:00:00').toLocaleDateString('pt-BR')}</span>
    </div>
  )
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
        {/* Item 4: PEDIDO em bold */}
        <div className="flex items-center justify-between">
          <span className="text-sm font-bold tracking-wide text-[#185FA5]">
            PEDIDO: {frete.numero_frete}
          </span>
        </div>

        {/* Rota */}
        <div className="flex items-center gap-1.5 text-sm font-medium">
          <MapPin className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
          <span className="truncate">
            {frete.origem_cidade}/{frete.origem_uf} → {frete.destino_cidade}/{frete.destino_uf}
          </span>
        </div>

        {frete.tipo_produto && (
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Package className="h-3 w-3 shrink-0" />
            <span className="truncate">{frete.tipo_produto}</span>
          </div>
        )}

        {frete.valor_mercadoria && (
          <div className="flex items-center gap-1.5 text-xs font-medium text-emerald-700">
            <DollarSign className="h-3 w-3 shrink-0" />
            <span>R$ {frete.valor_mercadoria.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
          </div>
        )}

        <DataLabel frete={frete} />

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
          {/* Item 4: PEDIDO em bold */}
          <span className="text-xs font-bold tracking-wide text-amber-800">
            PEDIDO: {frete.numero_frete}
          </span>
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
        {frete.motoristas?.cpf && (
          <p className="text-xs text-muted-foreground pl-4 truncate">CPF: {frete.motoristas.cpf}</p>
        )}
        <DataLabel frete={frete} />
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
        {/* Item 4: PEDIDO em bold */}
        <span className="text-xs font-bold tracking-wide text-foreground">
          PEDIDO: {frete.numero_frete}
        </span>

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
        {frete.motoristas?.cpf && (
          <p className="text-xs text-muted-foreground pl-4 truncate">CPF: {frete.motoristas.cpf}</p>
        )}

        <DataLabel frete={frete} />

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

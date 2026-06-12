'use client'

import { useEffect, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { COLUNAS_KANBAN } from '@/lib/state-machine'
import { KanbanColumn } from './KanbanColumn'
import type { Tables } from '@/types/database.types'
import type { StatusViagem } from '@/lib/state-machine'

type FreteComRelacoes = Tables<'fretes'> & {
  clientes: Pick<Tables<'clientes'>, 'razao_social'> | null
  motoristas: Pick<Tables<'motoristas'>, 'nome'> | null
  veiculos: Pick<Tables<'veiculos'>, 'placa' | 'tipo'> | null
}

interface KanbanBoardProps {
  onCardClick: (frete: FreteComRelacoes) => void
}

async function fetchFretes(supabase: ReturnType<typeof createClient>) {
  const { data, error } = await supabase
    .from('fretes')
    .select(`
      *,
      clientes(razao_social),
      motoristas(nome),
      veiculos(placa, tipo)
    `)
    .neq('status', 'CANCELADO')
    .order('criado_em', { ascending: false })

  if (error) throw error
  return (data ?? []) as FreteComRelacoes[]
}

export function KanbanBoard({ onCardClick }: KanbanBoardProps) {
  const supabase = createClient()
  const queryClient = useQueryClient()

  const { data: fretes = [], isLoading } = useQuery({
    queryKey: ['fretes'],
    queryFn: () => fetchFretes(supabase),
  })

  // Realtime subscription
  useEffect(() => {
    const channel = supabase
      .channel('fretes-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'fretes' },
        () => queryClient.invalidateQueries({ queryKey: ['fretes'] })
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [queryClient, supabase])

  const fretesPorStatus = COLUNAS_KANBAN.reduce<Record<StatusViagem, FreteComRelacoes[]>>(
    (acc, status) => {
      acc[status] = fretes.filter((f) => f.status === status)
      return acc
    },
    {} as Record<StatusViagem, FreteComRelacoes[]>
  )

  return (
    <div className="flex gap-3 overflow-x-auto snap-x snap-mandatory h-full pb-2">
      {COLUNAS_KANBAN.map((status) => (
        <KanbanColumn
          key={status}
          status={status}
          fretes={fretesPorStatus[status]}
          loading={isLoading}
          onCardClick={onCardClick}
        />
      ))}
    </div>
  )
}

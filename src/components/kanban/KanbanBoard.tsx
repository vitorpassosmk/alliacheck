'use client'

import { useEffect } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { COLUNAS_KANBAN } from '@/lib/state-machine'
import { KanbanColumn } from './KanbanColumn'
import type { FreteComRelacoes } from '@/services/fretes.service'
import type { StatusViagem } from '@/lib/state-machine'

interface KanbanBoardProps {
  onCardClick: (frete: FreteComRelacoes) => void
}

async function fetchFretes(supabase: ReturnType<typeof createClient>) {
  const { data, error } = await supabase
    .from('fretes')
    .select(`
      *,
      clientes(razao_social),
      motoristas(nome, cnh, validade_cnh, banco, agencia_conta, chave_pix),
      veiculos(placa, tipo, banco_proprietario, agencia_conta_proprietario, chave_pix_proprietario)
    `)
    .neq('status', 'CANCELADO')
    .or('status.neq.CONCLUIDA,pago_em.is.null')
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

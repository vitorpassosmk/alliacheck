'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { KanbanBoard } from '@/components/kanban/KanbanBoard'
import { FreteDetailModal } from '@/components/fretes/FreteDetailModal'
import { FreteFormModal } from '@/components/fretes/FreteFormModal'
import { KpiBar, type KpiBarData } from '@/components/dashboard/KpiBar'
import { Button } from '@/components/ui/button'
import { Plus } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'
import type { FreteComRelacoes } from '@/services/fretes.service'

function calcularKpis(fretes: FreteComRelacoes[]): KpiBarData {
  return {
    aberto:               fretes.filter((f) => f.status === 'ABERTO').length,
    programado:           fretes.filter((f) => f.status === 'PROGRAMADO').length,
    carregando:           fretes.filter((f) => f.status === 'CARREGANDO').length,
    cteEmitido:           fretes.filter((f) => f.status === 'CTE_EMITIDO').length,
    aguardandoLiberacao:  fretes.filter((f) => f.status === 'AGUARDANDO_LIBERACAO').length,
    emViagem:             fretes.filter((f) => f.status === 'EM_VIAGEM').length,
    concluida:            fretes.filter((f) => f.status === 'CONCLUIDA').length,
  }
}

export default function DashboardPage() {
  const [freteDetalhe, setFreteDetalhe] = useState<FreteComRelacoes | null>(null)
  const [novoFreteOpen, setNovoFreteOpen] = useState(false)

  const { data: fretes, isLoading } = useQuery<FreteComRelacoes[]>({
    queryKey: ['fretes'],
    queryFn: () => fetch('/api/fretes').then((r) => r.json()),
  })

  const kpis = fretes ? calcularKpis(fretes) : null

  return (
    <div className="flex flex-col h-full gap-3 min-h-0">
      <div className="flex items-center justify-between shrink-0">
        <div>
          <h1 className="text-xl font-semibold">Dashboard</h1>
          <p className="text-sm text-muted-foreground">Visão geral da operação em tempo real</p>
        </div>
        <Button onClick={() => setNovoFreteOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Novo Frete
        </Button>
      </div>

      {isLoading ? (
        <Skeleton className="h-[88px] w-full rounded-lg shrink-0" />
      ) : kpis ? (
        <KpiBar data={kpis} />
      ) : null}

      <div className="flex-1 min-h-0">
        <KanbanBoard onCardClick={setFreteDetalhe} />
      </div>

      {freteDetalhe && (
        <FreteDetailModal
          freteId={freteDetalhe.id}
          open={!!freteDetalhe}
          onClose={() => setFreteDetalhe(null)}
        />
      )}

      <FreteFormModal
        open={novoFreteOpen}
        onClose={() => setNovoFreteOpen(false)}
      />
    </div>
  )
}

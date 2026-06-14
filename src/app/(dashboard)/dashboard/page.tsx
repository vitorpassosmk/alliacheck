'use client'

import { useState, useMemo } from 'react'
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

function filtrarPorPeriodo(
  fretes: FreteComRelacoes[],
  inicio: string,
  fim: string,
): FreteComRelacoes[] {
  if (!inicio && !fim) return fretes

  return fretes.filter((f) => {
    // Usa criado_em como referência de data do frete
    const dataCriacao = f.criado_em ? f.criado_em.slice(0, 10) : null
    if (!dataCriacao) return true

    if (inicio && dataCriacao < inicio) return false
    if (fim && dataCriacao > fim) return false
    return true
  })
}

export default function DashboardPage() {
  const [freteDetalhe, setFreteDetalhe] = useState<FreteComRelacoes | null>(null)
  const [novoFreteOpen, setNovoFreteOpen] = useState(false)
  const [periodoInicio, setPeriodoInicio] = useState('')
  const [periodoFim, setPeriodoFim] = useState('')

  const { data: fretes, isLoading } = useQuery<FreteComRelacoes[]>({
    queryKey: ['fretes'],
    queryFn: () => fetch('/api/fretes').then((r) => r.json()),
  })

  const fretesFiltrados = useMemo(() => {
    if (!fretes) return null
    return filtrarPorPeriodo(fretes, periodoInicio, periodoFim)
  }, [fretes, periodoInicio, periodoFim])

  const kpis = fretesFiltrados ? calcularKpis(fretesFiltrados) : null

  function handlePeriodoChange(inicio: string, fim: string) {
    setPeriodoInicio(inicio)
    setPeriodoFim(fim)
  }

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
        <KpiBar
          data={kpis}
          periodoInicio={periodoInicio}
          periodoFim={periodoFim}
          onPeriodoChange={handlePeriodoChange}
        />
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

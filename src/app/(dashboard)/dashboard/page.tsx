'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { KanbanBoard } from '@/components/kanban/KanbanBoard'
import { FreteDetailModal } from '@/components/fretes/FreteDetailModal'
import { FreteFormModal } from '@/components/fretes/FreteFormModal'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Plus, Package, Truck, AlertCircle, CheckCircle2, TrendingUp } from 'lucide-react'
import type { Tables } from '@/types/database.types'
import type { FreteComRelacoes } from '@/services/fretes.service'

type KpiData = {
  aberto: number
  programado: number
  emViagem: number
  finalizado: number
  ctesPendentes: number
  totalHoje: number
}

function calcularKpis(fretes: FreteComRelacoes[]): KpiData {
  const hoje = new Date().toISOString().slice(0, 10)
  return {
    aberto: fretes.filter((f) => f.status === 'ABERTO').length,
    programado: fretes.filter((f) => f.status === 'PROGRAMADO').length,
    emViagem: fretes.filter((f) => f.status === 'EM_VIAGEM').length,
    finalizado: fretes.filter((f) => f.status === 'FINALIZADO').length,
    ctesPendentes: fretes.filter(
      (f) => f.cte_status === 'PENDENTE' && f.status !== 'CANCELADO'
    ).length,
    totalHoje: fretes.filter((f) => f.criado_em.slice(0, 10) === hoje).length,
  }
}

function KpiCard({
  title,
  value,
  icon: Icon,
  description,
  variant = 'default',
}: {
  title: string
  value: number | string
  icon: React.ElementType
  description?: string
  variant?: 'default' | 'warning' | 'success'
}) {
  const colors = {
    default: 'text-muted-foreground',
    warning: 'text-orange-500',
    success: 'text-green-600',
  }
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className={`h-4 w-4 ${colors[variant]}`} />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        {description && (
          <p className="text-xs text-muted-foreground mt-1">{description}</p>
        )}
      </CardContent>
    </Card>
  )
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
    <div className="flex flex-col h-full gap-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Dashboard</h1>
          <p className="text-sm text-muted-foreground">Visão geral da operação em tempo real</p>
        </div>
        <Button onClick={() => setNovoFreteOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Novo Frete
        </Button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {isLoading ? (
          Array.from({ length: 6 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="pt-6">
                <Skeleton className="h-8 w-12 mb-2" />
                <Skeleton className="h-4 w-20" />
              </CardContent>
            </Card>
          ))
        ) : (
          <>
            <KpiCard
              title="Abertos"
              value={kpis?.aberto ?? 0}
              icon={Package}
              description="Aguardando programação"
            />
            <KpiCard
              title="Programados"
              value={kpis?.programado ?? 0}
              icon={Truck}
              description="Com motorista e veículo"
            />
            <KpiCard
              title="Em Viagem"
              value={kpis?.emViagem ?? 0}
              icon={TrendingUp}
              description="Em trânsito"
              variant="default"
            />
            <KpiCard
              title="Finalizados"
              value={kpis?.finalizado ?? 0}
              icon={CheckCircle2}
              description="Concluídos"
              variant="success"
            />
            <KpiCard
              title="CT-e Pendentes"
              value={kpis?.ctesPendentes ?? 0}
              icon={AlertCircle}
              description="Aguardam emissão"
              variant={kpis && kpis.ctesPendentes > 0 ? 'warning' : 'default'}
            />
            <KpiCard
              title="Criados Hoje"
              value={kpis?.totalHoje ?? 0}
              icon={Plus}
              description="Novos fretes"
            />
          </>
        )}
      </div>

      {/* Kanban */}
      <div className="flex-1 overflow-hidden">
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

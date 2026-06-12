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
  carregando: number
  aguardandoCte: number
  cteEmitido: number
  emViagem: number
  finalizado: number
}

function calcularKpis(fretes: FreteComRelacoes[]): KpiData {
  return {
    aberto:        fretes.filter((f) => f.status === 'ABERTO').length,
    carregando:    fretes.filter((f) => f.status === 'CARREGANDO').length,
    aguardandoCte: fretes.filter((f) => f.status === 'AGUARDANDO_CTE').length,
    cteEmitido:    fretes.filter((f) => f.status === 'CTE_EMITIDO').length,
    emViagem:      fretes.filter((f) => f.status === 'EM_VIAGEM').length,
    finalizado:    fretes.filter((f) => f.status === 'FINALIZADO').length,
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
              description="Aguardando carregamento"
            />
            <KpiCard
              title="Carregando"
              value={kpis?.carregando ?? 0}
              icon={Truck}
              description="Em carregamento"
            />
            <KpiCard
              title="Aguard. CT-e"
              value={kpis?.aguardandoCte ?? 0}
              icon={AlertCircle}
              description="Aguardam emissão CT-e"
              variant={kpis && kpis.aguardandoCte > 0 ? 'warning' : 'default'}
            />
            <KpiCard
              title="CT-e Emitido"
              value={kpis?.cteEmitido ?? 0}
              icon={CheckCircle2}
              description="CT-e registrado"
            />
            <KpiCard
              title="Em Viagem"
              value={kpis?.emViagem ?? 0}
              icon={TrendingUp}
              description="Em trânsito"
            />
            <KpiCard
              title="Finalizados"
              value={kpis?.finalizado ?? 0}
              icon={CheckCircle2}
              description="Concluídos"
              variant="success"
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

'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { StatusBadge, CTEStatusBadge } from '@/components/kanban/StatusBadge'
import { DocumentUpload } from '@/components/documentos/DocumentUpload'
import { DocumentList } from '@/components/documentos/DocumentList'
import { ConferenceChecklist } from '@/components/checklist/ConferenceChecklist'
import { EventTimeline } from '@/components/eventos/EventTimeline'
import { FreteFormModal } from './FreteFormModal'
import { TRANSICOES_VIAGEM } from '@/lib/state-machine'
import { toast } from 'sonner'
import { MapPin, User, Truck, Calendar, Edit, AlertTriangle } from 'lucide-react'
import type { Tables } from '@/types/database.types'
import type { StatusViagem } from '@/lib/state-machine'

type FreteCompleto = Tables<'fretes'> & {
  clientes: Tables<'clientes'> | null
  motoristas: Tables<'motoristas'> | null
  veiculos: Tables<'veiculos'> | null
  documentos: Tables<'documentos'>[]
  eventos: Tables<'eventos'>[]
}

const statusLabel: Record<StatusViagem, string> = {
  ABERTO: 'Programar',
  PROGRAMADO: 'Iniciar Carregamento',
  CARREGANDO: 'Iniciar Viagem',
  EM_VIAGEM: 'Finalizar',
  FINALIZADO: '',
  CANCELADO: '',
}

interface FreteDetailModalProps {
  freteId: string
  open: boolean
  onClose: () => void
}

export function FreteDetailModal({ freteId, open, onClose }: FreteDetailModalProps) {
  const queryClient = useQueryClient()
  const [editOpen, setEditOpen] = useState(false)
  const [cancelando, setCancelando] = useState(false)

  const { data: frete, isLoading } = useQuery<FreteCompleto>({
    queryKey: ['frete', freteId],
    queryFn: () => fetch(`/api/fretes/${freteId}`).then(r => r.json()),
    enabled: open,
  })

  const avancarStatus = useMutation({
    mutationFn: async (novoStatus: StatusViagem) => {
      const res = await fetch(`/api/fretes/${freteId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: novoStatus }),
      })
      if (!res.ok) throw new Error((await res.json()).error ?? 'Erro ao avançar status')
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['frete', freteId] })
      queryClient.invalidateQueries({ queryKey: ['fretes'] })
      toast.success('Status atualizado')
    },
    onError: (e: Error) => toast.error(e.message),
  })

  const cancelar = useMutation({
    mutationFn: async (motivo: string) => {
      const res = await fetch(`/api/fretes/${freteId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'CANCELADO', motivo }),
      })
      if (!res.ok) throw new Error((await res.json()).error ?? 'Erro ao cancelar')
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['frete', freteId] })
      queryClient.invalidateQueries({ queryKey: ['fretes'] })
      toast.success('Frete cancelado')
      setCancelando(false)
    },
    onError: (e: Error) => toast.error(e.message),
  })

  const proximos = frete ? (TRANSICOES_VIAGEM[frete.status] ?? []).filter(s => s !== 'CANCELADO') : []
  const podeAvancar = proximos.length > 0
  const nextStatus = proximos[0] as StatusViagem | undefined

  return (
    <>
      <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          {isLoading || !frete ? (
            <div className="space-y-4 p-2">
              <Skeleton className="h-8 w-48" />
              <Skeleton className="h-24 rounded-lg" />
              <Skeleton className="h-48 rounded-lg" />
            </div>
          ) : (
            <>
              <DialogHeader>
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-1">
                    <DialogTitle className="flex items-center gap-2">
                      Frete #{frete.id.slice(-6).toUpperCase()}
                      <StatusBadge status={frete.status} />
                    </DialogTitle>
                    <div className="flex items-center gap-2">
                      <CTEStatusBadge status={frete.cte_status} pulsante />
                      {frete.clientes && (
                        <span className="text-sm text-muted-foreground">
                          {frete.clientes.razao_social}
                        </span>
                      )}
                    </div>
                  </div>
                  <Button variant="ghost" size="icon" onClick={() => setEditOpen(true)}>
                    <Edit className="h-4 w-4" />
                  </Button>
                </div>
              </DialogHeader>

              {/* Resumo */}
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <MapPin className="h-4 w-4 shrink-0" />
                  <span>{frete.origem_cidade}/{frete.origem_uf} → {frete.destino_cidade}/{frete.destino_uf}</span>
                </div>
                {frete.motoristas && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <User className="h-4 w-4 shrink-0" />
                    <span>{frete.motoristas.nome}</span>
                  </div>
                )}
                {frete.veiculos && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Truck className="h-4 w-4 shrink-0" />
                    <span>{frete.veiculos.placa} — {frete.veiculos.tipo}</span>
                  </div>
                )}
                {frete.data_carregamento && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Calendar className="h-4 w-4 shrink-0" />
                    <span>Carregamento: {new Date(frete.data_carregamento + 'T00:00:00').toLocaleDateString('pt-BR')}</span>
                  </div>
                )}
                {frete.valor_frete && (
                  <div className="text-muted-foreground">
                    Frete: R$ {frete.valor_frete.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </div>
                )}
              </div>

              {/* Ações de status */}
              {frete.status !== 'FINALIZADO' && frete.status !== 'CANCELADO' && (
                <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                  {podeAvancar && nextStatus && (
                    <Button
                      size="sm"
                      onClick={() => avancarStatus.mutate(nextStatus)}
                      disabled={avancarStatus.isPending}
                    >
                      {statusLabel[frete.status] || `Avançar para ${nextStatus}`}
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => setCancelando(true)}
                    disabled={cancelando}
                  >
                    <AlertTriangle className="h-3 w-3 mr-1" />
                    Cancelar Frete
                  </Button>
                </div>
              )}

              {cancelando && (
                <CancelForm
                  onConfirm={(motivo) => cancelar.mutate(motivo)}
                  onCancel={() => setCancelando(false)}
                  loading={cancelar.isPending}
                />
              )}

              {/* Tabs */}
              <Tabs defaultValue="documentos">
                <TabsList className="w-full">
                  <TabsTrigger value="documentos" className="flex-1">
                    Documentos ({frete.documentos?.length ?? 0})
                  </TabsTrigger>
                  <TabsTrigger value="checklist" className="flex-1">Conferência CT-e</TabsTrigger>
                  <TabsTrigger value="historico" className="flex-1">Histórico</TabsTrigger>
                </TabsList>

                <TabsContent value="documentos" className="space-y-4 mt-4">
                  <DocumentUpload freteId={freteId} onSuccess={() =>
                    queryClient.invalidateQueries({ queryKey: ['frete', freteId] })
                  } />
                  <DocumentList documentos={frete.documentos ?? []} />
                </TabsContent>

                <TabsContent value="checklist" className="mt-4">
                  <ConferenceChecklist freteId={freteId} cteStatus={frete.cte_status} />
                </TabsContent>

                <TabsContent value="historico" className="mt-4">
                  <EventTimeline eventos={frete.eventos ?? []} />
                </TabsContent>
              </Tabs>
            </>
          )}
        </DialogContent>
      </Dialog>

      <FreteFormModal
        open={editOpen}
        onClose={() => setEditOpen(false)}
        freteId={freteId}
      />
    </>
  )
}

function CancelForm({
  onConfirm,
  onCancel,
  loading,
}: {
  onConfirm: (motivo: string) => void
  onCancel: () => void
  loading: boolean
}) {
  const [motivo, setMotivo] = useState('')

  return (
    <div className="p-3 border border-destructive/30 rounded-lg bg-destructive/5 space-y-3">
      <p className="text-sm font-medium text-destructive">Confirmar cancelamento</p>
      <textarea
        className="w-full text-sm border rounded-md p-2 min-h-[60px]"
        placeholder="Motivo do cancelamento (obrigatório)"
        value={motivo}
        onChange={(e) => setMotivo(e.target.value)}
      />
      <div className="flex gap-2">
        <Button
          size="sm"
          variant="destructive"
          onClick={() => onConfirm(motivo)}
          disabled={!motivo.trim() || loading}
        >
          Confirmar
        </Button>
        <Button size="sm" variant="outline" onClick={onCancel}>Voltar</Button>
      </div>
    </div>
  )
}

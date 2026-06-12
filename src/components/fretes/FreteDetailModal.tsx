'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { StatusBadge } from '@/components/kanban/StatusBadge'
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
  eventos: Tables<'eventos'>[]
  chave_cte?: string | null
}

const statusLabel: Record<StatusViagem, string> = {
  ABERTO: 'Iniciar Carregamento',
  CARREGANDO: 'Aguardar CT-e',
  AGUARDANDO_CTE: 'Registrar CT-e',
  CTE_EMITIDO: 'Iniciar Viagem',
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
  const [chaveCte, setChaveCte] = useState('')
  const [chaveCteError, setChaveCteError] = useState('')

  const { data: frete, isLoading } = useQuery<FreteCompleto>({
    queryKey: ['frete', freteId],
    queryFn: () => fetch(`/api/fretes/${freteId}`).then(r => r.json()),
    enabled: open,
  })

  const avancarStatus = useMutation({
    mutationFn: async (novoStatus: StatusViagem) => {
      const body: Record<string, unknown> = { status: novoStatus }
      if (novoStatus === 'CTE_EMITIDO') {
        body.chave_cte = chaveCte
      }
      const res = await fetch(`/api/fretes/${freteId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (!res.ok) throw new Error((await res.json()).error ?? 'Erro ao avançar status')
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['frete', freteId] })
      queryClient.invalidateQueries({ queryKey: ['fretes'] })
      setChaveCte('')
      setChaveCteError('')
      toast.success('Status atualizado')
    },
    onError: (e: Error) => {
      setChaveCteError(e.message)
      toast.error(e.message)
    },
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

  const proximos = frete ? (TRANSICOES_VIAGEM[frete.status as StatusViagem] ?? []).filter(s => s !== 'CANCELADO') : []
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
                      <StatusBadge status={frete.status as StatusViagem} />
                    </DialogTitle>
                    {frete.clientes && (
                      <span className="text-sm text-muted-foreground">
                        {frete.clientes.razao_social}
                      </span>
                    )}
                  </div>
                  <Button variant="ghost" size="icon" onClick={() => setEditOpen(true)}>
                    <Edit className="h-4 w-4" />
                  </Button>
                </div>
              </DialogHeader>

              {/* Ações de status */}
              {frete.status !== 'FINALIZADO' && frete.status !== 'CANCELADO' && (
                <div className="flex flex-col gap-3 p-3 bg-gray-50 rounded-lg">
                  {nextStatus === 'CTE_EMITIDO' ? (
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Chave CT-e (44 dígitos)</label>
                      <div className="flex gap-2">
                        <Input
                          value={chaveCte}
                          onChange={(e) => {
                            setChaveCte(e.target.value.replace(/\D/g, '').slice(0, 44))
                            setChaveCteError('')
                          }}
                          placeholder="00000000000000000000000000000000000000000000"
                          className="font-mono text-xs"
                          maxLength={44}
                        />
                        <Button
                          size="sm"
                          onClick={() => avancarStatus.mutate('CTE_EMITIDO')}
                          disabled={chaveCte.length !== 44 || avancarStatus.isPending}
                        >
                          Confirmar CT-e
                        </Button>
                      </div>
                      {chaveCteError && <p className="text-xs text-destructive">{chaveCteError}</p>}
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => setCancelando(true)}
                        disabled={cancelando}
                        className="w-fit"
                      >
                        <AlertTriangle className="h-3 w-3 mr-1" />
                        Cancelar Frete
                      </Button>
                    </div>
                  ) : podeAvancar && nextStatus ? (
                    <div className="flex items-center gap-3">
                      <Button
                        size="sm"
                        onClick={() => avancarStatus.mutate(nextStatus)}
                        disabled={avancarStatus.isPending}
                      >
                        {statusLabel[frete.status as StatusViagem] || `Avançar para ${nextStatus}`}
                      </Button>
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
                  ) : (
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => setCancelando(true)}
                      disabled={cancelando}
                    >
                      <AlertTriangle className="h-3 w-3 mr-1" />
                      Cancelar Frete
                    </Button>
                  )}
                </div>
              )}

              {cancelando && (
                <CancelForm
                  onConfirm={(motivo) => cancelar.mutate(motivo)}
                  onCancel={() => setCancelando(false)}
                  loading={cancelar.isPending}
                />
              )}

              {/* Informações */}
              <div className="space-y-3 pt-2">
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Informações</h3>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div className="flex items-center gap-2 text-muted-foreground col-span-2">
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
                  {frete.chave_cte && (
                    <div className="col-span-2">
                      <span className="text-muted-foreground">Chave CT-e: </span>
                      <span className="font-mono text-xs break-all">{frete.chave_cte}</span>
                    </div>
                  )}
                  {frete.observacoes && (
                    <div className="col-span-2 text-muted-foreground">
                      <span className="font-medium">Obs: </span>{frete.observacoes}
                    </div>
                  )}
                </div>
              </div>

              {/* Histórico */}
              <div className="space-y-3 pt-2">
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Histórico</h3>
                <EventTimeline eventos={frete.eventos ?? []} />
              </div>
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

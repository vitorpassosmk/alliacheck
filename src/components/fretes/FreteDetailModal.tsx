'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { StatusBadge } from '@/components/kanban/StatusBadge'
import { EventTimeline } from '@/components/eventos/EventTimeline'
import { TRANSICOES_VIAGEM } from '@/lib/state-machine'
import { toast } from 'sonner'
import { MapPin, User, Truck, Calendar, AlertTriangle, CreditCard, FileText } from 'lucide-react'
import type { Tables } from '@/types/database.types'
import type { StatusViagem } from '@/lib/state-machine'

type FreteCompleto = Tables<'fretes'> & {
  clientes: Tables<'clientes'> | null
  motoristas: (Tables<'motoristas'> & {
    banco: string | null
    agencia_conta: string | null
    chave_pix: string | null
  }) | null
  veiculos: (Tables<'veiculos'> & {
    banco_proprietario: string | null
    agencia_conta_proprietario: string | null
    chave_pix_proprietario: string | null
  }) | null
  eventos: Tables<'eventos'>[]
}

const statusLabel: Record<StatusViagem, string> = {
  ABERTO: 'Programar Frete',
  PROGRAMADO: 'Iniciar Carregamento',
  CARREGANDO: 'Registrar CT-e',
  CTE_EMITIDO: 'Aguardar Liberação',
  AGUARDANDO_LIBERACAO: 'Pagamento Realizado',
  EM_VIAGEM: 'Finalizar Viagem',
  CONCLUIDA: '',
  CANCELADO: '',
}

interface FreteDetailModalProps {
  freteId: string
  open: boolean
  onClose: () => void
}

export function FreteDetailModal({ freteId, open, onClose }: FreteDetailModalProps) {
  const queryClient = useQueryClient()
  const [cancelando, setCancelando] = useState(false)

  // Formulário ABERTO → PROGRAMADO
  const [motoristaId, setMotoristaId] = useState('')
  const [veiculoId, setVeiculoId] = useState('')

  // Formulário PROGRAMADO → CARREGANDO
  const [numeroGr, setNumeroGr] = useState('')

  // Formulário CARREGANDO → CTE_EMITIDO
  const [chaveCte, setChaveCte] = useState('')
  const [chaveCteError, setChaveCteError] = useState('')

  // Formulário CTE_EMITIDO → AGUARDANDO_LIBERACAO
  const [numeroContrato, setNumeroContrato] = useState('')
  const [numeroCiot, setNumeroCiot] = useState('')
  const [valorAdiantamento, setValorAdiantamento] = useState('')

  const { data: frete, isLoading } = useQuery<FreteCompleto>({
    queryKey: ['frete', freteId],
    queryFn: () => fetch(`/api/fretes/${freteId}`).then(r => r.json()),
    enabled: open,
  })

  const { data: motoristas = [] } = useQuery<Tables<'motoristas'>[]>({
    queryKey: ['motoristas'],
    queryFn: () => fetch('/api/motoristas').then(r => r.json()),
    enabled: open && frete?.status === 'ABERTO',
  })

  const { data: veiculos = [] } = useQuery<Tables<'veiculos'>[]>({
    queryKey: ['veiculos'],
    queryFn: () => fetch('/api/veiculos').then(r => r.json()),
    enabled: open && frete?.status === 'ABERTO',
  })

  const avancarStatus = useMutation({
    mutationFn: async (novoStatus: StatusViagem) => {
      const body: Record<string, unknown> = { status: novoStatus }

      if (novoStatus === 'PROGRAMADO') {
        body.motorista_id = motoristaId
        body.veiculo_id = veiculoId
      }
      if (novoStatus === 'CARREGANDO') {
        body.numero_gr = numeroGr
      }
      if (novoStatus === 'CTE_EMITIDO') {
        body.chave_cte = chaveCte
      }
      if (novoStatus === 'AGUARDANDO_LIBERACAO') {
        body.numero_contrato = numeroContrato
        body.numero_ciot = numeroCiot
        body.valor_adiantamento = valorAdiantamento ? parseFloat(valorAdiantamento) : undefined
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
      setNumeroGr('')
      setMotoristaId('')
      setVeiculoId('')
      setNumeroContrato('')
      setNumeroCiot('')
      setValorAdiantamento('')
      toast.success('Status atualizado')
    },
    onError: (e: Error) => {
      if (e.message.includes('CT-e')) setChaveCteError(e.message)
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
  const nextStatus = proximos[0] as StatusViagem | undefined
  const podeCancelar = frete && !['CONCLUIDA', 'CANCELADO', 'EM_VIAGEM'].includes(frete.status)

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        {isLoading || !frete ? (
          <div className="space-y-4 p-2">
            <DialogTitle className="sr-only">Carregando frete...</DialogTitle>
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
                    Frete {frete.numero_frete}
                    <StatusBadge status={frete.status as StatusViagem} />
                  </DialogTitle>
                  {frete.clientes && (
                    <span className="text-sm text-muted-foreground">{frete.clientes.razao_social}</span>
                  )}
                </div>
              </div>
            </DialogHeader>

            {/* Ações de status */}
            {frete.status !== 'CONCLUIDA' && frete.status !== 'CANCELADO' && (
              <div className="flex flex-col gap-3 p-4 bg-muted/40 rounded-lg border">
                <TransitionForm
                  status={frete.status as StatusViagem}
                  nextStatus={nextStatus}
                  isPending={avancarStatus.isPending}
                  onAvancar={(status) => avancarStatus.mutate(status)}
                  // PROGRAMADO
                  motoristas={motoristas}
                  veiculos={veiculos}
                  motoristaId={motoristaId}
                  setMotoristaId={setMotoristaId}
                  veiculoId={veiculoId}
                  setVeiculoId={setVeiculoId}
                  // CARREGANDO
                  numeroGr={numeroGr}
                  setNumeroGr={setNumeroGr}
                  // CTE_EMITIDO
                  chaveCte={chaveCte}
                  setChaveCte={(v) => { setChaveCte(v); setChaveCteError('') }}
                  chaveCteError={chaveCteError}
                  // AGUARDANDO_LIBERACAO
                  numeroContrato={numeroContrato}
                  setNumeroContrato={setNumeroContrato}
                  numeroCiot={numeroCiot}
                  setNumeroCiot={setNumeroCiot}
                  valorAdiantamento={valorAdiantamento}
                  setValorAdiantamento={setValorAdiantamento}
                />
                {podeCancelar && !cancelando && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="w-fit text-destructive border-destructive/30 hover:bg-destructive/10"
                    onClick={() => setCancelando(true)}
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

            {/* Painel expandido para AGUARDANDO_LIBERACAO */}
            {frete.status === 'AGUARDANDO_LIBERACAO' && (
              <LiberacaoPanel frete={frete} />
            )}

            {/* Informações do frete */}
            <div className="space-y-3 pt-2">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Informações</h3>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div className="flex items-center gap-2 text-muted-foreground col-span-2">
                  <MapPin className="h-4 w-4 shrink-0" />
                  <span>{frete.origem_cidade}/{frete.origem_uf} → {frete.destino_cidade}/{frete.destino_uf}</span>
                </div>
                <div className="text-muted-foreground col-span-2">
                  <span className="font-medium">Produto: </span>
                  {frete.tipo_produto ?? <span className="italic text-muted-foreground/60">—</span>}
                </div>
                <div className="text-muted-foreground col-span-2">
                  <span className="font-medium">Valor da carga: </span>
                  {frete.valor_mercadoria
                    ? `R$ ${frete.valor_mercadoria.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
                    : <span className="italic text-muted-foreground/60">—</span>}
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
                {frete.numero_gr && (
                  <div className="text-muted-foreground">
                    <span className="font-medium">N° GR: </span>{frete.numero_gr}
                  </div>
                )}
                {frete.numero_contrato && (
                  <div className="text-muted-foreground">
                    <span className="font-medium">N° Contrato: </span>{frete.numero_contrato}
                  </div>
                )}
                {frete.numero_ciot && (
                  <div className="text-muted-foreground">
                    <span className="font-medium">CIOT: </span>{frete.numero_ciot}
                  </div>
                )}
                {frete.valor_adiantamento && (
                  <div className="text-muted-foreground">
                    Adiantamento: R$ {frete.valor_adiantamento.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
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
  )
}

// ─── Formulário por transição ─────────────────────────────────────────────────

interface TransitionFormProps {
  status: StatusViagem
  nextStatus: StatusViagem | undefined
  isPending: boolean
  onAvancar: (status: StatusViagem) => void
  motoristas: Tables<'motoristas'>[]
  veiculos: Tables<'veiculos'>[]
  motoristaId: string
  setMotoristaId: (v: string) => void
  veiculoId: string
  setVeiculoId: (v: string) => void
  numeroGr: string
  setNumeroGr: (v: string) => void
  chaveCte: string
  setChaveCte: (v: string) => void
  chaveCteError: string
  numeroContrato: string
  setNumeroContrato: (v: string) => void
  numeroCiot: string
  setNumeroCiot: (v: string) => void
  valorAdiantamento: string
  setValorAdiantamento: (v: string) => void
}

function TransitionForm({
  status, nextStatus, isPending, onAvancar,
  motoristas, veiculos, motoristaId, setMotoristaId, veiculoId, setVeiculoId,
  numeroGr, setNumeroGr,
  chaveCte, setChaveCte, chaveCteError,
  numeroContrato, setNumeroContrato, numeroCiot, setNumeroCiot,
  valorAdiantamento, setValorAdiantamento,
}: TransitionFormProps) {
  if (!nextStatus) return null

  if (status === 'ABERTO') {
    return (
      <div className="space-y-3">
        <p className="text-sm font-medium">Selecione motorista e veículo para programar o frete</p>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">Motorista *</label>
            <Select onValueChange={setMotoristaId} value={motoristaId}>
              <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
              <SelectContent>
                {motoristas.filter(m => m.status === 'ATIVO').map(m =>
                  <SelectItem key={m.id} value={m.id}>{m.nome}</SelectItem>
                )}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">Veículo *</label>
            <Select onValueChange={setVeiculoId} value={veiculoId}>
              <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
              <SelectContent>
                {veiculos.map(v =>
                  <SelectItem key={v.id} value={v.id}>{v.placa} — {v.tipo}</SelectItem>
                )}
              </SelectContent>
            </Select>
          </div>
        </div>
        <Button
          size="sm"
          onClick={() => onAvancar('PROGRAMADO')}
          disabled={!motoristaId || !veiculoId || isPending}
        >
          Programar Frete
        </Button>
      </div>
    )
  }

  if (status === 'PROGRAMADO') {
    return (
      <div className="space-y-3">
        <p className="text-sm font-medium">Informe o N° GR (contrato de seguro) para iniciar o carregamento</p>
        <div className="flex gap-2">
          <Input
            value={numeroGr}
            onChange={e => setNumeroGr(e.target.value)}
            placeholder="N° GR / Apólice de seguro"
            className="max-w-xs"
          />
          <Button
            size="sm"
            onClick={() => onAvancar('CARREGANDO')}
            disabled={!numeroGr.trim() || isPending}
          >
            Iniciar Carregamento
          </Button>
        </div>
      </div>
    )
  }

  if (status === 'CARREGANDO') {
    return (
      <div className="space-y-2">
        <p className="text-sm font-medium">Informe a chave CT-e para registrar emissão</p>
        <div className="flex gap-2">
          <Input
            value={chaveCte}
            onChange={(e) => setChaveCte(e.target.value.replace(/\D/g, '').slice(0, 44))}
            placeholder="00000000000000000000000000000000000000000000"
            className="font-mono text-xs"
            maxLength={44}
          />
          <Button
            size="sm"
            onClick={() => onAvancar('CTE_EMITIDO')}
            disabled={chaveCte.length !== 44 || isPending}
          >
            Confirmar CT-e
          </Button>
        </div>
        {chaveCteError && <p className="text-xs text-destructive">{chaveCteError}</p>}
        <p className="text-xs text-muted-foreground">{chaveCte.length}/44 dígitos</p>
      </div>
    )
  }

  if (status === 'CTE_EMITIDO') {
    return (
      <div className="space-y-3">
        <p className="text-sm font-medium">Preencha os dados contratuais para aguardar liberação financeira</p>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">N° Contrato *</label>
            <Input value={numeroContrato} onChange={e => setNumeroContrato(e.target.value)} placeholder="Ex: 2024-001" />
          </div>
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">N° CIOT *</label>
            <Input value={numeroCiot} onChange={e => setNumeroCiot(e.target.value)} placeholder="N° CIOT" />
          </div>
          <div className="space-y-1 col-span-2">
            <label className="text-xs text-muted-foreground">Valor de Adiantamento (R$) *</label>
            <Input
              type="number"
              step="0.01"
              min="0.01"
              value={valorAdiantamento}
              onChange={e => setValorAdiantamento(e.target.value)}
              placeholder="0,00"
              className="max-w-xs"
            />
          </div>
        </div>
        <Button
          size="sm"
          onClick={() => onAvancar('AGUARDANDO_LIBERACAO')}
          disabled={!numeroContrato.trim() || !numeroCiot.trim() || !valorAdiantamento || isPending}
        >
          Registrar e Aguardar Liberação
        </Button>
      </div>
    )
  }

  if (status === 'AGUARDANDO_LIBERACAO') {
    return (
      <Button
        size="sm"
        className="bg-green-600 hover:bg-green-700 text-white"
        onClick={() => onAvancar('EM_VIAGEM')}
        disabled={isPending}
      >
        ✓ Pagamento Realizado — Liberar para Viagem
      </Button>
    )
  }

  if (status === 'EM_VIAGEM') {
    return (
      <Button
        size="sm"
        onClick={() => onAvancar('CONCLUIDA')}
        disabled={isPending}
      >
        Finalizar Viagem
      </Button>
    )
  }

  return null
}

// ─── Painel de Liberação ─────────────────────────────────────────────────────

function LiberacaoPanel({ frete }: { frete: FreteCompleto }) {
  const m = frete.motoristas
  const v = frete.veiculos

  return (
    <div className="p-4 border border-amber-200 bg-amber-50 rounded-lg space-y-4">
      <h3 className="text-sm font-semibold flex items-center gap-2 text-amber-800">
        <FileText className="h-4 w-4" />
        Dados para Liberação de Pagamento
      </h3>

      <div className="grid grid-cols-2 gap-4 text-sm">
        {/* Motorista */}
        {m && (
          <div className="space-y-1">
            <p className="font-medium text-xs text-muted-foreground uppercase tracking-wide">Motorista</p>
            <p>{m.nome}</p>
            <p className="text-muted-foreground">CNH: {m.cnh}</p>
            {m.validade_cnh && (
              <p className="text-muted-foreground">
                Validade: {new Date(m.validade_cnh + 'T00:00:00').toLocaleDateString('pt-BR')}
              </p>
            )}
          </div>
        )}

        {/* Documentos do frete */}
        <div className="space-y-1">
          <p className="font-medium text-xs text-muted-foreground uppercase tracking-wide">Documentos</p>
          {frete.numero_gr && <p>GR (seguro): <span className="font-mono">{frete.numero_gr}</span></p>}
          {frete.numero_contrato && <p>Contrato: <span className="font-mono">{frete.numero_contrato}</span></p>}
          {frete.numero_ciot && <p>CIOT: <span className="font-mono">{frete.numero_ciot}</span></p>}
          {frete.valor_adiantamento && (
            <p>Adiantamento: <span className="font-semibold">
              R$ {frete.valor_adiantamento.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </span></p>
          )}
        </div>

        {/* Dados bancários do motorista */}
        {m && (m.banco || m.agencia_conta || m.chave_pix) && (
          <div className="space-y-1">
            <p className="font-medium text-xs text-muted-foreground uppercase tracking-wide flex items-center gap-1">
              <CreditCard className="h-3 w-3" /> Dados Bancários — Motorista
            </p>
            {m.banco && <p className="text-muted-foreground">Banco: {m.banco}</p>}
            {m.agencia_conta && <p className="text-muted-foreground">Ag/Conta: {m.agencia_conta}</p>}
            {m.chave_pix && <p className="text-muted-foreground">PIX: {m.chave_pix}</p>}
          </div>
        )}

        {/* Dados bancários do proprietário do veículo */}
        {v && (v.banco_proprietario || v.agencia_conta_proprietario || v.chave_pix_proprietario) && (
          <div className="space-y-1">
            <p className="font-medium text-xs text-muted-foreground uppercase tracking-wide flex items-center gap-1">
              <CreditCard className="h-3 w-3" /> Dados Bancários — Proprietário do Veículo
            </p>
            {v.banco_proprietario && <p className="text-muted-foreground">Banco: {v.banco_proprietario}</p>}
            {v.agencia_conta_proprietario && <p className="text-muted-foreground">Ag/Conta: {v.agencia_conta_proprietario}</p>}
            {v.chave_pix_proprietario && <p className="text-muted-foreground">PIX: {v.chave_pix_proprietario}</p>}
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Formulário de cancelamento ───────────────────────────────────────────────

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

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
import { PasswordConfirmDialog } from '@/components/common/PasswordConfirmDialog'
import { TRANSICOES_VIAGEM } from '@/lib/state-machine'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { MapPin, User, Truck, Calendar, AlertTriangle, CreditCard, FileText, Trash2, CheckCircle2, XCircle } from 'lucide-react'
import { Checkbox } from '@/components/ui/checkbox'
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

// ─── Verificação de senha via Supabase ───────────────────────────────────────

async function verificarSenha(senha: string): Promise<boolean> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user?.email) return false
  const { error } = await supabase.auth.signInWithPassword({ email: user.email, password: senha })
  return !error
}

async function buscarPapelUsuario(): Promise<string | null> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data } = await supabase.from('users').select('papel').eq('id', user.id).single()
  return data?.papel ?? null
}

// ─── Modal principal ──────────────────────────────────────────────────────────

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

  // Diálogo de senha — liberação EM_VIAGEM
  const [senhaLiberacaoAberta, setSenhaLiberacaoAberta] = useState(false)
  const [loadingLiberacao, setLoadingLiberacao] = useState(false)

  // Diálogo de senha — exclusão
  const [senhaExclusaoAberta, setSenhaExclusaoAberta] = useState(false)
  const [loadingExclusao, setLoadingExclusao] = useState(false)

  // Checklist de conferência — AGUARDANDO_LIBERACAO
  const [dadosBancariosConferidos, setDadosBancariosConferidos] = useState(false)

  const { data: frete, isLoading } = useQuery<FreteCompleto>({
    queryKey: ['frete', freteId],
    queryFn: () => fetch(`/api/fretes/${freteId}`).then(r => r.json()),
    enabled: open,
  })

  const { data: papel } = useQuery<string | null>({
    queryKey: ['usuario-papel'],
    queryFn: buscarPapelUsuario,
    enabled: open,
    staleTime: 5 * 60 * 1000,
  })

  const usarDisponiveis = frete?.status === 'ABERTO'

  const { data: motoristas = [] } = useQuery<Tables<'motoristas'>[]>({
    queryKey: usarDisponiveis ? ['motoristas-disponiveis'] : ['motoristas'],
    queryFn: () =>
      fetch(usarDisponiveis ? '/api/motoristas/disponiveis' : '/api/motoristas').then(r => r.json()),
    enabled: open && frete?.status === 'ABERTO',
  })

  const { data: veiculos = [] } = useQuery<Tables<'veiculos'>[]>({
    queryKey: usarDisponiveis ? ['veiculos-disponiveis'] : ['veiculos'],
    queryFn: () =>
      fetch(usarDisponiveis ? '/api/veiculos/disponiveis' : '/api/veiculos').then(r => r.json()),
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

  // ─── Handlers de senha ──────────────────────────────────────────────────────

  async function handleConfirmarLiberacao(senha: string) {
    setLoadingLiberacao(true)
    try {
      const ok = await verificarSenha(senha)
      if (!ok) {
        toast.error('Senha incorreta. Liberação cancelada.')
        return
      }
      setSenhaLiberacaoAberta(false)
      avancarStatus.mutate('EM_VIAGEM')
    } catch {
      toast.error('Erro ao verificar senha.')
    } finally {
      setLoadingLiberacao(false)
    }
  }

  async function handleConfirmarExclusao(senha: string) {
    setLoadingExclusao(true)
    try {
      const ok = await verificarSenha(senha)
      if (!ok) {
        toast.error('Senha incorreta. Exclusão cancelada.')
        return
      }
      const res = await fetch(`/api/fretes/${freteId}`, { method: 'DELETE' })
      if (!res.ok) {
        const json = await res.json().catch(() => ({}))
        toast.error(json.error ?? 'Erro ao excluir frete.')
        return
      }
      toast.success('Frete excluído com sucesso.')
      setSenhaExclusaoAberta(false)
      queryClient.invalidateQueries({ queryKey: ['fretes'] })
      onClose()
    } catch {
      toast.error('Erro ao excluir frete.')
    } finally {
      setLoadingExclusao(false)
    }
  }

  const proximos = frete ? (TRANSICOES_VIAGEM[frete.status as StatusViagem] ?? []).filter(s => s !== 'CANCELADO') : []
  const nextStatus = proximos[0] as StatusViagem | undefined
  const podeCancelar = papel === 'ADMIN' && frete && !['CONCLUIDA', 'CANCELADO', 'EM_VIAGEM'].includes(frete.status)
  const podeExcluir =
    ['ADMIN', 'SUPERVISOR'].includes(papel ?? '') &&
    frete !== undefined &&
    !['EM_VIAGEM', 'CONCLUIDA'].includes(frete?.status ?? '')

  return (
    <>
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
                    onAvancar={(status) => {
                      if (status === 'EM_VIAGEM') {
                        setSenhaLiberacaoAberta(true)
                        return
                      }
                      avancarStatus.mutate(status)
                    }}
                    // PROGRAMADO
                    motoristas={motoristas}
                    veiculos={veiculos}
                    usarDisponiveis={usarDisponiveis}
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
                    dadosBancariosConferidos={dadosBancariosConferidos}
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
                <LiberacaoPanel frete={frete} onConferido={setDadosBancariosConferidos} />
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

              {/* Rodapé — botão Excluir (ADMIN only) */}
              {podeExcluir && (
                <div className="pt-2 border-t flex justify-start">
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                    onClick={() => setSenhaExclusaoAberta(true)}
                  >
                    <Trash2 className="h-4 w-4 mr-1.5" />
                    Excluir frete
                  </Button>
                </div>
              )}
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Diálogo de senha — liberação EM_VIAGEM */}
      <PasswordConfirmDialog
        open={senhaLiberacaoAberta}
        onOpenChange={setSenhaLiberacaoAberta}
        onConfirm={handleConfirmarLiberacao}
        loading={loadingLiberacao}
        title="Confirmar Liberação"
        description="Digite sua senha para liberar o frete para EM VIAGEM"
      />

      {/* Diálogo de senha — exclusão */}
      <PasswordConfirmDialog
        open={senhaExclusaoAberta}
        onOpenChange={setSenhaExclusaoAberta}
        onConfirm={handleConfirmarExclusao}
        loading={loadingExclusao}
        title="Excluir Frete"
        description="Esta ação é irreversível. Digite sua senha para confirmar."
      />
    </>
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
  usarDisponiveis: boolean
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
  dadosBancariosConferidos: boolean
}

function TransitionForm({
  status, nextStatus, isPending, onAvancar,
  motoristas, veiculos, usarDisponiveis, motoristaId, setMotoristaId, veiculoId, setVeiculoId,
  numeroGr, setNumeroGr,
  chaveCte, setChaveCte, chaveCteError,
  numeroContrato, setNumeroContrato, numeroCiot, setNumeroCiot,
  valorAdiantamento, setValorAdiantamento,
  dadosBancariosConferidos,
}: TransitionFormProps) {
  if (!nextStatus) return null

  if (status === 'ABERTO') {
    return (
      <div className="space-y-3">
        <p className="text-sm font-medium">Selecione motorista e veículo para programar o frete</p>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">
              Motorista *{usarDisponiveis && <span className="ml-1 text-muted-foreground/70">(disponíveis)</span>}
            </label>
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
            <label className="text-xs text-muted-foreground">
              Veículo *{usarDisponiveis && <span className="ml-1 text-muted-foreground/70">(disponíveis)</span>}
            </label>
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
        disabled={isPending || !dadosBancariosConferidos}
      >
        {dadosBancariosConferidos
          ? 'Pagamento Realizado — Liberar para Viagem'
          : 'Confirme os dados bancários abaixo para liberar'}
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

function LiberacaoPanel({
  frete,
  onConferido,
}: {
  frete: FreteCompleto
  onConferido: (v: boolean) => void
}) {
  const [bancarioConferido, setBancarioConferido] = useState(false)
  const m = frete.motoristas
  const v = frete.veiculos

  const motoristaPropriétario = !!(m && v && m.cpf && v.cpf_proprietario && m.cpf === v.cpf_proprietario)

  function handleBancarioChange(checked: boolean) {
    setBancarioConferido(checked)
    onConferido(checked)
  }

  const checklistItems = [
    { label: 'N° GR (seguro)', value: frete.numero_gr, key: 'gr' },
    { label: 'Chave CT-e', value: frete.chave_cte, key: 'cte' },
    { label: 'N° Contrato', value: frete.numero_contrato, key: 'contrato' },
    { label: 'CIOT', value: frete.numero_ciot, key: 'ciot' },
  ]

  return (
    <div className="p-4 border border-amber-200 bg-amber-50 rounded-lg space-y-4">
      <h3 className="text-sm font-semibold flex items-center gap-2 text-amber-800">
        <FileText className="h-4 w-4" />
        Conferência de Liberação
      </h3>

      {/* Checklist de documentos */}
      <div className="space-y-2">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Documentos</p>
        {checklistItems.map((item) => (
          <div key={item.key} className="flex items-start gap-2 text-sm">
            {item.value ? (
              <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5 shrink-0" />
            ) : (
              <XCircle className="h-4 w-4 text-red-500 mt-0.5 shrink-0" />
            )}
            <span className="font-medium min-w-[110px]">{item.label}:</span>
            <span className="font-mono text-xs text-muted-foreground break-all">
              {item.value ?? <span className="text-red-500 italic">não registrado</span>}
            </span>
          </div>
        ))}

        {/* Checkbox manual — dados bancários */}
        <div className="flex items-start gap-2 pt-1">
          <Checkbox
            id="bancario-conferido"
            checked={bancarioConferido}
            onCheckedChange={(checked) => handleBancarioChange(checked === true)}
            className="mt-0.5"
          />
          <label
            htmlFor="bancario-conferido"
            className="text-sm font-medium cursor-pointer select-none"
          >
            Dados bancários do proprietário conferidos
          </label>
        </div>
      </div>

      <div className="border-t border-amber-200 pt-3 grid grid-cols-2 gap-4 text-sm">
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

        {/* Adiantamento */}
        <div className="space-y-1">
          <p className="font-medium text-xs text-muted-foreground uppercase tracking-wide">Adiantamento</p>
          {frete.valor_adiantamento ? (
            <p className="text-lg font-semibold text-amber-900">
              R$ {frete.valor_adiantamento.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </p>
          ) : (
            <p className="text-muted-foreground italic">Não informado</p>
          )}
        </div>

        {/* Dados bancários para pagamento — lógica de proprietário */}
        {motoristaPropriétario ? (
          (m && (m.banco || m.agencia_conta || m.chave_pix)) ? (
            <div className="col-span-2 space-y-1 bg-green-50 border border-green-200 rounded-md p-3">
              <p className="font-medium text-xs text-green-800 uppercase tracking-wide flex items-center gap-1">
                <CreditCard className="h-3 w-3" /> Dados para Pagamento — Motorista / Proprietário
              </p>
              {m.banco && <p className="text-muted-foreground">Banco: {m.banco}</p>}
              {m.agencia_conta && <p className="text-muted-foreground">Ag/Conta: {m.agencia_conta}</p>}
              {m.chave_pix && <p className="text-muted-foreground">PIX: {m.chave_pix}</p>}
            </div>
          ) : null
        ) : (
          <>
            {/* Proprietário do veículo — destinatário do pagamento */}
            {v && (v.banco_proprietario || v.agencia_conta_proprietario || v.chave_pix_proprietario) && (
              <div className="col-span-2 space-y-1 bg-green-50 border border-green-200 rounded-md p-3">
                <p className="font-medium text-xs text-green-800 uppercase tracking-wide flex items-center gap-1">
                  <CreditCard className="h-3 w-3" /> Dados para Pagamento — Proprietário do Veículo
                  {v.proprietario && <span className="ml-1 normal-case font-normal">({v.proprietario})</span>}
                </p>
                {v.banco_proprietario && <p className="text-muted-foreground">Banco: {v.banco_proprietario}</p>}
                {v.agencia_conta_proprietario && <p className="text-muted-foreground">Ag/Conta: {v.agencia_conta_proprietario}</p>}
                {v.chave_pix_proprietario && <p className="text-muted-foreground">PIX: {v.chave_pix_proprietario}</p>}
              </div>
            )}

            {/* Dados bancários do motorista — apenas informativo */}
            {m && (m.banco || m.agencia_conta || m.chave_pix) && (
              <div className="col-span-2 space-y-1">
                <p className="font-medium text-xs text-muted-foreground uppercase tracking-wide flex items-center gap-1">
                  <CreditCard className="h-3 w-3" /> Dados Bancários — Motorista
                  <span className="normal-case font-normal text-amber-600">(não é o proprietário)</span>
                </p>
                {m.banco && <p className="text-muted-foreground">Banco: {m.banco}</p>}
                {m.agencia_conta && <p className="text-muted-foreground">Ag/Conta: {m.agencia_conta}</p>}
                {m.chave_pix && <p className="text-muted-foreground">PIX: {m.chave_pix}</p>}
              </div>
            )}
          </>
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

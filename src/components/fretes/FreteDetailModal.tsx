'use client'

import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { StatusBadge } from '@/components/kanban/StatusBadge'
import { EventTimeline } from '@/components/eventos/EventTimeline'
import { PasswordConfirmDialog } from '@/components/common/PasswordConfirmDialog'
import { FreteFormModal } from '@/components/fretes/FreteFormModal'
import { TRANSICOES_VIAGEM } from '@/lib/state-machine'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { MapPin, User, Truck, Calendar, AlertTriangle, CreditCard, FileText, Trash2, Pencil, CheckCircle2 } from 'lucide-react'
import { Checkbox } from '@/components/ui/checkbox'
import type { Tables, EventoComUsuario } from '@/types/database.types'
import type { StatusViagem } from '@/lib/state-machine'

type FreteCompleto = Tables<'fretes'> & {
  clientes: Tables<'clientes'> | null
  motoristas: Tables<'motoristas'> | null
  veiculos: Tables<'veiculos'> | null
  eventos: EventoComUsuario[]
}

interface FreteDetailModalProps {
  freteId: string
  open: boolean
  onClose: () => void
}

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

export function FreteDetailModal({ freteId, open, onClose }: FreteDetailModalProps) {
  const queryClient = useQueryClient()
  const [cancelando, setCancelando] = useState(false)

  // Formulário ABERTO → PROGRAMADO
  const [motoristaId, setMotoristaId] = useState('')
  const [veiculoId, setVeiculoId] = useState('')
  const [custoAgregado, setCustoAgregado] = useState('')
  const [valorAdiantamentoProgramado, setValorAdiantamentoProgramado] = useState('')
  const [temPlacasSeparadas, setTemPlacasSeparadas] = useState(false)
  const [placaCarreta, setPlacaCarreta] = useState('')
  const [placaCavalo, setPlacaCavalo] = useState('')
  const [motoristaFuncionarioAgregado, setMotoristaFuncionarioAgregado] = useState(false)
  const [dataCarregamentoForm, setDataCarregamentoForm] = useState('')
  const [dataEntregaPrevistaForm, setDataEntregaPrevistaForm] = useState('')

  // Formulário EM_VIAGEM → CONCLUIDA
  const [dataDescarga, setDataDescarga] = useState('')

  // Formulário PROGRAMADO → CARREGANDO
  const [numeroGr, setNumeroGr] = useState('')

  // Formulário CARREGANDO → CTE_EMITIDO
  const [chaveCte, setChaveCte] = useState('')
  const [chaveCteError, setChaveCteError] = useState('')

  // Formulário CTE_EMITIDO → AGUARDANDO_LIBERACAO
  const [numeroContrato, setNumeroContrato] = useState('')
  const [numeroCiot, setNumeroCiot] = useState('')
  const [valorAdiantamento, setValorAdiantamento] = useState('')

  // Diálogo de senha — exclusão
  const [senhaExclusaoAberta, setSenhaExclusaoAberta] = useState(false)
  const [loadingExclusao, setLoadingExclusao] = useState(false)

  // Modo de edição com senha
  const [senhaEditAberta, setSenhaEditAberta] = useState(false)
  const [loadingEditSenha, setLoadingEditSenha] = useState(false)
  const [editAberto, setEditAberto] = useState(false)

  const { data: frete, isLoading, isError } = useQuery<FreteCompleto>({
    queryKey: ['frete', freteId],
    queryFn: async () => {
      const r = await fetch(`/api/fretes/${freteId}`)
      const json = await r.json()
      if (!r.ok) throw new Error(json.error ?? 'Frete não encontrado')
      return json as FreteCompleto
    },
    enabled: open,
    retry: false,
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

  // Pré-preenche adiantamento no step AGUARDANDO_LIBERACAO se já foi definido no PROGRAMADO
  useEffect(() => {
    if (frete?.valor_adiantamento && !valorAdiantamento) {
      setValorAdiantamento(frete.valor_adiantamento.toString())
    }
  }, [frete?.valor_adiantamento]) // eslint-disable-line react-hooks/exhaustive-deps

  const avancarStatus = useMutation({
    mutationFn: async (novoStatus: StatusViagem) => {
      const body: Record<string, unknown> = { status: novoStatus }

      const parsePositive = (v: string): number | undefined => {
        const n = parseFloat(v)
        return !isNaN(n) && n > 0 ? n : undefined
      }

      if (novoStatus === 'PROGRAMADO') {
        body.motorista_id = motoristaId
        body.veiculo_id = veiculoId
        if (!frete?.custo_agregado) body.custo_agregado = parsePositive(custoAgregado)
        if (valorAdiantamentoProgramado) body.valor_adiantamento = parsePositive(valorAdiantamentoProgramado)
        body.placa_carreta = temPlacasSeparadas ? placaCarreta.trim() || null : null
        body.placa_cavalo = temPlacasSeparadas ? placaCavalo.trim() || null : null
        body.motorista_e_funcionario_agregado = motoristaFuncionarioAgregado
        if (!frete?.data_carregamento && dataCarregamentoForm) {
          body.data_carregamento = dataCarregamentoForm
        }
        if (!frete?.data_entrega_prevista && dataEntregaPrevistaForm) {
          body.data_entrega_prevista = dataEntregaPrevistaForm
        }
      }
      if (novoStatus === 'CARREGANDO') body.numero_gr = numeroGr
      if (novoStatus === 'CTE_EMITIDO') body.chave_cte = chaveCte
      if (novoStatus === 'AGUARDANDO_LIBERACAO') {
        body.numero_contrato = numeroContrato
        body.numero_ciot = numeroCiot
        body.valor_adiantamento = parsePositive(valorAdiantamento)
      }
      if (novoStatus === 'CONCLUIDA') {
        body.data_entrega_real = dataDescarga
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
      setChaveCte(''); setChaveCteError(''); setNumeroGr('')
      setMotoristaId(''); setVeiculoId(''); setNumeroContrato('')
      setNumeroCiot(''); setValorAdiantamento('')
      setCustoAgregado(''); setDataCarregamentoForm(''); setDataEntregaPrevistaForm('')
      setValorAdiantamentoProgramado(''); setTemPlacasSeparadas(false); setPlacaCarreta(''); setPlacaCavalo('')
      setMotoristaFuncionarioAgregado(false)
      setDataDescarga('')
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

  async function handleConfirmarExclusao(senha: string) {
    setLoadingExclusao(true)
    try {
      const ok = await verificarSenha(senha)
      if (!ok) { toast.error('Senha incorreta. Exclusão cancelada.'); return }
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
    } catch { toast.error('Erro ao excluir frete.') }
    finally { setLoadingExclusao(false) }
  }

  async function handleConfirmarEdit(senha: string) {
    setLoadingEditSenha(true)
    try {
      const ok = await verificarSenha(senha)
      if (!ok) { toast.error('Senha incorreta.'); return }
      setSenhaEditAberta(false)
      setEditAberto(true)
    } catch { toast.error('Erro ao verificar senha.') }
    finally { setLoadingEditSenha(false) }
  }

  const proximos = frete
    ? (TRANSICOES_VIAGEM[frete.status as StatusViagem] ?? []).filter(s => s !== 'CANCELADO')
    : []
  const nextStatus = proximos[0] as StatusViagem | undefined

  // Item 5: SUPERVISOR também pode cancelar
  const podeCancelar =
    ['ADMIN', 'SUPERVISOR'].includes(papel ?? '') &&
    frete !== undefined &&
    !['CONCLUIDA', 'CANCELADO', 'EM_VIAGEM'].includes(frete.status)

  const podeExcluir =
    ['ADMIN', 'SUPERVISOR'].includes(papel ?? '') && frete !== undefined

  const podeEditar =
    ['ADMIN', 'SUPERVISOR'].includes(papel ?? '') && frete !== undefined

  const statusSensivelExclusao =
    frete !== undefined && ['EM_VIAGEM', 'CONCLUIDA'].includes(frete.status)

  const statusSensivelEdicao =
    frete !== undefined && ['CONCLUIDA', 'CANCELADO', 'EM_VIAGEM'].includes(frete.status)

  const editDefaultValues = frete ? {
    numero_frete: frete.numero_frete,
    origem_cidade: frete.origem_cidade,
    origem_uf: frete.origem_uf,
    destino_cidade: frete.destino_cidade,
    destino_uf: frete.destino_uf,
    cliente_id: frete.cliente_id ?? undefined,
    tipo_veiculo: frete.tipo_veiculo ?? undefined,
    tipo_produto: frete.tipo_produto ?? undefined,
    valor_mercadoria: frete.valor_mercadoria?.toString() ?? '',
    valor_frete: frete.valor_frete?.toString() ?? '',
    custo_agregado: frete.custo_agregado?.toString() ?? '',
    data_carregamento: frete.data_carregamento ?? '',
    data_entrega_prevista: frete.data_entrega_prevista ?? undefined,
    observacoes: frete.observacoes ?? undefined,
  } : undefined

  return (
    <>
      <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          {isLoading ? (
            <div className="space-y-4 p-2">
              <DialogTitle className="sr-only">Carregando frete...</DialogTitle>
              <Skeleton className="h-8 w-48" />
              <Skeleton className="h-24 rounded-lg" />
              <Skeleton className="h-48 rounded-lg" />
            </div>
          ) : isError || !frete ? (
            <div className="p-6 space-y-4 text-center">
              <DialogTitle className="sr-only">Erro</DialogTitle>
              <p className="text-muted-foreground">Frete não encontrado ou foi excluído.</p>
              <Button variant="outline" size="sm" onClick={onClose}>Fechar</Button>
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
                  {/* Item 14: Botão de edição com senha */}
                  {podeEditar && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="shrink-0"
                      onClick={() => setSenhaEditAberta(true)}
                    >
                      <Pencil className="h-3.5 w-3.5 mr-1.5" />
                      Editar
                    </Button>
                  )}
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
                    motoristas={motoristas}
                    veiculos={veiculos}
                    usarDisponiveis={usarDisponiveis}
                    motoristaId={motoristaId}
                    setMotoristaId={setMotoristaId}
                    veiculoId={veiculoId}
                    setVeiculoId={setVeiculoId}
                    custoAgregadoExistente={frete.custo_agregado ?? null}
                    custoAgregado={custoAgregado}
                    setCustoAgregado={setCustoAgregado}
                    valorAdiantamentoProgramado={valorAdiantamentoProgramado}
                    setValorAdiantamentoProgramado={setValorAdiantamentoProgramado}
                    temPlacasSeparadas={temPlacasSeparadas}
                    setTemPlacasSeparadas={setTemPlacasSeparadas}
                    placaCarreta={placaCarreta}
                    setPlacaCarreta={setPlacaCarreta}
                    placaCavalo={placaCavalo}
                    setPlacaCavalo={setPlacaCavalo}
                    motoristaFuncionarioAgregado={motoristaFuncionarioAgregado}
                    setMotoristaFuncionarioAgregado={setMotoristaFuncionarioAgregado}
                    dataCarregamentoExistente={frete.data_carregamento}
                    dataCarregamentoForm={dataCarregamentoForm}
                    setDataCarregamentoForm={setDataCarregamentoForm}
                    dataEntregaPrevistaExistente={frete?.data_entrega_prevista ?? null}
                    dataEntregaPrevistaForm={dataEntregaPrevistaForm}
                    setDataEntregaPrevistaForm={setDataEntregaPrevistaForm}
                    numeroGr={numeroGr}
                    setNumeroGr={setNumeroGr}
                    chaveCte={chaveCte}
                    setChaveCte={(v) => { setChaveCte(v); setChaveCteError('') }}
                    chaveCteError={chaveCteError}
                    numeroContrato={numeroContrato}
                    setNumeroContrato={setNumeroContrato}
                    numeroCiot={numeroCiot}
                    setNumeroCiot={setNumeroCiot}
                    valorAdiantamento={valorAdiantamento}
                    setValorAdiantamento={setValorAdiantamento}
                    dataDescarga={dataDescarga}
                    setDataDescarga={setDataDescarga}
                  />
                  {/* Item 5: SUPERVISOR também pode cancelar */}
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

              {frete.status === 'AGUARDANDO_LIBERACAO' && (
                <LiberacaoPanel freteId={freteId} frete={frete} papel={papel ?? null} />
              )}

              {/* Informações do frete */}
              <div className="space-y-3 pt-2">
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Informações</h3>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div className="flex items-center gap-2 text-muted-foreground col-span-2">
                    <MapPin className="h-4 w-4 shrink-0" />
                    <span>{frete.origem_cidade}/{frete.origem_uf} → {frete.destino_cidade}/{frete.destino_uf}</span>
                  </div>
                  {frete.tipo_veiculo && (
                    <div className="text-muted-foreground">
                      <span className="font-medium">Veículo: </span>{frete.tipo_veiculo}
                    </div>
                  )}
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
                      <span>
                        {frete.placa_cavalo
                          ? `Cavalo: ${frete.placa_cavalo}`
                          : frete.veiculos.placa}
                        {frete.placa_carreta && ` + Carreta: ${frete.placa_carreta}`}
                        {' — '}{frete.veiculos.tipo}
                      </span>
                    </div>
                  )}
                  {(['EM_VIAGEM', 'CONCLUIDA'] as StatusViagem[]).includes(frete.status as StatusViagem) ? (
                    frete.data_entrega_prevista && (
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Calendar className="h-4 w-4 shrink-0" />
                        <span>Prev. Entrega: {new Date(frete.data_entrega_prevista + 'T00:00:00').toLocaleDateString('pt-BR')}</span>
                      </div>
                    )
                  ) : (
                    frete.data_carregamento && (
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Calendar className="h-4 w-4 shrink-0" />
                        <span>Carregamento: {new Date(frete.data_carregamento + 'T00:00:00').toLocaleDateString('pt-BR')}</span>
                      </div>
                    )
                  )}
                  {frete.valor_frete && (
                    <div className="text-muted-foreground">
                      Frete: R$ {frete.valor_frete.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </div>
                  )}
                  {frete.custo_agregado && (
                    <div className="text-muted-foreground">
                      <span className="font-medium">Custo Agregado: </span>
                      R$ {frete.custo_agregado.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
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

      <PasswordConfirmDialog
        open={senhaExclusaoAberta}
        onOpenChange={setSenhaExclusaoAberta}
        onConfirm={handleConfirmarExclusao}
        loading={loadingExclusao}
        title="Excluir Frete"
        description={
          statusSensivelExclusao
            ? `Atenção: este frete está com status ${frete?.status}. A exclusão é irreversível — confirme com sua senha.`
            : 'Esta ação é irreversível. Digite sua senha para confirmar.'
        }
      />

      <PasswordConfirmDialog
        open={senhaEditAberta}
        onOpenChange={setSenhaEditAberta}
        onConfirm={handleConfirmarEdit}
        loading={loadingEditSenha}
        title="Editar Frete"
        description={
          statusSensivelEdicao
            ? `Atenção: este frete está com status ${frete?.status}. Confirme sua senha para liberar a edição.`
            : 'Digite sua senha para liberar a edição dos dados do frete.'
        }
      />

      {/* Item 14: Modal de edição pré-preenchido */}
      {editAberto && (
        <FreteFormModal
          open={editAberto}
          onClose={() => {
            setEditAberto(false)
            queryClient.invalidateQueries({ queryKey: ['frete', freteId] })
          }}
          freteId={freteId}
          defaultValues={editDefaultValues}
        />
      )}
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
  custoAgregadoExistente: number | null
  custoAgregado: string
  setCustoAgregado: (v: string) => void
  valorAdiantamentoProgramado: string
  setValorAdiantamentoProgramado: (v: string) => void
  temPlacasSeparadas: boolean
  setTemPlacasSeparadas: (v: boolean) => void
  placaCarreta: string
  setPlacaCarreta: (v: string) => void
  placaCavalo: string
  setPlacaCavalo: (v: string) => void
  motoristaFuncionarioAgregado: boolean
  setMotoristaFuncionarioAgregado: (v: boolean) => void
  dataCarregamentoExistente: string | null
  dataCarregamentoForm: string
  setDataCarregamentoForm: (v: string) => void
  dataEntregaPrevistaExistente: string | null
  dataEntregaPrevistaForm: string
  setDataEntregaPrevistaForm: (v: string) => void
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
  dataDescarga: string
  setDataDescarga: (v: string) => void
}

function TransitionForm({
  status, nextStatus, isPending, onAvancar,
  motoristas, veiculos, usarDisponiveis,
  motoristaId, setMotoristaId, veiculoId, setVeiculoId,
  custoAgregadoExistente, custoAgregado, setCustoAgregado,
  valorAdiantamentoProgramado, setValorAdiantamentoProgramado,
  temPlacasSeparadas, setTemPlacasSeparadas,
  placaCarreta, setPlacaCarreta,
  placaCavalo, setPlacaCavalo,
  motoristaFuncionarioAgregado, setMotoristaFuncionarioAgregado,
  dataCarregamentoExistente, dataCarregamentoForm, setDataCarregamentoForm,
  dataEntregaPrevistaExistente, dataEntregaPrevistaForm, setDataEntregaPrevistaForm,
  numeroGr, setNumeroGr,
  chaveCte, setChaveCte, chaveCteError,
  numeroContrato, setNumeroContrato, numeroCiot, setNumeroCiot,
  valorAdiantamento, setValorAdiantamento,
  dataDescarga, setDataDescarga,
}: TransitionFormProps) {
  if (!nextStatus) return null

  // ABERTO → PROGRAMADO
  if (status === 'ABERTO') {
    const veiculoSelecionado = veiculos.find(v => v.id === veiculoId) ?? null
    const custoOk = custoAgregadoExistente !== null || !!custoAgregado
    const podeProgramar =
      !!motoristaId && !!veiculoId &&
      (!!dataCarregamentoExistente || !!dataCarregamentoForm) &&
      (!!dataEntregaPrevistaExistente || !!dataEntregaPrevistaForm) &&
      custoOk

    function handleVeiculoChange(id: string) {
      setVeiculoId(id)
      const v = veiculos.find(vv => vv.id === id)
      if (v?.tem_placas_separadas) {
        setTemPlacasSeparadas(true)
        setPlacaCavalo(v.placa ?? '')
        setPlacaCarreta(v.placa_carreta ?? '')
      } else {
        setTemPlacasSeparadas(false)
        setPlacaCavalo('')
        setPlacaCarreta('')
      }
    }

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
            <Select onValueChange={handleVeiculoChange} value={veiculoId}>
              <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
              <SelectContent>
                {veiculos.map(v =>
                  <SelectItem key={v.id} value={v.id}>{v.placa} — {v.tipo}</SelectItem>
                )}
              </SelectContent>
            </Select>
          </div>

          {/* Cavalo e carreta com placas separadas */}
          {veiculoId && (
            <div className="col-span-2 space-y-2">
              <div className="flex items-center gap-2">
                <Checkbox
                  id="tem-placas-separadas"
                  checked={temPlacasSeparadas}
                  onCheckedChange={(v) => {
                    setTemPlacasSeparadas(v === true)
                    if (!v) {
                      setPlacaCavalo('')
                      setPlacaCarreta('')
                    } else {
                      setPlacaCavalo(veiculoSelecionado?.placa ?? '')
                      setPlacaCarreta(veiculoSelecionado?.placa_carreta ?? '')
                    }
                  }}
                />
                <label htmlFor="tem-placas-separadas" className="text-xs text-muted-foreground cursor-pointer select-none">
                  Cavalo e carreta com placas diferentes
                </label>
              </div>
              {temPlacasSeparadas && (
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs text-muted-foreground">Placa do Cavalo (trator)</label>
                    <Input
                      value={placaCavalo}
                      onChange={e => setPlacaCavalo(e.target.value.toUpperCase())}
                      placeholder="Ex: ABC1D23"
                      className="uppercase"
                      maxLength={8}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs text-muted-foreground">Placa da Carreta</label>
                    <Input
                      value={placaCarreta}
                      onChange={e => setPlacaCarreta(e.target.value.toUpperCase())}
                      placeholder="Ex: ABC1D23"
                      className="uppercase"
                      maxLength={8}
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Data de carregamento — somente se não definida na criação */}
          {!dataCarregamentoExistente && (
            <div className="space-y-1 col-span-2">
              <label className="text-xs text-muted-foreground">Data de Carregamento *</label>
              <Input
                type="date"
                value={dataCarregamentoForm}
                onChange={e => setDataCarregamentoForm(e.target.value)}
                className="max-w-xs"
              />
            </div>
          )}
          {!dataEntregaPrevistaExistente && (
            <div className="space-y-1 col-span-2">
              <label className="text-xs text-muted-foreground">Data Prevista de Entrega *</label>
              <Input
                type="date"
                value={dataEntregaPrevistaForm}
                onChange={e => setDataEntregaPrevistaForm(e.target.value)}
                className="max-w-xs"
              />
            </div>
          )}

          {/* Custo do Agregado — obrigatório se não definido na criação */}
          {custoAgregadoExistente !== null ? (
            <div className="col-span-2 space-y-1 p-3 bg-muted/40 rounded-md border">
              <p className="text-xs text-muted-foreground font-medium">Custo do Agregado (R$)</p>
              <p className="text-sm font-semibold">
                R$ {custoAgregadoExistente.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </p>
              <p className="text-xs text-muted-foreground/70">Definido na criação — use Editar para alterar</p>
            </div>
          ) : (
            <div className="space-y-1 col-span-2">
              <label className="text-xs text-muted-foreground">
                Custo do Agregado (R$) * — valor total a pagar ao proprietário
              </label>
              <Input
                type="number"
                step="0.01"
                min="0.01"
                value={custoAgregado}
                onChange={e => setCustoAgregado(e.target.value)}
                placeholder="0,00"
                className="max-w-xs"
              />
            </div>
          )}

          {/* Motorista funcionário agregado ao proprietário */}
          {veiculoId && (
            <div className="col-span-2 flex items-start gap-2 pt-1">
              <Checkbox
                id="motorista-funcionario-agregado"
                checked={motoristaFuncionarioAgregado}
                onCheckedChange={(v) => setMotoristaFuncionarioAgregado(v === true)}
              />
              <div>
                <label htmlFor="motorista-funcionario-agregado" className="text-xs text-muted-foreground cursor-pointer select-none">
                  Motorista é funcionário agregado ao proprietário do veículo
                </label>
                <p className="text-xs text-muted-foreground/60">
                  Pela ANTT, o adiantamento pode ser pago ao proprietário ou ao seu funcionário
                </p>
              </div>
            </div>
          )}

          {/* Valor de Adiantamento */}
          <div className="space-y-1 col-span-2">
            <label className="text-xs text-muted-foreground">
              Valor de Adiantamento (R$)
            </label>
            <Input
              type="number"
              step="0.01"
              min="0.01"
              value={valorAdiantamentoProgramado}
              onChange={e => setValorAdiantamentoProgramado(e.target.value)}
              placeholder="0,00"
              className="max-w-xs"
            />
          </div>
        </div>
        <Button
          size="sm"
          onClick={() => onAvancar('PROGRAMADO')}
          disabled={!podeProgramar || isPending}
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
      <p className="text-sm text-muted-foreground">
        Realize o checklist abaixo. Após concluído, acesse <strong>Pagamentos</strong> para confirmar o adiantamento e liberar a viagem.
      </p>
    )
  }

  if (status === 'EM_VIAGEM') {
    return (
      <div className="space-y-3">
        <p className="text-sm font-medium">Informe a data de descarga para concluir a viagem</p>
        <div className="space-y-1">
          <label className="text-xs text-muted-foreground">Data de Descarga *</label>
          <Input
            type="date"
            value={dataDescarga}
            onChange={e => setDataDescarga(e.target.value)}
            className="max-w-xs"
          />
        </div>
        <Button
          size="sm"
          onClick={() => onAvancar('CONCLUIDA')}
          disabled={!dataDescarga || isPending}
        >
          Finalizar Viagem
        </Button>
      </div>
    )
  }

  return null
}

// ─── Painel de Liberação ─────────────────────────────────────────────────────

function LiberacaoPanel({
  freteId,
  frete,
  papel,
}: {
  freteId: string
  frete: FreteCompleto
  papel: string | null
}) {
  const queryClient = useQueryClient()

  const { data: checklistData, isLoading: loadingChecklist } = useQuery({
    queryKey: ['checklist', freteId],
    queryFn: async () => {
      const r = await fetch(`/api/fretes/${freteId}/checklist`)
      if (!r.ok) return { itens: [], respostas: [] }
      return r.json() as Promise<{
        itens: { id: string; descricao: string; ordem: number }[]
        respostas: { item_id: string; marcado_em: string }[]
      }>
    },
  })

  const itens = checklistData?.itens ?? []
  const respostas = checklistData?.respostas ?? []
  const marcadosIds = new Set(respostas.map(r => r.item_id))
  const totalMarcados = marcadosIds.size
  const totalItens = itens.length
  const todosMarcados = totalItens > 0 && totalMarcados >= totalItens

  const podeMarcar = ['ADMIN', 'SUPERVISOR', 'CONFERENTE'].includes(papel ?? '')

  async function toggleItem(item_id: string, marcado: boolean) {
    await fetch(`/api/fretes/${freteId}/checklist`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ item_id, marcado }),
    })
    queryClient.invalidateQueries({ queryKey: ['checklist', freteId] })
    queryClient.invalidateQueries({ queryKey: ['frete', freteId] })
    queryClient.invalidateQueries({ queryKey: ['pagamentos'] })
  }

  const m = frete.motoristas
  const v = frete.veiculos
  // Case A: motorista é o próprio proprietário do veículo (CPF idêntico)
  const motoristaEProprietario = !!(m && v && m.cpf && v.cpf_proprietario && m.cpf === v.cpf_proprietario)
  // Case B: motorista é funcionário agregado ao proprietário (marcado explicitamente)
  const funcionarioAgregado = !!frete.motorista_e_funcionario_agregado

  return (
    <div className="p-4 border border-amber-200 bg-amber-50 rounded-lg space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold flex items-center gap-2 text-amber-800">
          <FileText className="h-4 w-4" />
          Conferência de Liberação
        </h3>
        {!loadingChecklist && totalItens > 0 && (
          <span className="text-xs text-muted-foreground">{totalMarcados}/{totalItens} itens</span>
        )}
      </div>

      {loadingChecklist ? (
        <div className="space-y-2">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-5 w-full" />)}
        </div>
      ) : (
        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            Marque cada item após conferência
          </p>
          {itens.map(item => {
            const checked = marcadosIds.has(item.id)
            return (
              <div key={item.id} className="flex items-center gap-2 text-sm">
                <Checkbox
                  id={`check-${item.id}`}
                  checked={checked}
                  onCheckedChange={val => podeMarcar && toggleItem(item.id, val === true)}
                  disabled={!podeMarcar}
                />
                <label
                  htmlFor={`check-${item.id}`}
                  className={`cursor-pointer select-none ${checked ? 'line-through text-muted-foreground' : ''}`}
                >
                  {item.descricao}
                </label>
              </div>
            )
          })}
        </div>
      )}

      {todosMarcados && (
        <div className="border border-green-200 bg-green-50 rounded-md p-3 text-sm text-green-800 flex items-start gap-2">
          <CheckCircle2 className="h-4 w-4 mt-0.5 shrink-0" />
          <span>
            Checklist concluído. Acesse <strong>Pagamentos</strong> para confirmar o adiantamento e liberar a viagem.
          </span>
        </div>
      )}

      <div className="border-t border-amber-200 pt-3 grid grid-cols-2 gap-4 text-sm">
        {m && (
          <div className="space-y-1">
            <p className="font-medium text-xs text-muted-foreground uppercase tracking-wide">Motorista</p>
            <p>{m.nome}</p>
            {funcionarioAgregado && (
              <p className="text-xs text-amber-700 font-medium">Funcionário agregado ao proprietário</p>
            )}
            <p className="text-muted-foreground">CNH: {m.cnh}</p>
            {m.validade_cnh && (
              <p className="text-muted-foreground">
                Validade: {new Date(m.validade_cnh + 'T00:00:00').toLocaleDateString('pt-BR')}
              </p>
            )}
          </div>
        )}

        <div className="space-y-1">
          <p className="font-medium text-xs text-muted-foreground uppercase tracking-wide">Adiantamento</p>
          {frete.valor_adiantamento ? (
            <p className="text-lg font-semibold text-amber-900">
              R$ {frete.valor_adiantamento.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </p>
          ) : (
            <p className="text-muted-foreground italic">Não informado</p>
          )}
          {frete.custo_agregado && (
            <p className="text-xs text-muted-foreground">
              Custo total: R$ {frete.custo_agregado.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </p>
          )}
        </div>

        {/* Case A: motorista é o próprio proprietário */}
        {motoristaEProprietario && m && (m.banco || m.agencia_conta || m.chave_pix) && (
          <div className="col-span-2 space-y-1 bg-green-50 border border-green-200 rounded-md p-3">
            <p className="font-medium text-xs text-green-800 uppercase tracking-wide flex items-center gap-1">
              <CreditCard className="h-3 w-3" /> Dados para Pagamento — Motorista / Proprietário
            </p>
            {m.banco && <p className="text-muted-foreground">Banco: {m.banco}</p>}
            {m.agencia_conta && <p className="text-muted-foreground">Ag/Conta: {m.agencia_conta}</p>}
            {m.chave_pix && <p className="text-muted-foreground">PIX: {m.chave_pix}</p>}
          </div>
        )}

        {/* Case B e C: motorista não é o proprietário — exibe proprietário sempre */}
        {!motoristaEProprietario && v && (v.banco_proprietario || v.agencia_conta_proprietario || v.chave_pix_proprietario) && (
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

        {/* Case B: funcionário agregado — exibe também os dados do motorista */}
        {!motoristaEProprietario && funcionarioAgregado && m && (m.banco || m.agencia_conta || m.chave_pix) && (
          <div className="col-span-2 space-y-1 bg-amber-50 border border-amber-200 rounded-md p-3">
            <p className="font-medium text-xs text-amber-800 uppercase tracking-wide flex items-center gap-1">
              <CreditCard className="h-3 w-3" /> Dados Bancários — Motorista (funcionário agregado)
            </p>
            <p className="text-xs text-amber-700/80 mb-1">
              O pagamento pode ser feito ao proprietário ou ao motorista conforme acordado
            </p>
            {m.banco && <p className="text-muted-foreground">Banco: {m.banco}</p>}
            {m.agencia_conta && <p className="text-muted-foreground">Ag/Conta: {m.agencia_conta}</p>}
            {m.chave_pix && <p className="text-muted-foreground">PIX: {m.chave_pix}</p>}
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Formulário de cancelamento ───────────────────────────────────────────────

function CancelForm({ onConfirm, onCancel, loading }: {
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
        <Button size="sm" variant="destructive" onClick={() => onConfirm(motivo)} disabled={!motivo.trim() || loading}>
          Confirmar
        </Button>
        <Button size="sm" variant="outline" onClick={onCancel}>Voltar</Button>
      </div>
    </div>
  )
}

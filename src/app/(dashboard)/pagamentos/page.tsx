'use client'

import { useState, useEffect } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'
import { PasswordConfirmDialog } from '@/components/common/PasswordConfirmDialog'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Input } from '@/components/ui/input'
import { ShieldAlert, Search, Building2, AlertTriangle } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { MapPin, Calendar, CreditCard, CheckCircle2, Truck } from 'lucide-react'
import type { FreteComRelacoes } from '@/services/fretes.service'

// ---------------------------------------------------------------------------
// Queries
// ---------------------------------------------------------------------------

async function fetchAdiantamentosPendentes(): Promise<FreteComRelacoes[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('fretes')
    .select(`
      *,
      clientes(razao_social),
      motoristas(nome, banco, agencia_conta, chave_pix, cpf),
      veiculos(placa, tipo, tipo_veiculo, cpf_proprietario, proprietario, banco_proprietario, agencia_conta_proprietario, chave_pix_proprietario)
    `)
    .eq('status', 'AGUARDANDO_LIBERACAO')
    .is('adiantamento_pago_em', null)
    .not('valor_adiantamento', 'is', null)
    .order('atualizado_em', { ascending: false })

  if (error) throw error
  return (data ?? []) as FreteComRelacoes[]
}

async function fetchPagamentosFinalPendentes(): Promise<FreteComRelacoes[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('fretes')
    .select(`
      *,
      clientes(razao_social),
      motoristas(nome, banco, agencia_conta, chave_pix, cpf),
      veiculos(placa, tipo, tipo_veiculo, cpf_proprietario, proprietario, banco_proprietario, agencia_conta_proprietario, chave_pix_proprietario)
    `)
    .eq('status', 'CONCLUIDA')
    .is('pago_em', null)
    .order('atualizado_em', { ascending: false })

  if (error) throw error
  return (data ?? []) as FreteComRelacoes[]
}

async function fetchPagos(): Promise<FreteComRelacoes[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('fretes')
    .select(`
      *,
      clientes(razao_social),
      motoristas(nome),
      veiculos(placa, tipo)
    `)
    .eq('status', 'CONCLUIDA')
    .not('pago_em', 'is', null)
    .order('pago_em', { ascending: false })
    .limit(50)

  if (error) throw error
  return (data ?? []) as FreteComRelacoes[]
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function PagamentosPage() {
  const supabase = createClient()
  const [papel, setPapel] = useState<string | null>(null)
  const [papelCarregado, setPapelCarregado] = useState(false)
  const [busca, setBusca] = useState('')
  const [bancoDetalhe, setBancoDetalhe] = useState<FreteComRelacoes | null>(null)

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) return
      const { data } = await supabase.from('users').select('papel').eq('id', user.id).single()
      setPapel(data?.papel ?? null)
      setPapelCarregado(true)
    })
  }, [])

  const { data: adiantamentos = [], isLoading: loadingAdiantamentos } = useQuery({
    queryKey: ['pagamentos', 'adiantamentos'],
    queryFn: fetchAdiantamentosPendentes,
    enabled: papelCarregado && papel !== 'CONFERENTE',
  })

  const { data: finaisPendentes = [], isLoading: loadingFinais } = useQuery({
    queryKey: ['pagamentos', 'finais-pendentes'],
    queryFn: fetchPagamentosFinalPendentes,
    enabled: papelCarregado && papel !== 'CONFERENTE',
  })

  const { data: pagos = [], isLoading: loadingPagos } = useQuery({
    queryKey: ['pagamentos', 'pagos'],
    queryFn: fetchPagos,
    enabled: papelCarregado && papel !== 'CONFERENTE',
  })

  if (!papelCarregado) {
    return (
      <div className="flex flex-col gap-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-40 w-full" />
      </div>
    )
  }

  const filtrarFrete = (frete: FreteComRelacoes) => {
    if (!busca.trim()) return true
    const q = busca.toLowerCase()
    return (
      (frete.numero_frete?.toLowerCase().includes(q) ?? false) ||
      (frete.numero_contrato?.toLowerCase().includes(q) ?? false)
    )
  }

  const adiantamentosFiltrados = adiantamentos.filter(filtrarFrete)
  const finaisFiltrados = finaisPendentes.filter(filtrarFrete)
  const pagosFiltrados = pagos.filter(filtrarFrete)

  if (papel === 'CONFERENTE') {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3 text-muted-foreground">
        <ShieldAlert className="h-10 w-10" />
        <p className="text-sm font-medium">Acesso restrito</p>
        <p className="text-xs">Apenas ADMINs e SUPERVISORs podem acessar a área de Pagamentos.</p>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-xl font-semibold">Pagamentos</h1>
        <p className="text-sm text-muted-foreground">Gerencie adiantamentos e pagamentos finais de fretes</p>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Buscar por Nº pedido ou Nº contrato..."
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Seção 1: Adiantamentos Pendentes */}
      <section className="space-y-3">
        <div className="flex items-center gap-2">
          <h2 className="text-base font-medium">Adiantamentos Pendentes</h2>
          {!loadingAdiantamentos && adiantamentos.length > 0 && (
            <Badge variant="destructive" className="rounded-full px-2 py-0 text-xs">
              {adiantamentos.length}
            </Badge>
          )}
        </div>
        <p className="text-xs text-muted-foreground">
          Fretes aguardando confirmação do adiantamento. Confirmar libera automaticamente a viagem.
        </p>

        {loadingAdiantamentos ? (
          <div className="space-y-3">
            {[1, 2].map((i) => <Skeleton key={i} className="h-44 rounded-lg" />)}
          </div>
        ) : adiantamentosFiltrados.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground border-2 border-dashed rounded-xl text-sm">
            Nenhum adiantamento pendente
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {adiantamentosFiltrados.map((frete) => (
              <FreteCardAdiantamento key={frete.id} frete={frete} onCardClick={() => setBancoDetalhe(frete)} />
            ))}
          </div>
        )}
      </section>

      {/* Seção 2: Pagamentos Finais Pendentes */}
      <section className="space-y-3">
        <div className="flex items-center gap-2">
          <h2 className="text-base font-medium">Pagamentos Finais Pendentes</h2>
          {!loadingFinais && finaisPendentes.length > 0 && (
            <Badge variant="destructive" className="rounded-full px-2 py-0 text-xs">
              {finaisPendentes.length}
            </Badge>
          )}
        </div>
        <p className="text-xs text-muted-foreground">
          Viagens concluídas aguardando pagamento do saldo restante ao proprietário.
        </p>

        {loadingFinais ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => <Skeleton key={i} className="h-44 rounded-lg" />)}
          </div>
        ) : finaisFiltrados.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground border-2 border-dashed rounded-xl text-sm">
            Nenhuma viagem aguardando pagamento final
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {finaisFiltrados.map((frete) => (
              <FreteCardPagamentoFinal key={frete.id} frete={frete} onCardClick={() => setBancoDetalhe(frete)} />
            ))}
          </div>
        )}
      </section>

      {/* Seção 3: Histórico */}
      <section className="space-y-3">
        <h2 className="text-base font-medium">Histórico de Pagamentos</h2>

        {loadingPagos ? (
          <div className="space-y-3">
            {[1, 2].map((i) => <Skeleton key={i} className="h-32 rounded-lg" />)}
          </div>
        ) : pagosFiltrados.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground border-2 border-dashed rounded-xl text-sm">
            Nenhum pagamento registrado ainda
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {pagosFiltrados.map((frete) => (
              <FreteCardPago key={frete.id} frete={frete} />
            ))}
          </div>
        )}
      </section>

      <ModalDadosBancarios
        frete={bancoDetalhe}
        open={!!bancoDetalhe}
        onOpenChange={(v) => !v && setBancoDetalhe(null)}
      />
    </div>
  )
}

// ---------------------------------------------------------------------------
// Modal — dados bancários
// ---------------------------------------------------------------------------

function BlocosBancarios({ frete }: { frete: FreteComRelacoes }) {
  const m = frete.motoristas
  const v = frete.veiculos
  const isFrota = v?.tipo_veiculo === 'FROTA'
  const funcionarioAgregado = !!frete.motorista_e_funcionario_agregado

  function BlocoItem({ label, nome, banco, conta, pix, variant = 'green' }: {
    label: string; nome?: string | null; banco?: string | null
    conta?: string | null; pix?: string | null; variant?: 'green' | 'amber'
  }) {
    const bg = variant === 'green' ? 'bg-green-50 border-green-200' : 'bg-amber-50 border-amber-200'
    const titleColor = variant === 'green' ? 'text-green-800' : 'text-amber-800'
    return (
      <div className={`border rounded-lg p-4 space-y-3 ${bg}`}>
        <p className={`text-xs font-medium uppercase tracking-wide ${titleColor}`}>{label}</p>
        {nome && <p className="font-semibold text-base">{nome}</p>}
        {banco ? (
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Banco</span>
              <span className="font-medium">{banco}</span>
            </div>
            {conta && (
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Agência / Conta</span>
                <span className="font-mono font-medium">{conta}</span>
              </div>
            )}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground italic">Dados bancários não cadastrados</p>
        )}
        {pix && (
          <div className="bg-white/60 border border-current/10 rounded-md p-3">
            <p className={`text-xs font-medium mb-1 ${titleColor}`}>Chave PIX</p>
            <p className="font-mono text-sm break-all">{pix}</p>
          </div>
        )}
      </div>
    )
  }

  if (isFrota) {
    return (
      <div className="border rounded-lg p-4 space-y-2 bg-blue-50 border-blue-200">
        <p className="text-xs font-medium uppercase tracking-wide text-blue-800">Veículo de Frota</p>
        <p className="text-sm text-muted-foreground">
          Motorista empregado — remuneração via folha de pagamento. Não há pagamento externo a realizar.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <BlocoItem
        label="Proprietário do Veículo"
        nome={v?.proprietario ?? v?.placa}
        banco={v?.banco_proprietario}
        conta={v?.agencia_conta_proprietario}
        pix={v?.chave_pix_proprietario}
      />
      {funcionarioAgregado && m && (m.banco || m.chave_pix) && (
        <BlocoItem
          label="Motorista (funcionário agregado)"
          nome={m.nome}
          banco={m.banco}
          conta={m.agencia_conta}
          pix={m.chave_pix}
          variant="amber"
        />
      )}
      {funcionarioAgregado && (
        <p className="text-xs text-amber-700">
          O pagamento pode ser feito ao proprietário ou ao motorista (funcionário agregado) conforme acordado
        </p>
      )}
    </div>
  )
}

function ModalDadosBancarios({
  frete,
  open,
  onOpenChange,
}: {
  frete: FreteComRelacoes | null
  open: boolean
  onOpenChange: (v: boolean) => void
}) {
  if (!frete) return null
  const m = frete.motoristas
  const v = frete.veiculos

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Dados Bancários para Pagamento
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="bg-muted/50 rounded-lg p-3 text-sm space-y-1">
            <p className="font-semibold">{frete.numero_frete}</p>
            <p className="text-muted-foreground">
              {frete.origem_cidade}/{frete.origem_uf} → {frete.destino_cidade}/{frete.destino_uf}
            </p>
            {m && <p className="text-muted-foreground">Motorista: {m.nome}</p>}
            {v && <p className="text-muted-foreground">Veículo: {v.placa}</p>}
          </div>
          <BlocosBancarios frete={frete} />
        </div>
      </DialogContent>
    </Dialog>
  )
}

// ---------------------------------------------------------------------------
// Card — adiantamento pendente (Item 11 — Seção 1)
// ---------------------------------------------------------------------------

function FreteCardAdiantamento({ frete, onCardClick }: { frete: FreteComRelacoes; onCardClick: () => void }) {
  const [dialogAberto, setDialogAberto] = useState(false)
  const [loading, setLoading] = useState(false)
  const queryClient = useQueryClient()

  async function handleConfirmar(senha: string) {
    setLoading(true)
    try {
      const supabase = createClient()
      const { data: userData, error: userError } = await supabase.auth.getUser()
      if (userError || !userData.user?.email) {
        toast.error('Não foi possível identificar o usuário.')
        return
      }
      const { error: authError } = await supabase.auth.signInWithPassword({
        email: userData.user.email,
        password: senha,
      })
      if (authError) {
        toast.error('Senha incorreta. Tente novamente.')
        return
      }

      const res = await fetch(`/api/fretes/${frete.id}/adiantamento`, { method: 'POST' })
      if (!res.ok) {
        const body = await res.json().catch(() => ({ error: res.statusText }))
        toast.error(body.error ?? 'Erro ao confirmar adiantamento.')
        return
      }

      await queryClient.invalidateQueries({ queryKey: ['pagamentos'] })
      await queryClient.invalidateQueries({ queryKey: ['fretes'] })
      toast.success('Adiantamento confirmado! Frete liberado para EM VIAGEM.')
      setDialogAberto(false)
    } finally {
      setLoading(false)
    }
  }

  const m = frete.motoristas
  const v = frete.veiculos
  const isFrota = v?.tipo_veiculo === 'FROTA'
  const funcionarioAgregado = !!frete.motorista_e_funcionario_agregado

  return (
    <>
      <Card className="border border-amber-200 bg-amber-50 cursor-pointer" onClick={onCardClick}>
        <CardContent className="p-4 space-y-3">
          <div className="flex items-start justify-between gap-2">
            <span className="font-bold tracking-wide text-amber-900">
              PEDIDO: {frete.numero_frete}
            </span>
            <Badge variant="outline" className="bg-amber-100 text-amber-800 border-amber-300 shrink-0">
              Adiantamento
            </Badge>
          </div>

          {frete.clientes && (
            <p className="text-sm font-medium truncate">{frete.clientes.razao_social}</p>
          )}

          <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <MapPin className="h-3.5 w-3.5 shrink-0" />
            <span className="truncate">
              {frete.origem_cidade}/{frete.origem_uf} → {frete.destino_cidade}/{frete.destino_uf}
            </span>
          </div>

          {m && (
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Truck className="h-3 w-3 shrink-0" />
              <span>{m.nome} — {v?.placa}</span>
            </div>
          )}

          {(frete.numero_contrato || frete.chave_cte) && (
            <div className="flex flex-col gap-0.5 text-xs text-muted-foreground">
              {frete.numero_contrato && (
                <span>Contrato: <span className="font-medium text-foreground">{frete.numero_contrato}</span></span>
              )}
              {frete.chave_cte && (
                <span className="font-mono truncate">CT-e: {frete.chave_cte}</span>
              )}
            </div>
          )}

          {/* Valor do adiantamento destacado */}
          {frete.valor_adiantamento && (
            <div className="bg-white border border-amber-200 rounded-md p-3">
              <p className="text-xs text-muted-foreground">Valor do adiantamento</p>
              <p className="text-xl font-bold text-amber-900">
                R$ {frete.valor_adiantamento.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </p>
              {frete.custo_agregado && (
                <p className="text-xs text-muted-foreground mt-0.5">
                  Custo total: R$ {frete.custo_agregado.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </p>
              )}
            </div>
          )}

          {/* Dados bancários — agregado exibe proprietário do veículo; frota não exibe */}
          {!isFrota && (
            <div className="border-t pt-2 space-y-2">
              {v && (v.banco_proprietario || v.chave_pix_proprietario) ? (
                <div className="space-y-1">
                  <p className="text-xs font-medium flex items-center gap-1.5 text-green-800">
                    <CreditCard className="h-3 w-3" /> Proprietário ({v.proprietario ?? v.placa})
                  </p>
                  {v.banco_proprietario && <p className="text-xs">{v.banco_proprietario} · {v.agencia_conta_proprietario}</p>}
                  {v.chave_pix_proprietario && <p className="text-xs text-muted-foreground">PIX: {v.chave_pix_proprietario}</p>}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground italic">Dados bancários do proprietário não cadastrados</p>
              )}
              {funcionarioAgregado && m && (m.banco || m.chave_pix) && (
                <div className="space-y-1 pt-1 border-t border-amber-200">
                  <p className="text-xs font-medium flex items-center gap-1.5 text-amber-800">
                    <CreditCard className="h-3 w-3" /> Motorista (funcionário agregado)
                  </p>
                  {m.banco && <p className="text-xs">{m.banco} · {m.agencia_conta}</p>}
                  {m.chave_pix && <p className="text-xs text-muted-foreground">PIX: {m.chave_pix}</p>}
                </div>
              )}
            </div>
          )}

          <div className="border-t pt-3 space-y-2" onClick={(e) => e.stopPropagation()}>
            {!frete.checklist_liberacao_ok ? (
              <>
                <p className="text-xs text-amber-700 flex items-center gap-1">
                  <AlertTriangle className="h-3 w-3 shrink-0" />
                  Checklist de conferência pendente
                </p>
                <Button className="w-full" size="sm" disabled variant="outline">
                  <CheckCircle2 className="h-4 w-4 mr-1.5" />
                  Aguardando Checklist
                </Button>
              </>
            ) : (
              <Button
                className="w-full bg-amber-600 hover:bg-amber-700 text-white"
                size="sm"
                onClick={() => setDialogAberto(true)}
              >
                <CheckCircle2 className="h-4 w-4 mr-1.5" />
                Confirmar Adiantamento e Liberar Viagem
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      <PasswordConfirmDialog
        open={dialogAberto}
        onOpenChange={setDialogAberto}
        onConfirm={handleConfirmar}
        loading={loading}
        title="Confirmar Adiantamento"
        description={`Confirme sua senha para registrar o adiantamento do frete ${frete.numero_frete} e liberar a viagem.`}
      />
    </>
  )
}

// ---------------------------------------------------------------------------
// Card — pagamento final pendente (Item 11 — Seção 2)
// ---------------------------------------------------------------------------

function FreteCardPagamentoFinal({ frete, onCardClick }: { frete: FreteComRelacoes; onCardClick: () => void }) {
  const [dialogAberto, setDialogAberto] = useState(false)
  const [loading, setLoading] = useState(false)
  const queryClient = useQueryClient()

  async function handleConfirmar(senha: string) {
    setLoading(true)
    try {
      const supabase = createClient()
      const { data: userData, error: userError } = await supabase.auth.getUser()
      if (userError || !userData.user?.email) {
        toast.error('Não foi possível identificar o usuário.')
        return
      }
      const { error: authError } = await supabase.auth.signInWithPassword({
        email: userData.user.email,
        password: senha,
      })
      if (authError) {
        toast.error('Senha incorreta. Tente novamente.')
        return
      }

      const res = await fetch(`/api/fretes/${frete.id}/pagamento`, { method: 'POST' })
      if (!res.ok) {
        const body = await res.json().catch(() => ({ error: res.statusText }))
        toast.error(body.error ?? 'Erro ao registrar pagamento.')
        return
      }

      await queryClient.invalidateQueries({ queryKey: ['pagamentos'] })
      await queryClient.invalidateQueries({ queryKey: ['fretes'] })
      toast.success('Pagamento final confirmado com sucesso!')
      setDialogAberto(false)
    } finally {
      setLoading(false)
    }
  }

  const dataConclusao = frete.atualizado_em
    ? new Date(frete.atualizado_em).toLocaleDateString('pt-BR', {
        day: '2-digit', month: '2-digit', year: 'numeric',
        hour: '2-digit', minute: '2-digit',
      })
    : null

  const restante = frete.custo_agregado && frete.valor_adiantamento
    ? frete.custo_agregado - frete.valor_adiantamento
    : frete.custo_agregado ?? null

  const m = frete.motoristas
  const v = frete.veiculos
  const isFrota = v?.tipo_veiculo === 'FROTA'
  const funcionarioAgregado = !!frete.motorista_e_funcionario_agregado

  return (
    <>
      <Card className="border bg-white cursor-pointer" onClick={onCardClick}>
        <CardContent className="p-4 space-y-3">
          <div className="flex items-start justify-between gap-2">
            <span className="font-bold tracking-wide text-[#3B6D11]">
              PEDIDO: {frete.numero_frete}
            </span>
            <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 shrink-0">
              Pag. Final
            </Badge>
          </div>

          {frete.clientes && (
            <p className="text-sm font-medium truncate">{frete.clientes.razao_social}</p>
          )}

          <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <MapPin className="h-3.5 w-3.5 shrink-0" />
            <span className="truncate">
              {frete.origem_cidade}/{frete.origem_uf} → {frete.destino_cidade}/{frete.destino_uf}
            </span>
          </div>

          {dataConclusao && (
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Calendar className="h-3 w-3 shrink-0" />
              <span>Concluída em {dataConclusao}</span>
            </div>
          )}

          {(frete.numero_contrato || frete.chave_cte) && (
            <div className="flex flex-col gap-0.5 text-xs text-muted-foreground">
              {frete.numero_contrato && (
                <span>Contrato: <span className="font-medium text-foreground">{frete.numero_contrato}</span></span>
              )}
              {frete.chave_cte && (
                <span className="font-mono truncate">CT-e: {frete.chave_cte}</span>
              )}
            </div>
          )}

          {/* Detalhe financeiro — custo, adiantamento, restante */}
          <div className="bg-gray-50 rounded-md p-3 space-y-2 text-xs">
            {frete.custo_agregado && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Custo Agregado</span>
                <span className="font-medium">
                  R$ {frete.custo_agregado.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </span>
              </div>
            )}
            {frete.valor_adiantamento && (
              <div className="flex justify-between text-muted-foreground">
                <span>(-) Adiantamento pago</span>
                <span>R$ {frete.valor_adiantamento.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
              </div>
            )}
            {restante !== null && (
              <div className="flex justify-between border-t pt-2 font-semibold text-[#3B6D11]">
                <span>Saldo a pagar</span>
                <span>R$ {restante.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
              </div>
            )}
            {!frete.custo_agregado && frete.valor_frete && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Valor do frete</span>
                <span className="font-medium">
                  R$ {frete.valor_frete.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </span>
              </div>
            )}
          </div>

          {/* Dados bancários — agregado exibe proprietário do veículo; frota não exibe */}
          {!isFrota && (
            <div className="border-t pt-2 space-y-2">
              {v && (v.banco_proprietario || v.chave_pix_proprietario) ? (
                <div className="space-y-1">
                  <p className="text-xs font-medium flex items-center gap-1.5 text-green-800">
                    <CreditCard className="h-3 w-3" /> Proprietário ({v.proprietario ?? v.placa})
                  </p>
                  {v.banco_proprietario && <p className="text-xs">{v.banco_proprietario} · {v.agencia_conta_proprietario}</p>}
                  {v.chave_pix_proprietario && <p className="text-xs text-muted-foreground">PIX: {v.chave_pix_proprietario}</p>}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground italic">Dados bancários do proprietário não cadastrados</p>
              )}
              {funcionarioAgregado && m && (m.banco || m.chave_pix) && (
                <div className="space-y-1 pt-1 border-t border-amber-200">
                  <p className="text-xs font-medium flex items-center gap-1.5 text-amber-800">
                    <CreditCard className="h-3 w-3" /> Motorista (funcionário agregado)
                  </p>
                  {m.banco && <p className="text-xs">{m.banco} · {m.agencia_conta}</p>}
                  {m.chave_pix && <p className="text-xs text-muted-foreground">PIX: {m.chave_pix}</p>}
                </div>
              )}
            </div>
          )}

          <div className="border-t pt-3" onClick={(e) => e.stopPropagation()}>
            <Button
              className="w-full bg-teal-600 hover:bg-teal-700 text-white"
              size="sm"
              onClick={() => setDialogAberto(true)}
            >
              <CheckCircle2 className="h-4 w-4 mr-1.5" />
              Confirmar Pagamento Final
            </Button>
          </div>
        </CardContent>
      </Card>

      <PasswordConfirmDialog
        open={dialogAberto}
        onOpenChange={setDialogAberto}
        onConfirm={handleConfirmar}
        loading={loading}
        title="Confirmar Pagamento Final"
        description={`Confirme sua senha para registrar o pagamento final do frete ${frete.numero_frete}.`}
      />
    </>
  )
}

// ---------------------------------------------------------------------------
// Card — já pago (Seção 3 — Histórico)
// ---------------------------------------------------------------------------

function FreteCardPago({ frete }: { frete: FreteComRelacoes }) {
  const dataPagamento = frete.pago_em
    ? new Date(frete.pago_em).toLocaleDateString('pt-BR', {
        day: '2-digit', month: '2-digit', year: 'numeric',
        hour: '2-digit', minute: '2-digit',
      })
    : null

  return (
    <Card className="border bg-white opacity-80">
      <CardContent className="p-4 space-y-3">
        <div className="flex items-start justify-between gap-2">
          <span className="font-bold tracking-wide text-[#3B6D11]">
            PEDIDO: {frete.numero_frete}
          </span>
          <Badge variant="outline" className="bg-[#EAF3DE] text-[#3B6D11] border-[#3B6D11]/20 shrink-0">
            Pago
          </Badge>
        </div>

        {frete.clientes && (
          <p className="text-sm font-medium truncate">{frete.clientes.razao_social}</p>
        )}

        <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
          <MapPin className="h-3.5 w-3.5 shrink-0" />
          <span className="truncate">
            {frete.origem_cidade}/{frete.origem_uf} → {frete.destino_cidade}/{frete.destino_uf}
          </span>
        </div>

        {dataPagamento && (
          <div className="flex items-center gap-1.5 text-xs text-teal-700 font-medium">
            <CheckCircle2 className="h-3 w-3 shrink-0" />
            <span>Pago em {dataPagamento}</span>
          </div>
        )}

        {(frete.numero_contrato || frete.chave_cte) && (
          <div className="flex flex-col gap-0.5 text-xs text-muted-foreground">
            {frete.numero_contrato && (
              <span>Contrato: <span className="font-medium text-foreground">{frete.numero_contrato}</span></span>
            )}
            {frete.chave_cte && (
              <span className="font-mono truncate">CT-e: {frete.chave_cte}</span>
            )}
          </div>
        )}

        <div className="grid grid-cols-2 gap-2 text-xs">
          {frete.custo_agregado && (
            <div className="bg-gray-50 rounded p-2">
              <p className="text-muted-foreground">Custo Agregado</p>
              <p className="font-semibold">
                R$ {frete.custo_agregado.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </p>
            </div>
          )}
          {frete.valor_frete && (
            <div className="bg-gray-50 rounded p-2">
              <p className="text-muted-foreground">Frete</p>
              <p className="font-semibold">
                R$ {frete.valor_frete.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

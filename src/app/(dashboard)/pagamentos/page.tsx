'use client'

import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'
import { PasswordConfirmDialog } from '@/components/common/PasswordConfirmDialog'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Card, CardContent } from '@/components/ui/card'
import { MapPin, Calendar, CreditCard, CheckCircle2 } from 'lucide-react'
import type { FreteComRelacoes } from '@/services/fretes.service'

// ---------------------------------------------------------------------------
// Queries
// ---------------------------------------------------------------------------

async function fetchPendentes(): Promise<FreteComRelacoes[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('fretes')
    .select(`
      *,
      clientes(razao_social),
      motoristas(nome, cnh, validade_cnh, banco, agencia_conta, chave_pix),
      veiculos(placa, tipo, banco_proprietario, agencia_conta_proprietario, chave_pix_proprietario)
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
      motoristas(nome, cnh, validade_cnh, banco, agencia_conta, chave_pix),
      veiculos(placa, tipo, banco_proprietario, agencia_conta_proprietario, chave_pix_proprietario)
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
  const { data: pendentes = [], isLoading: loadingPendentes } = useQuery({
    queryKey: ['pagamentos', 'pendentes'],
    queryFn: fetchPendentes,
  })

  const { data: pagos = [], isLoading: loadingPagos } = useQuery({
    queryKey: ['pagamentos', 'pagos'],
    queryFn: fetchPagos,
  })

  const isLoading = loadingPendentes || loadingPagos

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Pagamentos</h1>
        <p className="text-sm text-muted-foreground">Gerencie os pagamentos de viagens concluídas</p>
      </div>

      {/* Pendentes */}
      <section className="space-y-3">
        <div className="flex items-center gap-2">
          <h2 className="text-base font-medium">Aguardando pagamento</h2>
          {!isLoading && pendentes.length > 0 && (
            <Badge variant="destructive" className="rounded-full px-2 py-0 text-xs">
              {pendentes.length}
            </Badge>
          )}
        </div>

        {loadingPendentes ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => <Skeleton key={i} className="h-40 rounded-lg" />)}
          </div>
        ) : pendentes.length === 0 ? (
          <div className="text-center py-10 text-muted-foreground border-2 border-dashed rounded-xl text-sm">
            Nenhuma viagem aguardando pagamento
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {pendentes.map((frete) => (
              <FreteCardPendente key={frete.id} frete={frete} />
            ))}
          </div>
        )}
      </section>

      {/* Histórico de pagos */}
      <section className="space-y-3">
        <h2 className="text-base font-medium">Histórico de pagamentos</h2>

        {loadingPagos ? (
          <div className="space-y-3">
            {[1, 2].map((i) => <Skeleton key={i} className="h-32 rounded-lg" />)}
          </div>
        ) : pagos.length === 0 ? (
          <div className="text-center py-10 text-muted-foreground border-2 border-dashed rounded-xl text-sm">
            Nenhum pagamento registrado ainda
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {pagos.map((frete) => (
              <FreteCardPago key={frete.id} frete={frete} />
            ))}
          </div>
        )}
      </section>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Card — pendente de pagamento
// ---------------------------------------------------------------------------

function FreteCardPendente({ frete }: { frete: FreteComRelacoes }) {
  const [dialogAberto, setDialogAberto] = useState(false)
  const [loading, setLoading] = useState(false)
  const queryClient = useQueryClient()

  async function handleConfirmar(senha: string) {
    setLoading(true)
    try {
      const supabase = createClient()

      // 1. Busca o e-mail do usuário atual
      const { data: userData, error: userError } = await supabase.auth.getUser()
      if (userError || !userData.user?.email) {
        toast.error('Não foi possível identificar o usuário.')
        return
      }

      // 2. Verifica a senha
      const { error: authError } = await supabase.auth.signInWithPassword({
        email: userData.user.email,
        password: senha,
      })
      if (authError) {
        toast.error('Senha incorreta. Tente novamente.')
        return
      }

      // 3. Registra o pagamento via API
      const res = await fetch(`/api/fretes/${frete.id}/pagamento`, { method: 'POST' })
      if (!res.ok) {
        const body = await res.json().catch(() => ({ error: res.statusText }))
        toast.error(body.error ?? 'Erro ao registrar pagamento.')
        return
      }

      // 4. Invalida as queries para recarregar listas
      await queryClient.invalidateQueries({ queryKey: ['pagamentos'] })
      await queryClient.invalidateQueries({ queryKey: ['fretes'] })

      toast.success('Pagamento confirmado com sucesso!')
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

  return (
    <>
      <Card className="border bg-white">
        <CardContent className="p-4 space-y-3">
          {/* Cabeçalho */}
          <div className="flex items-start justify-between gap-2">
            <span className="font-bold font-mono text-[#3B6D11] text-lg">{frete.numero_frete}</span>
            <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 shrink-0">
              Pendente
            </Badge>
          </div>

          {/* Cliente */}
          {frete.clientes && (
            <p className="text-sm font-medium truncate">{frete.clientes.razao_social}</p>
          )}

          {/* Rota */}
          <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <MapPin className="h-3.5 w-3.5 shrink-0" />
            <span className="truncate">
              {frete.origem_cidade}/{frete.origem_uf} → {frete.destino_cidade}/{frete.destino_uf}
            </span>
          </div>

          {/* Data conclusão */}
          {dataConclusao && (
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Calendar className="h-3 w-3 shrink-0" />
              <span>Concluída em {dataConclusao}</span>
            </div>
          )}

          {/* Valores */}
          <div className="grid grid-cols-2 gap-2 text-xs">
            {frete.valor_mercadoria && (
              <div className="bg-gray-50 rounded p-2">
                <p className="text-muted-foreground">Mercadoria</p>
                <p className="font-semibold">
                  R$ {frete.valor_mercadoria.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
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

          {/* Dados bancários do motorista */}
          {frete.motoristas && (frete.motoristas.banco || frete.motoristas.chave_pix) && (
            <div className="border-t pt-2 space-y-1">
              <p className="text-xs font-medium flex items-center gap-1.5 text-muted-foreground">
                <CreditCard className="h-3 w-3" /> Banco — {frete.motoristas.nome}
              </p>
              {frete.motoristas.banco && (
                <p className="text-xs">{frete.motoristas.banco} · {frete.motoristas.agencia_conta}</p>
              )}
              {frete.motoristas.chave_pix && (
                <p className="text-xs text-muted-foreground">PIX: {frete.motoristas.chave_pix}</p>
              )}
            </div>
          )}

          {/* Dados bancários do proprietário */}
          {frete.veiculos && (frete.veiculos.banco_proprietario || frete.veiculos.chave_pix_proprietario) && (
            <div className="border-t pt-2 space-y-1">
              <p className="text-xs font-medium flex items-center gap-1.5 text-muted-foreground">
                <CreditCard className="h-3 w-3" /> Banco — Proprietário ({frete.veiculos.placa})
              </p>
              {frete.veiculos.banco_proprietario && (
                <p className="text-xs">{frete.veiculos.banco_proprietario} · {frete.veiculos.agencia_conta_proprietario}</p>
              )}
              {frete.veiculos.chave_pix_proprietario && (
                <p className="text-xs text-muted-foreground">PIX: {frete.veiculos.chave_pix_proprietario}</p>
              )}
            </div>
          )}

          {/* Botão confirmar pagamento */}
          <div className="border-t pt-3">
            <Button
              className="w-full bg-teal-600 hover:bg-teal-700 text-white"
              size="sm"
              onClick={() => setDialogAberto(true)}
            >
              <CheckCircle2 className="h-4 w-4 mr-1.5" />
              Confirmar Pagamento
            </Button>
          </div>
        </CardContent>
      </Card>

      <PasswordConfirmDialog
        open={dialogAberto}
        onOpenChange={setDialogAberto}
        onConfirm={handleConfirmar}
        loading={loading}
        title="Confirmar pagamento"
        description={`Confirme sua senha para registrar o pagamento do frete ${frete.numero_frete}.`}
      />
    </>
  )
}

// ---------------------------------------------------------------------------
// Card — já pago
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
        {/* Cabeçalho */}
        <div className="flex items-start justify-between gap-2">
          <span className="font-bold font-mono text-[#3B6D11] text-lg">{frete.numero_frete}</span>
          <Badge variant="outline" className="bg-[#EAF3DE] text-[#3B6D11] border-[#3B6D11]/20 shrink-0">
            Pago
          </Badge>
        </div>

        {/* Cliente */}
        {frete.clientes && (
          <p className="text-sm font-medium truncate">{frete.clientes.razao_social}</p>
        )}

        {/* Rota */}
        <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
          <MapPin className="h-3.5 w-3.5 shrink-0" />
          <span className="truncate">
            {frete.origem_cidade}/{frete.origem_uf} → {frete.destino_cidade}/{frete.destino_uf}
          </span>
        </div>

        {/* Data pagamento */}
        {dataPagamento && (
          <div className="flex items-center gap-1.5 text-xs text-teal-700 font-medium">
            <CheckCircle2 className="h-3 w-3 shrink-0" />
            <span>Pago em {dataPagamento}</span>
          </div>
        )}

        {/* Valores */}
        <div className="grid grid-cols-2 gap-2 text-xs">
          {frete.valor_mercadoria && (
            <div className="bg-gray-50 rounded p-2">
              <p className="text-muted-foreground">Mercadoria</p>
              <p className="font-semibold">
                R$ {frete.valor_mercadoria.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
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

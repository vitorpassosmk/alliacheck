'use client'

import { useQuery } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Card, CardContent } from '@/components/ui/card'
import { MapPin, Calendar, CreditCard } from 'lucide-react'
import type { FreteComRelacoes } from '@/services/fretes.service'

async function fetchPagamentos(): Promise<FreteComRelacoes[]> {
  const supabase = createClient()
  const agora = new Date()
  const limite24h = new Date(agora.getTime() - 24 * 60 * 60 * 1000).toISOString()
  const limite30d = new Date(agora.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString()

  const { data, error } = await supabase
    .from('fretes')
    .select(`
      *,
      clientes(razao_social),
      motoristas(nome, cnh, validade_cnh, banco, agencia_conta, chave_pix),
      veiculos(placa, tipo, banco_proprietario, agencia_conta_proprietario, chave_pix_proprietario)
    `)
    .eq('status', 'CONCLUIDA')
    .lt('atualizado_em', limite24h)
    .gte('atualizado_em', limite30d)
    .order('atualizado_em', { ascending: false })

  if (error) throw error
  return (data ?? []) as FreteComRelacoes[]
}

export default function PagamentosPage() {
  const { data: fretes = [], isLoading } = useQuery({
    queryKey: ['pagamentos'],
    queryFn: fetchPagamentos,
  })

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold">Pagamentos</h1>
        <p className="text-sm text-muted-foreground">Viagens concluídas nos últimos 30 dias</p>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-40 rounded-lg" />)}
        </div>
      ) : fretes.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground border-2 border-dashed rounded-xl">
          Nenhuma viagem concluída nos últimos 30 dias
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {fretes.map((frete) => (
            <FreteCardPagamento key={frete.id} frete={frete} />
          ))}
        </div>
      )}
    </div>
  )
}

function FreteCardPagamento({ frete }: { frete: FreteComRelacoes }) {
  const dataConclusao = frete.atualizado_em
    ? new Date(frete.atualizado_em).toLocaleDateString('pt-BR', {
        day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit',
      })
    : null

  return (
    <Card className="border bg-white">
      <CardContent className="p-4 space-y-3">
        {/* Cabeçalho */}
        <div className="flex items-start justify-between gap-2">
          <span className="font-bold font-mono text-[#3B6D11] text-lg">{frete.numero_frete}</span>
          <Badge variant="outline" className="bg-[#EAF3DE] text-[#3B6D11] border-[#3B6D11]/20 shrink-0">
            Concluída
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

        {/* Dados bancários do proprietário do veículo */}
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
      </CardContent>
    </Card>
  )
}

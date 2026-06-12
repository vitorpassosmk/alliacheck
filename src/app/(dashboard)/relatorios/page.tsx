'use client'

import { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useClientes } from '@/hooks/use-clientes'
import { StatusBadge, CTEStatusBadge } from '@/components/kanban/StatusBadge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Skeleton } from '@/components/ui/skeleton'
import { Download, Filter, TrendingUp, Package, CheckCircle2, XCircle } from 'lucide-react'
import type { Tables } from '@/types/database.types'
import type { FreteComRelacoes } from '@/services/fretes.service'

type RelatorioResponse = {
  resumo: {
    total: number
    finalizados: number
    cancelados: number
    emAndamento: number
    valorTotal: number
    porStatus: Record<string, number>
  }
  fretes: FreteComRelacoes[]
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)
}

function formatDate(dateStr: string | null) {
  if (!dateStr) return '—'
  return new Date(dateStr).toLocaleDateString('pt-BR')
}

function exportCsv(fretes: FreteComRelacoes[]) {
  const headers = ['ID', 'Cliente', 'Origem', 'Destino', 'Motorista', 'Placa', 'Status', 'CT-e', 'Carregamento', 'Valor']
  const rows = fretes.map((f) => [
    f.id.slice(-6).toUpperCase(),
    f.clientes?.razao_social ?? '',
    `${f.origem_cidade}/${f.origem_uf}`,
    `${f.destino_cidade}/${f.destino_uf}`,
    f.motoristas?.nome ?? '',
    f.veiculos?.placa ?? '',
    f.status,
    f.cte_status,
    f.data_carregamento ?? '',
    f.valor_frete?.toString() ?? '',
  ])
  const csv = [headers, ...rows].map((r) => r.map((c) => `"${c}"`).join(',')).join('\n')
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `relatorio-fretes-${new Date().toISOString().slice(0, 10)}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

export default function RelatoriosPage() {
  const hoje = new Date().toISOString().slice(0, 10)
  const inicioMes = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().slice(0, 10)

  const [dataInicio, setDataInicio] = useState(inicioMes)
  const [dataFim, setDataFim] = useState(hoje)
  const [clienteId, setClienteId] = useState('')
  const [statusViagem, setStatusViagem] = useState('')
  const [filtrosAtivos, setFiltrosAtivos] = useState({ dataInicio: inicioMes, dataFim: hoje, clienteId: '', statusViagem: '' })

  const { data: clientes } = useClientes()

  const params = new URLSearchParams()
  if (filtrosAtivos.dataInicio) params.set('data_inicio', filtrosAtivos.dataInicio)
  if (filtrosAtivos.dataFim) params.set('data_fim', filtrosAtivos.dataFim)
  if (filtrosAtivos.clienteId) params.set('cliente_id', filtrosAtivos.clienteId)
  if (filtrosAtivos.statusViagem) params.set('status', filtrosAtivos.statusViagem)

  const { data, isLoading } = useQuery<RelatorioResponse>({
    queryKey: ['relatorios', filtrosAtivos],
    queryFn: () => fetch(`/api/relatorios?${params}`).then((r) => r.json()),
  })

  const aplicarFiltros = () => {
    setFiltrosAtivos({ dataInicio, dataFim, clienteId, statusViagem })
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Relatórios</h1>
          <p className="text-sm text-muted-foreground">Análise de fretes por período e filtros</p>
        </div>
        {data && data.fretes.length > 0 && (
          <Button variant="outline" onClick={() => exportCsv(data.fretes)}>
            <Download className="h-4 w-4 mr-2" />
            Exportar CSV
          </Button>
        )}
      </div>

      {/* Filtros */}
      <div className="rounded-md border p-4 bg-muted/30">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 items-end">
          <div className="space-y-1">
            <Label className="text-xs">Data início</Label>
            <Input type="date" value={dataInicio} onChange={(e) => setDataInicio(e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Data fim</Label>
            <Input type="date" value={dataFim} onChange={(e) => setDataFim(e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Cliente</Label>
            <Select value={clienteId} onValueChange={(v) => setClienteId(v ?? '')}>
              <SelectTrigger>
                <SelectValue placeholder="Todos os clientes" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Todos</SelectItem>
                {clientes?.map((c) => (
                  <SelectItem key={c.id} value={c.id}>{c.razao_social}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Status</Label>
            <Select value={statusViagem} onValueChange={(v) => setStatusViagem(v ?? '')}>
              <SelectTrigger>
                <SelectValue placeholder="Todos os status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Todos</SelectItem>
                <SelectItem value="ABERTO">Aberto</SelectItem>
                <SelectItem value="PROGRAMADO">Programado</SelectItem>
                <SelectItem value="CARREGANDO">Carregando</SelectItem>
                <SelectItem value="EM_VIAGEM">Em Viagem</SelectItem>
                <SelectItem value="FINALIZADO">Finalizado</SelectItem>
                <SelectItem value="CANCELADO">Cancelado</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <Button className="mt-3" onClick={aplicarFiltros}>
          <Filter className="h-4 w-4 mr-2" />
          Aplicar filtros
        </Button>
      </div>

      {/* Resumo */}
      {isLoading ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}><CardContent className="pt-6"><Skeleton className="h-8 w-12" /></CardContent></Card>
          ))}
        </div>
      ) : data && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Card>
            <CardHeader className="pb-2 flex-row items-center justify-between space-y-0">
              <CardTitle className="text-sm font-medium">Total de Fretes</CardTitle>
              <Package className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{data.resumo.total}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2 flex-row items-center justify-between space-y-0">
              <CardTitle className="text-sm font-medium">Finalizados</CardTitle>
              <CheckCircle2 className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{data.resumo.finalizados}</div>
              {data.resumo.total > 0 && (
                <p className="text-xs text-muted-foreground">
                  {Math.round((data.resumo.finalizados / data.resumo.total) * 100)}% do total
                </p>
              )}
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2 flex-row items-center justify-between space-y-0">
              <CardTitle className="text-sm font-medium">Em Andamento</CardTitle>
              <TrendingUp className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">{data.resumo.emAndamento}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2 flex-row items-center justify-between space-y-0">
              <CardTitle className="text-sm font-medium">Valor Total</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-xl font-bold">{formatCurrency(data.resumo.valorTotal)}</div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Tabela */}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-20">ID</TableHead>
              <TableHead>Cliente</TableHead>
              <TableHead>Rota</TableHead>
              <TableHead>Motorista</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>CT-e</TableHead>
              <TableHead>Carregamento</TableHead>
              <TableHead className="text-right">Valor</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  {Array.from({ length: 8 }).map((_, j) => (
                    <TableCell key={j}><Skeleton className="h-5 w-full" /></TableCell>
                  ))}
                </TableRow>
              ))
            ) : !data || data.fretes.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="h-24 text-center text-muted-foreground">
                  Nenhum frete encontrado no período selecionado.
                </TableCell>
              </TableRow>
            ) : (
              data.fretes.map((frete) => (
                <TableRow key={frete.id}>
                  <TableCell className="font-mono text-xs text-muted-foreground">
                    #{frete.id.slice(-6).toUpperCase()}
                  </TableCell>
                  <TableCell className="font-medium">{frete.clientes?.razao_social ?? '—'}</TableCell>
                  <TableCell className="text-sm">
                    {frete.origem_cidade}/{frete.origem_uf} → {frete.destino_cidade}/{frete.destino_uf}
                  </TableCell>
                  <TableCell>{frete.motoristas?.nome ?? '—'}</TableCell>
                  <TableCell><StatusBadge status={frete.status} /></TableCell>
                  <TableCell><CTEStatusBadge status={frete.cte_status} /></TableCell>
                  <TableCell>{formatDate(frete.data_carregamento)}</TableCell>
                  <TableCell className="text-right font-mono text-sm">
                    {frete.valor_frete ? formatCurrency(frete.valor_frete) : '—'}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}

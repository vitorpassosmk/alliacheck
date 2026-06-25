'use client'

import { useState, useMemo } from 'react'
import { useFretes } from '@/hooks/use-fretes'
import { FreteDetailModal } from '@/components/fretes/FreteDetailModal'
import { FreteFormModal } from '@/components/fretes/FreteFormModal'
import { StatusBadge } from '@/components/kanban/StatusBadge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Skeleton } from '@/components/ui/skeleton'
import { Plus, Search, Filter } from 'lucide-react'
import type { FreteComRelacoes } from '@/services/fretes.service'
import type { Tables } from '@/types/database.types'

type StatusViagem = Tables<'fretes'>['status'] | 'TODOS'

const STATUS_OPTIONS: { value: StatusViagem; label: string }[] = [
  { value: 'TODOS', label: 'Todos os status' },
  { value: 'ABERTO', label: 'Aberto' },
  { value: 'PROGRAMADO', label: 'Programado' },
  { value: 'CARREGANDO', label: 'Carregando' },
  { value: 'CTE_EMITIDO', label: 'CT-e Emitido' },
  { value: 'AGUARDANDO_LIBERACAO', label: 'Aguard. Liberação' },
  { value: 'EM_VIAGEM', label: 'Em Viagem' },
  { value: 'CONCLUIDA', label: 'Concluída' },
  { value: 'CANCELADO', label: 'Cancelado' },
]

function formatCurrency(value: number | null) {
  if (!value) return '—'
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)
}

function formatDate(dateStr: string | null) {
  if (!dateStr) return '—'
  // date-only strings (YYYY-MM-DD) are parsed as UTC by JS, causing off-by-one in UTC-3
  const [year, month, day] = dateStr.split('T')[0].split('-').map(Number)
  return new Date(year, month - 1, day).toLocaleDateString('pt-BR')
}

function TableRowSkeleton() {
  return (
    <TableRow>
      {Array.from({ length: 10 }).map((_, i) => (
        <TableCell key={i}>
          <Skeleton className="h-5 w-full" />
        </TableCell>
      ))}
    </TableRow>
  )
}

export default function FretesPage() {
  const { data: fretes, isLoading } = useFretes()
  const [freteDetalhe, setFreteDetalhe] = useState<FreteComRelacoes | null>(null)
  const [novoFreteOpen, setNovoFreteOpen] = useState(false)
  const [busca, setBusca] = useState('')
  const [statusFiltro, setStatusFiltro] = useState<StatusViagem>('TODOS')
  const [dataInicio, setDataInicio] = useState('')
  const [dataFim, setDataFim] = useState('')

  function limparFiltros() {
    setBusca('')
    setStatusFiltro('TODOS')
    setDataInicio('')
    setDataFim('')
  }

  const fretefiltrados = useMemo(() => {
    if (!fretes) return []
    return fretes.filter((f) => {
      if (statusFiltro !== 'TODOS' && f.status !== statusFiltro) return false
      if (dataInicio && f.criado_em < dataInicio) return false
      if (dataFim && f.criado_em > dataFim + ' 23:59:59') return false
      if (!busca.trim()) return true
      const q = busca.toLowerCase()
      return (
        f.id.slice(-6).includes(q) ||
        f.numero_frete?.toLowerCase().includes(q) ||
        f.origem_cidade.toLowerCase().includes(q) ||
        f.destino_cidade.toLowerCase().includes(q) ||
        f.clientes?.razao_social.toLowerCase().includes(q) ||
        f.motoristas?.nome.toLowerCase().includes(q) ||
        f.veiculos?.placa.toLowerCase().includes(q)
      )
    })
  }, [fretes, busca, statusFiltro, dataInicio, dataFim])

  return (
    <div className="flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Fretes</h1>
          <p className="text-sm text-muted-foreground">
            {fretes ? `${fretes.length} fretes no total` : 'Carregando...'}
          </p>
        </div>
        <Button onClick={() => setNovoFreteOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Novo Frete
        </Button>
      </div>

      {/* Filtros */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por número, ID, cliente, rota, motorista, placa..."
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={statusFiltro} onValueChange={(v) => setStatusFiltro(v as StatusViagem)}>
          <SelectTrigger className="w-44">
            <Filter className="h-4 w-4 mr-2 text-muted-foreground" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {STATUS_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="flex items-center gap-2">
          <label className="text-sm text-muted-foreground whitespace-nowrap">De:</label>
          <input
            type="date"
            value={dataInicio}
            onChange={(e) => setDataInicio(e.target.value)}
            className="border border-slate-200 rounded-md px-2 py-1 text-sm"
          />
        </div>
        <div className="flex items-center gap-2">
          <label className="text-sm text-muted-foreground whitespace-nowrap">Até:</label>
          <input
            type="date"
            value={dataFim}
            onChange={(e) => setDataFim(e.target.value)}
            className="border border-slate-200 rounded-md px-2 py-1 text-sm"
          />
        </div>
        {(busca || statusFiltro !== 'TODOS' || dataInicio || dataFim) && (
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">
              {fretefiltrados.length} resultado{fretefiltrados.length !== 1 ? 's' : ''}
            </span>
            <Button variant="ghost" size="sm" onClick={limparFiltros} className="h-7 px-2 text-xs">
              Limpar filtros
            </Button>
          </div>
        )}
      </div>

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
              <TableHead>Data Prevista</TableHead>
              <TableHead>Descarga</TableHead>
              <TableHead className="text-right">Valor</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 6 }).map((_, i) => <TableRowSkeleton key={i} />)
            ) : fretefiltrados.length === 0 ? (
              <TableRow>
                <TableCell colSpan={10} className="h-24 text-center text-muted-foreground">
                  {busca || statusFiltro !== 'TODOS'
                    ? 'Nenhum frete encontrado com os filtros aplicados.'
                    : 'Nenhum frete cadastrado ainda.'}
                </TableCell>
              </TableRow>
            ) : (
              fretefiltrados.map((frete) => (
                <TableRow
                  key={frete.id}
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => setFreteDetalhe(frete)}
                >
                  <TableCell className="font-mono text-sm font-bold">
                    {frete.numero_frete}
                  </TableCell>
                  <TableCell className="font-medium">
                    {frete.clientes?.razao_social ?? '—'}
                  </TableCell>
                  <TableCell>
                    <span className="text-sm">
                      {frete.origem_cidade}/{frete.origem_uf} → {frete.destino_cidade}/{frete.destino_uf}
                    </span>
                  </TableCell>
                  <TableCell>
                    {frete.motoristas?.nome ?? <span className="text-muted-foreground">—</span>}
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={frete.status} />
                  </TableCell>
                  <TableCell className="font-mono text-xs text-muted-foreground max-w-[160px] truncate" title={frete.chave_cte ?? undefined}>
                    {frete.chave_cte ?? '—'}
                  </TableCell>
                  <TableCell>{formatDate(frete.data_carregamento)}</TableCell>
                  <TableCell>{formatDate(frete.data_entrega_prevista)}</TableCell>
                  <TableCell>{formatDate(frete.data_entrega_real)}</TableCell>
                  <TableCell className="text-right font-mono text-sm">
                    {formatCurrency(frete.valor_frete)}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
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

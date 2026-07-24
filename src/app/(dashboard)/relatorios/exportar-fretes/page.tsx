'use client'

import { useState, useEffect } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { PasswordConfirmDialog } from '@/components/common/PasswordConfirmDialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { Skeleton } from '@/components/ui/skeleton'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { StatusBadge } from '@/components/kanban/StatusBadge'
import { ShieldAlert, ChevronLeft, FileSpreadsheet, AlertTriangle } from 'lucide-react'
import type { StatusViagem } from '@/lib/state-machine'

type FreteElegivel = {
  id: string
  numero_frete: string
  status: StatusViagem
  atualizado_em: string
  valor_frete: number | null
  clientes: { razao_social: string } | null
}

type ElegiveisResponse = {
  fretes: FreteElegivel[]
  diasRetencao: number
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('pt-BR')
}

async function fetchElegiveis(dataInicio: string, dataFim: string): Promise<ElegiveisResponse> {
  const params = new URLSearchParams()
  if (dataInicio) params.set('data_inicio', dataInicio)
  if (dataFim) params.set('data_fim', dataFim)
  const res = await fetch(`/api/relatorios/exportar-fretes/elegiveis?${params}`)
  if (!res.ok) throw new Error((await res.json().catch(() => ({ error: 'Erro ao buscar fretes elegíveis' }))).error)
  return res.json()
}

export default function ExportarFretesPage() {
  const queryClient = useQueryClient()
  const [papel, setPapel] = useState<string | null>(null)
  const [papelCarregado, setPapelCarregado] = useState(false)
  const [dataInicio, setDataInicio] = useState('')
  const [dataFim, setDataFim] = useState('')
  const [selecionados, setSelecionados] = useState<Set<string>>(new Set())
  const [dialogAberto, setDialogAberto] = useState(false)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) return
      const { data } = await supabase.from('users').select('papel').eq('id', user.id).single()
      setPapel(data?.papel ?? null)
      setPapelCarregado(true)
    })
  }, [])

  const { data, isLoading, refetch } = useQuery<ElegiveisResponse>({
    queryKey: ['relatorios', 'exportar-fretes', 'elegiveis', dataInicio, dataFim],
    queryFn: () => fetchElegiveis(dataInicio, dataFim),
    enabled: papelCarregado && papel !== 'CONFERENTE',
  })

  const fretes = data?.fretes ?? []

  function alternarSelecao(id: string) {
    setSelecionados((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function alternarTodos() {
    setSelecionados((prev) =>
      prev.size === fretes.length ? new Set() : new Set(fretes.map((f) => f.id))
    )
  }

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

      const res = await fetch('/api/relatorios/exportar-fretes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ freteIds: Array.from(selecionados) }),
      })

      if (!res.ok) {
        const body = await res.json().catch(() => ({ error: 'Erro ao exportar fretes' }))
        toast.error(body.error ?? 'Erro ao exportar fretes')
        return
      }

      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `fretes-exportados-${new Date().toISOString().slice(0, 10)}.xlsx`
      a.click()
      URL.revokeObjectURL(url)

      toast.success(`${selecionados.size} frete(s) exportado(s) e removido(s) do banco.`)
      setSelecionados(new Set())
      setDialogAberto(false)
      queryClient.invalidateQueries({ queryKey: ['relatorios'] })
      refetch()
    } finally {
      setLoading(false)
    }
  }

  if (!papelCarregado) {
    return (
      <div className="flex flex-col gap-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-40 w-full" />
      </div>
    )
  }

  if (papel === 'CONFERENTE') {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3 text-muted-foreground">
        <ShieldAlert className="h-10 w-10" />
        <p className="text-sm font-medium">Acesso restrito</p>
        <p className="text-xs">Apenas ADMINs e SUPERVISORs podem exportar e limpar fretes.</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      <div>
        <Link href="/relatorios" className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1 mb-2">
          <ChevronLeft className="h-3 w-3" /> Voltar para Relatórios
        </Link>
        <h1 className="text-xl font-semibold">Exportar e Liberar Espaço</h1>
        <p className="text-sm text-muted-foreground">
          Fretes concluídos ou cancelados há {data?.diasRetencao ?? 90}+ dias. Ao confirmar, os fretes selecionados
          são exportados para uma planilha Excel (fretes + eventos de auditoria) e então removidos permanentemente
          do banco de dados.
        </p>
      </div>

      <div className="flex items-center gap-2 rounded-md border border-amber-300 bg-amber-50 p-3 text-xs text-amber-800">
        <AlertTriangle className="h-4 w-4 shrink-0" />
        Esta ação é irreversível. Guarde o arquivo Excel gerado — ele passa a ser o único registro desses fretes.
      </div>

      <div className="rounded-md border p-4 bg-muted/30">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 items-end">
          <div className="space-y-1">
            <Label className="text-xs">Concluído/cancelado a partir de</Label>
            <Input type="date" value={dataInicio} onChange={(e) => setDataInicio(e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">até</Label>
            <Input type="date" value={dataFim} onChange={(e) => setDataFim(e.target.value)} />
          </div>
        </div>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-10">
                <Checkbox
                  checked={fretes.length > 0 && selecionados.size === fretes.length}
                  onCheckedChange={alternarTodos}
                  disabled={fretes.length === 0}
                />
              </TableHead>
              <TableHead>Nº Pedido</TableHead>
              <TableHead>Cliente</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Atualizado em</TableHead>
              <TableHead className="text-right">Valor</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  {Array.from({ length: 6 }).map((_, j) => (
                    <TableCell key={j}><Skeleton className="h-5 w-full" /></TableCell>
                  ))}
                </TableRow>
              ))
            ) : fretes.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                  Nenhum frete elegível para exportação no período selecionado.
                </TableCell>
              </TableRow>
            ) : (
              fretes.map((f) => (
                <TableRow key={f.id}>
                  <TableCell>
                    <Checkbox
                      checked={selecionados.has(f.id)}
                      onCheckedChange={() => alternarSelecao(f.id)}
                    />
                  </TableCell>
                  <TableCell className="font-medium">{f.numero_frete}</TableCell>
                  <TableCell>{f.clientes?.razao_social ?? '—'}</TableCell>
                  <TableCell><StatusBadge status={f.status} /></TableCell>
                  <TableCell>{formatDate(f.atualizado_em)}</TableCell>
                  <TableCell className="text-right font-mono text-sm">
                    {f.valor_frete ? `R$ ${f.valor_frete.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : '—'}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <div className="flex justify-end">
        <Button
          disabled={selecionados.size === 0}
          onClick={() => setDialogAberto(true)}
          className="bg-amber-600 hover:bg-amber-700 text-white"
        >
          <FileSpreadsheet className="h-4 w-4 mr-2" />
          Exportar e Excluir ({selecionados.size} selecionado{selecionados.size === 1 ? '' : 's'})
        </Button>
      </div>

      <PasswordConfirmDialog
        open={dialogAberto}
        onOpenChange={setDialogAberto}
        onConfirm={handleConfirmar}
        loading={loading}
        title="Confirmar exportação e exclusão"
        description={`Confirme sua senha para exportar ${selecionados.size} frete(s) e removê-los definitivamente do banco.`}
      />
    </div>
  )
}

import { createClient } from '@/lib/supabase/server'

export async function GET(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'Não autorizado' }, { status: 401 })

  const url = new URL(request.url)
  const dataInicio = url.searchParams.get('data_inicio')
  const dataFim = url.searchParams.get('data_fim')
  const clienteId = url.searchParams.get('cliente_id')
  const statusViagem = url.searchParams.get('status')
  const statusCte = url.searchParams.get('cte_status')

  let query = supabase
    .from('fretes')
    .select(`*, clientes(razao_social), motoristas(nome), veiculos(placa, tipo)`)
    .order('criado_em', { ascending: false })

  if (dataInicio) query = query.gte('criado_em', dataInicio)
  if (dataFim) {
    const fim = new Date(dataFim)
    fim.setHours(23, 59, 59, 999)
    query = query.lte('criado_em', fim.toISOString())
  }
  if (clienteId) query = query.eq('cliente_id', clienteId)
  if (statusViagem) query = query.eq('status', statusViagem as 'ABERTO' | 'PROGRAMADO' | 'CARREGANDO' | 'EM_VIAGEM' | 'FINALIZADO' | 'CANCELADO')
  if (statusCte) query = query.eq('cte_status', statusCte as 'PENDENTE' | 'AGUARDANDO_NF' | 'NF_RECEBIDA' | 'CT_E_EMITIDO' | 'CT_E_CANCELADO')

  const { data: fretes, error } = await query
  if (error) return Response.json({ error: error.message }, { status: 500 })

  const total = fretes.length
  const finalizados = fretes.filter((f) => f.status === 'FINALIZADO').length
  const cancelados = fretes.filter((f) => f.status === 'CANCELADO').length
  const emAndamento = fretes.filter((f) =>
    ['ABERTO', 'PROGRAMADO', 'CARREGANDO', 'EM_VIAGEM'].includes(f.status)
  ).length
  const valorTotal = fretes.reduce((acc, f) => acc + (f.valor_frete ?? 0), 0)
  const porStatus = fretes.reduce(
    (acc, f) => {
      acc[f.status] = (acc[f.status] ?? 0) + 1
      return acc
    },
    {} as Record<string, number>
  )

  return Response.json({
    resumo: { total, finalizados, cancelados, emAndamento, valorTotal, porStatus },
    fretes,
  })
}

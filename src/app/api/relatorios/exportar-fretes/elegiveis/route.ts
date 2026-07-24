import { createClient } from '@/lib/supabase/server'

const DIAS_RETENCAO = 90

function calcularDataCorte(): string {
  const corte = new Date()
  corte.setDate(corte.getDate() - DIAS_RETENCAO)
  return corte.toISOString()
}

/** Fretes CONCLUIDA/CANCELADO há 90+ dias — elegíveis para exportação e limpeza. */
export async function GET(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'Não autorizado' }, { status: 401 })

  const { data: perfil } = await supabase.from('users').select('papel').eq('id', user.id).single()
  if (!perfil || !['ADMIN', 'SUPERVISOR'].includes(perfil.papel)) {
    return Response.json({ error: 'Apenas ADMINs e SUPERVISORs podem exportar e limpar fretes' }, { status: 403 })
  }

  const url = new URL(request.url)
  const dataInicio = url.searchParams.get('data_inicio')
  const dataFim = url.searchParams.get('data_fim')
  const DATA_RE = /^\d{4}-\d{2}-\d{2}$/

  if (dataInicio && !DATA_RE.test(dataInicio)) {
    return Response.json({ error: 'data_inicio inválida' }, { status: 422 })
  }
  if (dataFim && !DATA_RE.test(dataFim)) {
    return Response.json({ error: 'data_fim inválida' }, { status: 422 })
  }

  let query = supabase
    .from('fretes')
    .select('id, numero_frete, status, atualizado_em, valor_frete, clientes(razao_social)')
    .in('status', ['CONCLUIDA', 'CANCELADO'])
    .is('excluido_em', null)
    .lte('atualizado_em', calcularDataCorte())
    .order('atualizado_em', { ascending: false })

  if (dataInicio) query = query.gte('atualizado_em', dataInicio)
  if (dataFim) {
    const fim = new Date(dataFim)
    fim.setHours(23, 59, 59, 999)
    query = query.lte('atualizado_em', fim.toISOString())
  }

  const { data, error } = await query
  if (error) return Response.json({ error: error.message }, { status: 500 })

  return Response.json({ fretes: data, diasRetencao: DIAS_RETENCAO })
}

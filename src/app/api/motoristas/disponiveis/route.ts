import { createClient } from '@/lib/supabase/server'

const STATUS_ATIVOS = ['PROGRAMADO', 'CARREGANDO', 'CTE_EMITIDO', 'AGUARDANDO_LIBERACAO', 'EM_VIAGEM'] as const

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'Não autorizado' }, { status: 401 })

  // IDs de motoristas em viagens ativas
  const { data: emViagem } = await supabase
    .from('fretes')
    .select('motorista_id')
    .in('status', STATUS_ATIVOS)
    .not('motorista_id', 'is', null)
    .is('excluido_em', null)

  const ocupadosIds = [...new Set((emViagem ?? []).map((f) => f.motorista_id).filter(Boolean))] as string[]

  let query = supabase.from('motoristas').select('*').eq('status', 'ATIVO').order('nome')

  if (ocupadosIds.length > 0) {
    query = query.not('id', 'in', `(${ocupadosIds.join(',')})`)
  }

  const { data, error } = await query
  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json(data)
}

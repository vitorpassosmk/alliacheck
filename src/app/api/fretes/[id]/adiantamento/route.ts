import { createClient } from '@/lib/supabase/server'
import { invalidUUID } from '@/lib/api-helpers'

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const uuidErr = invalidUUID(id)
  if (uuidErr) return uuidErr

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'Não autorizado' }, { status: 401 })

  const { data: perfil } = await supabase.from('users').select('papel').eq('id', user.id).single()
  if (!perfil || !['ADMIN', 'SUPERVISOR'].includes(perfil.papel)) {
    return Response.json({ error: 'Apenas ADMIN e SUPERVISOR podem confirmar adiantamentos' }, { status: 403 })
  }

  const { data: frete } = await supabase
    .from('fretes')
    .select('status, adiantamento_pago_em, numero_frete, checklist_liberacao_ok')
    .eq('id', id)
    .is('excluido_em', null)
    .single()

  if (!frete) return Response.json({ error: 'Frete não encontrado' }, { status: 404 })
  if (frete.status !== 'AGUARDANDO_LIBERACAO') {
    return Response.json({ error: 'O adiantamento só pode ser confirmado em fretes AGUARDANDO LIBERAÇÃO' }, { status: 422 })
  }
  if (!frete.checklist_liberacao_ok) {
    return Response.json({ error: 'O checklist de conferência deve ser concluído antes de confirmar o adiantamento' }, { status: 422 })
  }
  if (frete.adiantamento_pago_em) {
    return Response.json({ error: 'Adiantamento já foi confirmado' }, { status: 409 })
  }

  const agora = new Date().toISOString()

  // Confirma adiantamento E avança status para EM_VIAGEM (ação única)
  const { error: updateError } = await supabase
    .from('fretes')
    .update({
      adiantamento_pago_em: agora,
      adiantamento_pago_por: user.id,
      status: 'EM_VIAGEM',
    })
    .eq('id', id)

  if (updateError) return Response.json({ error: 'Erro interno' }, { status: 500 })

  const ip = request.headers.get('x-forwarded-for') ?? request.headers.get('x-real-ip')
  const ua = request.headers.get('user-agent')

  await supabase.from('eventos').insert([
    {
      frete_id: id,
      tipo: 'ADIANTAMENTO_PAGO',
      descricao: `Adiantamento do frete ${frete.numero_frete} confirmado`,
      usuario_id: user.id,
      ip_address: ip,
      user_agent: ua,
    },
    {
      frete_id: id,
      tipo: 'STATUS_CHANGE',
      descricao: 'Viagem liberada após confirmação do adiantamento',
      status_anterior: 'AGUARDANDO_LIBERACAO',
      status_novo: 'EM_VIAGEM',
      usuario_id: user.id,
      ip_address: ip,
      user_agent: ua,
    },
  ])

  return Response.json({ ok: true, novoStatus: 'EM_VIAGEM' })
}

import { createClient } from '@/lib/supabase/server'
import { validarTransicaoCTE } from '@/lib/state-machine'
import { invalidUUID } from '@/lib/api-helpers'
import { CHECKLIST_ITEMS } from '@/lib/checklist-items'
import type { StatusCTE } from '@/lib/state-machine'

export async function PATCH(
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
  if (!perfil || !['ADMIN', 'CONFERENTE'].includes(perfil.papel)) {
    return Response.json({ error: 'Permissão insuficiente' }, { status: 403 })
  }

  const { cte_status: novoCteStatus }: { cte_status: StatusCTE } = await request.json()

  const { data: frete } = await supabase
    .from('fretes')
    .select('cte_status')
    .eq('id', id)
    .single()

  if (!frete) return Response.json({ error: 'Frete não encontrado' }, { status: 404 })

  if (!validarTransicaoCTE(frete.cte_status, novoCteStatus)) {
    return Response.json(
      { error: `Transição CT-e ${frete.cte_status} → ${novoCteStatus} não permitida` },
      { status: 422 }
    )
  }

  if (novoCteStatus === 'CT_E_EMITIDO') {
    const { data: eventosChecklist } = await supabase
      .from('eventos')
      .select('descricao')
      .eq('frete_id', id)
      .eq('tipo', 'CHECKLIST_ITEM')

    const itensConferidos = new Set((eventosChecklist ?? []).map((e) => e.descricao))
    if (itensConferidos.size < CHECKLIST_ITEMS.length) {
      return Response.json(
        { error: `Checklist incompleto. ${itensConferidos.size}/${CHECKLIST_ITEMS.length} itens conferidos.` },
        { status: 422 }
      )
    }
  }

  const { error } = await supabase
    .from('fretes')
    .update({ cte_status: novoCteStatus })
    .eq('id', id)

  if (error) {
    console.error('[fretes/cte] update error', error)
    return Response.json({ error: 'Erro interno' }, { status: 500 })
  }

  await supabase.from('eventos').insert({
    frete_id: id,
    tipo: 'CTE_STATUS_CHANGE',
    descricao: `Status CT-e alterado para ${novoCteStatus}`,
    status_anterior: frete.cte_status,
    status_novo: novoCteStatus,
    usuario_id: user.id,
    ip_address: request.headers.get('x-forwarded-for') ?? request.headers.get('x-real-ip'),
    user_agent: request.headers.get('user-agent'),
  })

  return Response.json({ ok: true, novoCteStatus })
}

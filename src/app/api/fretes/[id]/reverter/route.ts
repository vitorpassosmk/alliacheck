import { createClient } from '@/lib/supabase/server'
import { TRANSICOES_REVERTER } from '@/lib/state-machine'
import { invalidUUID, extractIp, hashIp } from '@/lib/api-helpers'
import type { StatusViagem } from '@/lib/state-machine'

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

  const { data: perfil } = await supabase
    .from('users').select('papel').eq('id', user.id).single()

  if (!perfil || !['ADMIN', 'SUPERVISOR'].includes(perfil.papel)) {
    return Response.json(
      { error: 'Apenas ADMIN e SUPERVISOR podem retroceder status' },
      { status: 403 }
    )
  }

  const { data: frete } = await supabase
    .from('fretes')
    .select('status')
    .eq('id', id)
    .is('excluido_em', null)
    .single()

  if (!frete) return Response.json({ error: 'Frete não encontrado' }, { status: 404 })

  const statusAnterior = TRANSICOES_REVERTER[frete.status as StatusViagem]
  if (!statusAnterior) {
    return Response.json(
      { error: `Status ${frete.status} não pode ser retrocedido` },
      { status: 422 }
    )
  }

  const { error: updateError } = await supabase
    .from('fretes')
    .update({ status: statusAnterior })
    .eq('id', id)
    .is('excluido_em', null)

  if (updateError) {
    console.error('[fretes/reverter] update error', updateError)
    return Response.json({ error: 'Erro interno' }, { status: 500 })
  }

  const { error: eventoError } = await supabase.from('eventos').insert({
    frete_id: id,
    tipo: 'STATUS_REVERT',
    descricao: `Etapa retrocedida: ${frete.status} → ${statusAnterior}`,
    status_anterior: frete.status,
    status_novo: statusAnterior,
    usuario_id: user.id,
    ip_address: hashIp(extractIp(request)),
    user_agent: request.headers.get('user-agent'),
  })

  if (eventoError) {
    console.error('[fretes/reverter] evento error', eventoError)
  }

  return Response.json({ ok: true, statusAnterior })
}

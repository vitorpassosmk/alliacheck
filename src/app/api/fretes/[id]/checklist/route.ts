import { createClient } from '@/lib/supabase/server'
import { invalidUUID } from '@/lib/api-helpers'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const uuidErr = invalidUUID(id)
  if (uuidErr) return uuidErr

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'Não autorizado' }, { status: 401 })

  const [{ data: itens }, { data: respostas }] = await Promise.all([
    supabase.from('checklist_itens').select('id, descricao, ordem').eq('ativo', true).order('ordem'),
    supabase.from('checklist_respostas').select('item_id, marcado_em, marcado_por').eq('frete_id', id),
  ])

  return Response.json({ itens: itens ?? [], respostas: respostas ?? [] })
}

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
  if (!perfil || !['ADMIN', 'SUPERVISOR', 'CONFERENTE'].includes(perfil.papel)) {
    return Response.json({ error: 'Permissão insuficiente' }, { status: 403 })
  }

  const body = await request.json()
  const item_id = body.item_id as string
  const marcado = body.marcado as boolean

  if (!UUID_RE.test(item_id)) {
    return Response.json({ error: 'item_id inválido' }, { status: 422 })
  }

  if (marcado) {
    await supabase
      .from('checklist_respostas')
      .upsert(
        { frete_id: id, item_id, marcado_por: user.id, marcado_em: new Date().toISOString() },
        { onConflict: 'frete_id,item_id' }
      )
  } else {
    await supabase.from('checklist_respostas').delete().eq('frete_id', id).eq('item_id', item_id)
  }

  const [{ count: totalItens }, { count: totalRespostas }] = await Promise.all([
    supabase.from('checklist_itens').select('*', { count: 'exact', head: true }).eq('ativo', true),
    supabase.from('checklist_respostas').select('*', { count: 'exact', head: true }).eq('frete_id', id),
  ])

  const checklist_liberacao_ok = (totalItens ?? 0) > 0 && (totalRespostas ?? 0) >= (totalItens ?? 1)

  await supabase.from('fretes').update({ checklist_liberacao_ok }).eq('id', id)

  await supabase.from('eventos').insert({
    frete_id: id,
    tipo: 'CHECKLIST_ITEM',
    descricao: marcado ? 'Item de checklist marcado' : 'Item de checklist desmarcado',
    usuario_id: user.id,
    ip_address: request.headers.get('x-forwarded-for') ?? request.headers.get('x-real-ip'),
    user_agent: request.headers.get('user-agent'),
  })

  return Response.json({ ok: true, checklist_liberacao_ok })
}

import { createClient } from '@/lib/supabase/server'
import { invalidUUID } from '@/lib/api-helpers'
import { CHECKLIST_ITEMS } from '@/lib/checklist-items'
import type { ChecklistItem } from '@/lib/checklist-items'

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

  const { data: eventos } = await supabase
    .from('eventos')
    .select('descricao')
    .eq('frete_id', id)
    .eq('tipo', 'CHECKLIST_ITEM')

  const conferidos = new Set((eventos ?? []).map((e) => e.descricao))
  const itens = CHECKLIST_ITEMS.map((item) => ({ item, conferido: conferidos.has(item) }))

  return Response.json(itens)
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
  if (!perfil || !['ADMIN', 'CONFERENTE'].includes(perfil.papel)) {
    return Response.json({ error: 'Permissão insuficiente' }, { status: 403 })
  }

  const { item } = await request.json() as { item: string }

  if (!CHECKLIST_ITEMS.includes(item as ChecklistItem)) {
    return Response.json({ error: 'Item de checklist inválido' }, { status: 422 })
  }

  const { error } = await supabase.from('eventos').insert({
    frete_id: id,
    tipo: 'CHECKLIST_ITEM',
    descricao: item,
    usuario_id: user.id,
    ip_address: request.headers.get('x-forwarded-for') ?? request.headers.get('x-real-ip'),
    user_agent: request.headers.get('user-agent'),
  })

  if (error) {
    console.error('[fretes/checklist] insert error', error)
    return Response.json({ error: 'Erro interno' }, { status: 500 })
  }
  return Response.json({ ok: true })
}

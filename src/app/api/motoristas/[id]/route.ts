import { createClient } from '@/lib/supabase/server'
import { invalidUUID } from '@/lib/api-helpers'
import { z } from 'zod'

const MotoristaUpdateSchema = z.object({
  nome: z.string().min(1).optional(),
  cpf: z.string().min(11).optional(),
  cnh: z.string().min(1).optional(),
  categoria_cnh: z.string().nullable().optional(),
  validade_cnh: z.string().optional(),
  rntrc: z.string().nullable().optional(),
  telefone: z.string().nullable().optional(),
  status: z.enum(['ATIVO', 'INATIVO', 'BLOQUEADO']).optional(),
})

async function checkAdminOrSupervisor(supabase: Awaited<ReturnType<typeof createClient>>, userId: string) {
  const { data } = await supabase.from('users').select('papel').eq('id', userId).single()
  return data && ['ADMIN', 'SUPERVISOR'].includes(data.papel)
}

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
  if (!await checkAdminOrSupervisor(supabase, user.id)) {
    return Response.json({ error: 'Permissão insuficiente' }, { status: 403 })
  }

  const body = await request.json()
  const parsed = MotoristaUpdateSchema.safeParse(body)
  if (!parsed.success) return Response.json({ error: parsed.error.flatten() }, { status: 422 })

  const { data, error } = await supabase
    .from('motoristas').update(parsed.data).eq('id', id).select().single()

  if (error) {
    console.error('[motoristas/id] update error', error)
    return Response.json({ error: 'Erro interno' }, { status: 500 })
  }
  return Response.json(data)
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const uuidErr = invalidUUID(id)
  if (uuidErr) return uuidErr

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'Não autorizado' }, { status: 401 })
  if (!await checkAdminOrSupervisor(supabase, user.id)) {
    return Response.json({ error: 'Permissão insuficiente' }, { status: 403 })
  }

  const { error } = await supabase.from('motoristas').update({ status: 'INATIVO' }).eq('id', id)
  if (error) {
    console.error('[motoristas/id] delete error', error)
    return Response.json({ error: 'Erro interno' }, { status: 500 })
  }
  return Response.json({ ok: true })
}

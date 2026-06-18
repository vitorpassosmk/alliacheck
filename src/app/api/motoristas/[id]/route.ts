import { createClient } from '@/lib/supabase/server'
import { invalidUUID } from '@/lib/api-helpers'
import { z } from 'zod'
import { validarCPF } from '@/lib/validations/cpf'

const MotoristaUpdateSchema = z.object({
  nome: z.string().min(1).optional(),
  cpf: z.string().optional().refine((v) => !v || validarCPF(v), { message: 'CPF inválido' }),
  cnh: z.string().min(1).optional(),
  validade_cnh: z.string().optional(),
  telefone: z.string().nullable().optional(),
  status: z.enum(['ATIVO', 'INATIVO', 'BLOQUEADO']).optional(),
  tipo_motorista: z.enum(['FROTA', 'AGREGADO']).nullable().optional(),
  banco: z.string().nullable().optional(),
  agencia_conta: z.string().nullable().optional(),
  chave_pix: z.string().nullable().optional(),
})

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
  if (!perfil || !['ADMIN', 'SUPERVISOR'].includes(perfil.papel)) {
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

  const { data: perfil } = await supabase.from('users').select('papel').eq('id', user.id).single()
  if (!perfil || !['ADMIN', 'SUPERVISOR'].includes(perfil.papel)) {
    return Response.json({ error: 'Permissão insuficiente' }, { status: 403 })
  }

  const { error } = await supabase.from('motoristas').update({ status: 'INATIVO' }).eq('id', id)
  if (error) {
    console.error('[motoristas/id] delete error', error)
    return Response.json({ error: 'Erro interno' }, { status: 500 })
  }
  return Response.json({ ok: true })
}

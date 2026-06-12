import { createClient } from '@/lib/supabase/server'
import { validarCNPJ } from '@/lib/validations/cnpj'
import { invalidUUID } from '@/lib/api-helpers'
import { z } from 'zod'

const ClienteUpdateSchema = z.object({
  razao_social: z.string().min(1).optional(),
  cnpj: z.string().optional().nullable().refine(
    (v) => !v || validarCNPJ(v),
    { message: 'CNPJ inválido' }
  ),
  cidade: z.string().nullable().optional(),
  uf: z.string().length(2).nullable().optional(),
  contato_nome: z.string().nullable().optional(),
  contato_telefone: z.string().nullable().optional(),
  ativo: z.boolean().optional(),
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
  const parsed = ClienteUpdateSchema.safeParse(body)
  if (!parsed.success) return Response.json({ error: parsed.error.flatten() }, { status: 422 })

  const { data, error } = await supabase.from('clientes').update(parsed.data).eq('id', id).select().single()
  if (error) {
    console.error('[clientes/id] update error', error)
    return Response.json({ error: 'Erro interno' }, { status: 500 })
  }
  return Response.json(data)
}

import { createClient } from '@/lib/supabase/server'
import { validarCNPJ } from '@/lib/validations/cnpj'
import { z } from 'zod'

const ClienteSchema = z.object({
  razao_social: z.string().min(1),
  cnpj: z
    .string()
    .optional()
    .nullable()
    .refine((v) => !v || validarCNPJ(v), { message: 'CNPJ inválido' }),
  cidade: z.string().nullable().optional(),
  uf: z.string().length(2).nullable().optional(),
  contato_nome: z.string().nullable().optional(),
  contato_telefone: z.string().nullable().optional(),
})

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'Não autorizado' }, { status: 401 })

  const { data, error } = await supabase.from('clientes').select('*').eq('ativo', true).order('razao_social')
  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json(data)
}

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'Não autorizado' }, { status: 401 })

  const { data: perfil } = await supabase.from('users').select('papel').eq('id', user.id).single()
  if (!perfil || !['ADMIN', 'SUPERVISOR'].includes(perfil.papel)) {
    return Response.json({ error: 'Permissão insuficiente' }, { status: 403 })
  }

  const body = await request.json()
  const parsed = ClienteSchema.safeParse(body)
  if (!parsed.success) return Response.json({ error: parsed.error.flatten() }, { status: 422 })

  const { data, error } = await supabase.from('clientes').insert(parsed.data).select().single()
  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json(data, { status: 201 })
}

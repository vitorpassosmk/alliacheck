import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'

const MotoristaSchema = z.object({
  nome: z.string().min(1),
  cpf: z.string().min(11),
  cnh: z.string().min(1),
  validade_cnh: z.string().min(1),
  telefone: z.string().nullable().optional(),
  status: z.enum(['ATIVO', 'INATIVO', 'BLOQUEADO']).optional(),
  tipo_motorista: z.enum(['FROTA', 'AGREGADO']).nullable().optional(),
  banco: z.string().nullable().optional(),
  agencia_conta: z.string().nullable().optional(),
  chave_pix: z.string().nullable().optional(),
})

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'Não autorizado' }, { status: 401 })

  const { data, error } = await supabase
    .from('motoristas')
    .select('*')
    .order('nome')

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
  const parsed = MotoristaSchema.safeParse(body)
  if (!parsed.success) return Response.json({ error: parsed.error.flatten() }, { status: 422 })

  const { data, error } = await supabase.from('motoristas').insert(parsed.data).select().single()
  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json(data, { status: 201 })
}

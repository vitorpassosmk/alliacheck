import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'

const VeiculoSchema = z.object({
  placa: z.string().min(7),
  tipo: z.enum(['VAN', 'TOCO', 'TRUCK', 'BITRUCK', 'CARRETA', 'BITREM']),
  modelo: z.string().nullable().optional(),
  ano: z.number().int().min(1990).max(new Date().getFullYear() + 1).nullable().optional(),
  proprietario: z.string().nullable().optional(),
  rntrc: z.string().nullable().optional(),
})

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'Não autorizado' }, { status: 401 })

  const { data, error } = await supabase.from('veiculos').select('*').eq('ativo', true).order('placa')
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
  const parsed = VeiculoSchema.safeParse(body)
  if (!parsed.success) return Response.json({ error: parsed.error.flatten() }, { status: 422 })

  const { data, error } = await supabase.from('veiculos').insert(parsed.data).select().single()
  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json(data, { status: 201 })
}

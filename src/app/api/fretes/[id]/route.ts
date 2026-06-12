import { createClient } from '@/lib/supabase/server'
import { invalidUUID } from '@/lib/api-helpers'
import { z } from 'zod'

const FreteUpdateSchema = z.object({
  cliente_id: z.string().uuid().nullable().optional(),
  motorista_id: z.string().uuid().nullable().optional(),
  veiculo_id: z.string().uuid().nullable().optional(),
  origem_cidade: z.string().min(1).optional(),
  origem_uf: z.string().length(2).optional(),
  destino_cidade: z.string().min(1).optional(),
  destino_uf: z.string().length(2).optional(),
  tipo_veiculo: z.string().nullable().optional(),
  valor_frete: z.number().positive().nullable().optional(),
  data_carregamento: z.string().nullable().optional(),
  data_entrega_prevista: z.string().nullable().optional(),
  data_entrega_real: z.string().nullable().optional(),
  observacoes: z.string().nullable().optional(),
})

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

  const { data, error } = await supabase
    .from('fretes')
    .select(`
      *,
      clientes(*),
      motoristas(*),
      veiculos(*),
      documentos(*),
      eventos(* )
    `)
    .eq('id', id)
    .order('criado_em', { referencedTable: 'eventos', ascending: true })
    .single()

  if (error) return Response.json({ error: 'Frete não encontrado' }, { status: 404 })
  return Response.json(data)
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

  const { data: perfil } = await supabase
    .from('users').select('papel').eq('id', user.id).single()

  if (!perfil || !['ADMIN', 'SUPERVISOR'].includes(perfil.papel)) {
    return Response.json({ error: 'Permissão insuficiente' }, { status: 403 })
  }

  const body = await request.json()
  const parsed = FreteUpdateSchema.safeParse(body)
  if (!parsed.success) {
    return Response.json({ error: parsed.error.flatten() }, { status: 422 })
  }

  const { data, error } = await supabase
    .from('fretes')
    .update(parsed.data)
    .eq('id', id)
    .select()
    .single()

  if (error) {
    console.error('[fretes/id] update error', error)
    return Response.json({ error: 'Erro interno' }, { status: 500 })
  }
  return Response.json(data)
}

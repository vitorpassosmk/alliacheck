import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'

const FreteCreateSchema = z.object({
  numero_frete: z.string().min(1),
  cliente_id: z.string().uuid().nullable().optional(),
  origem_cidade: z.string().min(1),
  origem_uf: z.string().length(2),
  destino_cidade: z.string().min(1),
  destino_uf: z.string().length(2),
  tipo_produto: z.string().optional().nullable(),
  valor_mercadoria: z.number().positive().optional().nullable(),
  valor_frete: z.number().positive().optional().nullable(),
  data_carregamento: z.string().min(1),
  data_entrega_prevista: z.string().optional().nullable(),
  motorista_id: z.string().uuid().optional().nullable(),
  veiculo_id: z.string().uuid().optional().nullable(),
  observacoes: z.string().optional().nullable(),
})

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'Não autorizado' }, { status: 401 })

  const { data, error } = await supabase
    .from('fretes')
    .select(`
      *,
      clientes(razao_social),
      motoristas(nome, cnh, validade_cnh, banco, agencia_conta, chave_pix),
      veiculos(placa, tipo, placa_carreta, banco_proprietario, agencia_conta_proprietario, chave_pix_proprietario)
    `)
    .is('excluido_em', null)
    .order('criado_em', { ascending: false })

  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json(data)
}

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'Não autorizado' }, { status: 401 })

  const { data: perfil } = await supabase
    .from('users').select('papel').eq('id', user.id).single()

  if (!perfil || !['ADMIN', 'SUPERVISOR'].includes(perfil.papel)) {
    return Response.json({ error: 'Permissão insuficiente' }, { status: 403 })
  }

  const body = await request.json()
  const parsed = FreteCreateSchema.safeParse(body)
  if (!parsed.success) {
    return Response.json({ error: parsed.error.flatten() }, { status: 422 })
  }

  const { data, error } = await supabase
    .from('fretes')
    .insert({ ...parsed.data, criado_por: user.id })
    .select()
    .single()

  if (error) {
    if (error.code === '23505') {
      return Response.json({ error: `O número de frete '${parsed.data.numero_frete}' já está em uso` }, { status: 409 })
    }
    return Response.json({ error: error.message }, { status: 500 })
  }

  await supabase.from('eventos').insert({
    frete_id: data.id,
    tipo: 'FRETE_CRIADO',
    descricao: `Frete ${data.numero_frete} criado`,
    status_novo: 'ABERTO',
    usuario_id: user.id,
    ip_address: request.headers.get('x-forwarded-for') ?? request.headers.get('x-real-ip'),
    user_agent: request.headers.get('user-agent'),
  })

  return Response.json(data, { status: 201 })
}

import { createClient } from '@/lib/supabase/server'
import { invalidUUID } from '@/lib/api-helpers'
import { z } from 'zod'

const TIPOS_VEICULO = ['VAN', 'TOCO', 'TRUCK', 'BITRUCK', 'CARRETA', 'CARRETA_LS', 'BITREM'] as const

const VeiculoUpdateSchema = z.object({
  placa: z.string().min(7).optional(),
  tipo: z.enum(TIPOS_VEICULO).optional(),
  modelo: z.string().nullable().optional(),
  ano: z.number().int().nullable().optional(),
  proprietario: z.string().nullable().optional(),
  ativo: z.boolean().optional(),
  tipo_veiculo: z.enum(['FROTA', 'AGREGADO']).nullable().optional(),
  tem_placas_separadas: z.boolean().optional(),
  placa_carreta: z.string().nullable().optional(),
  cpf_proprietario: z.string().nullable().optional(),
  cnpj_proprietario: z.string().nullable().optional(),
  banco_proprietario: z.string().nullable().optional(),
  agencia_conta_proprietario: z.string().nullable().optional(),
  chave_pix_proprietario: z.string().nullable().optional(),
  rntrc: z.string().nullable().optional(),
  tag: z.string().nullable().optional(),
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

  const body = await request.json()
  const parsed = VeiculoUpdateSchema.safeParse(body)
  if (!parsed.success) return Response.json({ error: parsed.error.flatten() }, { status: 422 })

  const { data, error } = await supabase.from('veiculos').update(parsed.data).eq('id', id).select().single()
  if (error) {
    console.error('[veiculos/id] update error', error)
    return Response.json({ error: 'Erro interno' }, { status: 500 })
  }
  return Response.json(data)
}

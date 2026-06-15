import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { z } from 'zod'

const ROLES_PERMITIDOS = ['ADMIN', 'SUPERVISOR'] as const

const UpdateSchema = z.object({
  papel: z.enum(['ADMIN', 'SUPERVISOR', 'CONFERENTE']).optional(),
  senha: z.string().min(6).optional(),
  nome: z.string().min(2).optional(),
  telefone: z.string().nullable().optional(),
  ativo: z.boolean().optional(),
}).refine((d) => d.papel !== undefined || d.senha !== undefined || d.nome !== undefined || d.telefone !== undefined || d.ativo !== undefined, {
  message: 'Nenhum campo para atualizar',
})

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'Não autorizado' }, { status: 401 })

  const { data: perfilAtual } = await supabase.from('users').select('papel').eq('id', user.id).single()
  if (!perfilAtual || !ROLES_PERMITIDOS.includes(perfilAtual.papel as typeof ROLES_PERMITIDOS[number])) {
    return Response.json({ error: 'Permissão insuficiente' }, { status: 403 })
  }

  // SUPERVISOR não pode promover/rebaixar para ADMIN nem editar outro ADMIN
  if (perfilAtual.papel === 'SUPERVISOR') {
    const { data: alvo } = await supabase.from('users').select('papel').eq('id', id).single()
    if (alvo?.papel === 'ADMIN') {
      return Response.json({ error: 'SUPERVISOR não pode editar um ADMIN' }, { status: 403 })
    }
  }

  const body = await request.json()
  const parsed = UpdateSchema.safeParse(body)
  if (!parsed.success) {
    return Response.json({ error: parsed.error.flatten() }, { status: 422 })
  }

  const { papel, senha, ...camposTabela } = parsed.data

  // Atualiza papel/nome/telefone/ativo na tabela users
  if (Object.keys(camposTabela).length > 0 || papel) {
    const update: { nome?: string; telefone?: string | null; ativo?: boolean; papel?: 'ADMIN' | 'SUPERVISOR' | 'CONFERENTE' } = { ...camposTabela }
    if (papel) update.papel = papel

    const { error } = await supabase.from('users').update(update).eq('id', id)
    if (error) return Response.json({ error: error.message }, { status: 500 })
  }

  // Atualiza senha via admin client
  if (senha) {
    const admin = createAdminClient()
    const { error: authError } = await admin.auth.admin.updateUserById(id, { password: senha })
    if (authError) return Response.json({ error: authError.message }, { status: 500 })
  }

  const { data: atualizado } = await supabase.from('users').select('id, nome, papel, telefone, ativo').eq('id', id).single()
  return Response.json(atualizado)
}

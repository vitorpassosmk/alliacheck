import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import type { User } from '@supabase/supabase-js'
import { z } from 'zod'

const UsuarioCreateSchema = z.object({
  nome: z.string().min(2),
  email: z.string().email(),
  papel: z.enum(['ADMIN', 'SUPERVISOR', 'CONFERENTE']),
  telefone: z.string().optional().nullable(),
  senha: z.string().min(6),
})

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'Não autorizado' }, { status: 401 })

  const { data: perfil } = await supabase.from('users').select('papel').eq('id', user.id).single()
  if (!perfil || !['ADMIN', 'SUPERVISOR'].includes(perfil.papel)) {
    return Response.json({ error: 'Apenas ADMINs e SUPERVISORs podem listar usuários' }, { status: 403 })
  }

  const admin = createAdminClient()

  const { data, error } = await admin
    .from('users')
    .select('id, nome, papel, telefone, ativo, criado_em')
    .order('criado_em', { ascending: false })

  if (error) return Response.json({ error: error.message }, { status: 500 })

  const { data: authUsers } = await admin.auth.admin.listUsers()
  const emailMap = new Map(authUsers.users.map((u: User) => [u.id, u.email]))

  const users = data.map((u) => ({ ...u, email: emailMap.get(u.id) ?? null }))
  return Response.json(users)
}

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'Não autorizado' }, { status: 401 })

  const { data: perfil } = await supabase.from('users').select('papel').eq('id', user.id).single()
  if (!perfil || !['ADMIN', 'SUPERVISOR'].includes(perfil.papel)) {
    return Response.json({ error: 'Apenas ADMINs e SUPERVISORs podem criar usuários' }, { status: 403 })
  }

  const body = await request.json()
  const parsed = UsuarioCreateSchema.safeParse(body)
  if (!parsed.success) {
    return Response.json({ error: parsed.error.flatten() }, { status: 422 })
  }

  if (perfil.papel === 'SUPERVISOR' && parsed.data.papel === 'ADMIN') {
    return Response.json({ error: 'SUPERVISOR não pode criar usuários ADMIN' }, { status: 403 })
  }

  const admin = createAdminClient()
  const { data: authUser, error: authError } = await admin.auth.admin.createUser({
    email: parsed.data.email,
    password: parsed.data.senha,
    email_confirm: true,
  })

  let authUserId: string

  if (authError) {
    const isDuplicate =
      authError.message.toLowerCase().includes('already') ||
      (authError as { status?: number }).status === 422

    if (!isDuplicate) {
      return Response.json({ error: authError.message }, { status: 500 })
    }

    // Email já existe no auth — verificar se há perfil na tabela pública
    const { data: allAuthUsers } = await admin.auth.admin.listUsers({ perPage: 1000 })
    const existing = allAuthUsers?.users.find((u: User) => u.email === parsed.data.email)

    if (!existing) {
      return Response.json({ error: 'Este email já está cadastrado no sistema.' }, { status: 422 })
    }

    const { data: existingProfile } = await admin
      .from('users')
      .select('id')
      .eq('id', existing.id)
      .maybeSingle()

    if (existingProfile) {
      return Response.json({ error: 'Este email já está cadastrado no sistema.' }, { status: 422 })
    }

    // Usuário órfão (auth existe mas sem perfil) — atualizar senha e reaproveitar
    await admin.auth.admin.updateUserById(existing.id, { password: parsed.data.senha })
    authUserId = existing.id
  } else {
    authUserId = authUser.user.id
  }

  const { data, error } = await admin.from('users').insert({
    id: authUserId,
    nome: parsed.data.nome,
    papel: parsed.data.papel,
    telefone: parsed.data.telefone ?? null,
  }).select().single()

  if (error) return Response.json({ error: error.message }, { status: 500 })

  return Response.json({ ...data, email: parsed.data.email }, { status: 201 })
}

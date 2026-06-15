import { createClient } from '@/lib/supabase/server'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'Não autorizado' }, { status: 401 })

  const { count, error } = await supabase
    .from('fretes')
    .select('id', { count: 'exact', head: true })
    .is('excluido_em', null)

  if (error) return Response.json({ error: error.message }, { status: 500 })

  const proximo = `F-${String((count ?? 0) + 1).padStart(4, '0')}`
  return Response.json({ numero: proximo })
}

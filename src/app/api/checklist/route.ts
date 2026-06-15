import { createClient } from '@/lib/supabase/server'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'Não autorizado' }, { status: 401 })

  const { data, error } = await supabase
    .from('checklist_itens')
    .select('id, descricao, ordem')
    .eq('ativo', true)
    .order('ordem')

  if (error) return Response.json({ error: 'Erro interno' }, { status: 500 })
  return Response.json(data)
}

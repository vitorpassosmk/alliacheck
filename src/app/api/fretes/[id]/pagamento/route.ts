import { createClient } from '@/lib/supabase/server'
import { invalidUUID } from '@/lib/api-helpers'

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const uuidErr = invalidUUID(id)
  if (uuidErr) return uuidErr

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'Não autorizado' }, { status: 401 })

  // Verifica se o frete existe, está CONCLUIDA e ainda não foi pago
  const { data: frete } = await supabase
    .from('fretes')
    .select('status, pago_em, numero_frete')
    .eq('id', id)
    .single()

  if (!frete) return Response.json({ error: 'Frete não encontrado' }, { status: 404 })
  if (frete.status !== 'CONCLUIDA') {
    return Response.json({ error: 'Apenas fretes com status CONCLUIDA podem ser marcados como pagos' }, { status: 422 })
  }
  if (frete.pago_em) {
    return Response.json({ error: 'Pagamento já foi confirmado' }, { status: 409 })
  }

  const { error: updateError } = await supabase
    .from('fretes')
    .update({ pago_em: new Date().toISOString(), pago_por: user.id })
    .eq('id', id)

  if (updateError) return Response.json({ error: 'Erro interno' }, { status: 500 })

  await supabase.from('eventos').insert({
    frete_id: id,
    tipo: 'PAGAMENTO_CONFIRMADO',
    descricao: `Pagamento do frete ${frete.numero_frete} confirmado`,
    usuario_id: user.id,
    ip_address: request.headers.get('x-forwarded-for') ?? request.headers.get('x-real-ip'),
    user_agent: request.headers.get('user-agent'),
  })

  return Response.json({ ok: true })
}

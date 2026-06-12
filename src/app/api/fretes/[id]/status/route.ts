import { createClient } from '@/lib/supabase/server'
import { validarTransicao } from '@/lib/state-machine'
import { validarChaveNFe } from '@/lib/validations/chave-nfe'
import { invalidUUID } from '@/lib/api-helpers'
import type { StatusViagem } from '@/lib/state-machine'

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

  const body: { status: string; chave_cte?: string; motivo?: string } = await request.json()
  const novoStatus = body.status as StatusViagem
  const { chave_cte, motivo } = body

  const motivoSanitizado = motivo?.trim().slice(0, 500)

  const { data: frete } = await supabase
    .from('fretes')
    .select('status, motorista_id, veiculo_id, data_carregamento')
    .eq('id', id)
    .single()

  if (!frete) return Response.json({ error: 'Frete não encontrado' }, { status: 404 })

  if (!validarTransicao(frete.status as StatusViagem, novoStatus)) {
    return Response.json(
      { error: `Transição ${frete.status} → ${novoStatus} não permitida` },
      { status: 422 }
    )
  }

  if (novoStatus === 'CTE_EMITIDO') {
    if (!chave_cte) {
      return Response.json({ error: 'Chave CT-e é obrigatória para CTE_EMITIDO' }, { status: 422 })
    }
    if (!validarChaveNFe(chave_cte)) {
      return Response.json({ error: 'Chave CT-e inválida (44 dígitos, módulo 11)' }, { status: 422 })
    }
  }

  const { error: updateError } = await supabase
    .from('fretes')
    .update({
      status: novoStatus,
      ...(novoStatus === 'CTE_EMITIDO' && chave_cte ? { chave_cte } : {}),
      ...(novoStatus === 'CANCELADO' && motivoSanitizado ? { observacoes: motivoSanitizado } : {}),
    })
    .eq('id', id)

  if (updateError) {
    console.error('[fretes/status] update error', updateError)
    return Response.json({ error: 'Erro interno' }, { status: 500 })
  }

  await supabase.from('eventos').insert({
    frete_id: id,
    tipo: 'STATUS_CHANGE',
    descricao: motivoSanitizado ?? `Status alterado para ${novoStatus}`,
    status_anterior: frete.status,
    status_novo: novoStatus,
    usuario_id: user.id,
    ip_address: request.headers.get('x-forwarded-for') ?? request.headers.get('x-real-ip'),
    user_agent: request.headers.get('user-agent'),
  })

  return Response.json({ ok: true, novoStatus })
}

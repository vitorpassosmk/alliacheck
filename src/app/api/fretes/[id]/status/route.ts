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

  if (!perfil) {
    return Response.json({ error: 'Permissão insuficiente' }, { status: 403 })
  }

  const body: Record<string, unknown> = await request.json()
  const novoStatus = body.status as StatusViagem

  if (novoStatus === 'CANCELADO' && perfil.papel !== 'ADMIN') {
    return Response.json({ error: 'Apenas ADMINs podem cancelar fretes' }, { status: 403 })
  }

  const { data: frete } = await supabase
    .from('fretes')
    .select('status, numero_frete')
    .eq('id', id)
    .is('excluido_em', null)
    .single()

  if (!frete) return Response.json({ error: 'Frete não encontrado' }, { status: 404 })

  if (!validarTransicao(frete.status as StatusViagem, novoStatus)) {
    return Response.json(
      { error: `Transição ${frete.status} → ${novoStatus} não permitida` },
      { status: 422 }
    )
  }

  // Campos adicionais a atualizar no frete conforme a transição
  const camposAdicionais: Record<string, unknown> = {}

  if (novoStatus === 'PROGRAMADO') {
    const motorista_id = body.motorista_id as string | undefined
    const veiculo_id = body.veiculo_id as string | undefined
    if (!motorista_id || !veiculo_id) {
      return Response.json({ error: 'Selecione motorista e veículo para programar o frete' }, { status: 422 })
    }
    const uuidRe = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    if (!uuidRe.test(motorista_id) || !uuidRe.test(veiculo_id)) {
      return Response.json({ error: 'IDs de motorista e veículo inválidos' }, { status: 422 })
    }
    camposAdicionais.motorista_id = motorista_id
    camposAdicionais.veiculo_id = veiculo_id
  }

  if (novoStatus === 'CARREGANDO') {
    const numero_gr = (body.numero_gr as string | undefined)?.trim()
    if (!numero_gr) {
      return Response.json({ error: 'N° GR (contrato de seguro) é obrigatório para iniciar o carregamento' }, { status: 422 })
    }
    camposAdicionais.numero_gr = numero_gr
  }

  if (novoStatus === 'CTE_EMITIDO') {
    const chave_cte = body.chave_cte as string | undefined
    if (!chave_cte) {
      return Response.json({ error: 'Chave CT-e é obrigatória' }, { status: 422 })
    }
    if (!validarChaveNFe(chave_cte)) {
      return Response.json({ error: 'Chave CT-e inválida (44 dígitos, módulo 11)' }, { status: 422 })
    }
    camposAdicionais.chave_cte = chave_cte
  }

  if (novoStatus === 'AGUARDANDO_LIBERACAO') {
    const numero_contrato = (body.numero_contrato as string | undefined)?.trim()
    const numero_ciot = (body.numero_ciot as string | undefined)?.trim()
    const valor_adiantamento = body.valor_adiantamento as number | undefined
    if (!numero_contrato) {
      return Response.json({ error: 'N° do contrato é obrigatório' }, { status: 422 })
    }
    if (!numero_ciot) {
      return Response.json({ error: 'N° CIOT é obrigatório' }, { status: 422 })
    }
    if (!valor_adiantamento || valor_adiantamento <= 0) {
      return Response.json({ error: 'Valor de adiantamento é obrigatório e deve ser maior que zero' }, { status: 422 })
    }
    camposAdicionais.numero_contrato = numero_contrato
    camposAdicionais.numero_ciot = numero_ciot
    camposAdicionais.valor_adiantamento = valor_adiantamento
  }

  const motivoSanitizado = novoStatus === 'CANCELADO'
    ? (body.motivo as string | undefined)?.trim().slice(0, 500)
    : undefined

  if (novoStatus === 'CANCELADO' && motivoSanitizado) {
    camposAdicionais.observacoes = motivoSanitizado
  }

  const { error: updateError } = await supabase
    .from('fretes')
    .update({ status: novoStatus, ...camposAdicionais })
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

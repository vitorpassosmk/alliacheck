import { createClient } from '@/lib/supabase/server'
import { validarTransicao } from '@/lib/state-machine'
import { validarChaveNFe } from '@/lib/validations/chave-nfe'
import { invalidUUID, extractIp } from '@/lib/api-helpers'
import type { StatusViagem } from '@/lib/state-machine'
import { z } from 'zod'

const StatusSchema = z.enum([
  'ABERTO', 'PROGRAMADO', 'CARREGANDO', 'CTE_EMITIDO',
  'AGUARDANDO_LIBERACAO', 'EM_VIAGEM', 'CONCLUIDA', 'CANCELADO',
])

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
  const statusResult = StatusSchema.safeParse(body.status)
  if (!statusResult.success) return Response.json({ error: 'Status inválido' }, { status: 422 })
  const novoStatus = statusResult.data as StatusViagem

  if (novoStatus === 'CANCELADO' && !['ADMIN', 'SUPERVISOR'].includes(perfil.papel)) {
    return Response.json({ error: 'Apenas ADMIN e SUPERVISOR podem cancelar fretes' }, { status: 403 })
  }

  const { data: frete } = await supabase
    .from('fretes')
    .select('status, numero_frete, data_carregamento, valor_adiantamento, data_entrega_prevista, custo_agregado, motorista_id, veiculo_id')
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

    // Determina se custo_agregado é obrigatório com base no tipo do motorista e veículo
    const [{ data: motoristaDados }, { data: veiculoDados }] = await Promise.all([
      supabase.from('motoristas').select('tipo_motorista').eq('id', motorista_id).single(),
      supabase.from('veiculos').select('tipo_veiculo').eq('id', veiculo_id).single(),
    ])
    const custoObrigatorio = !(motoristaDados?.tipo_motorista === 'FROTA' && veiculoDados?.tipo_veiculo === 'FROTA')

    // data_carregamento: exigida aqui se não foi informada na criação do frete
    if (!frete.data_carregamento) {
      const data_carregamento = (body.data_carregamento as string | undefined)?.trim()
      if (!data_carregamento) {
        return Response.json({ error: 'Data de carregamento é obrigatória para programar o frete' }, { status: 422 })
      }
      camposAdicionais.data_carregamento = data_carregamento
    }

    // data_entrega_prevista: exigida se não foi informada na criação
    if (!frete.data_entrega_prevista) {
      const data_entrega_prevista = (body.data_entrega_prevista as string | undefined)?.trim()
      if (!data_entrega_prevista) {
        return Response.json({ error: 'Data prevista de entrega é obrigatória para programar o frete' }, { status: 422 })
      }
      camposAdicionais.data_entrega_prevista = data_entrega_prevista
    }

    // custo_agregado: obrigatório quando motorista ou veículo for AGREGADO; opcional se ambos forem FROTA
    const custo_agregado = body.custo_agregado as number | undefined
    if (!frete.custo_agregado) {
      if (custoObrigatorio) {
        if (custo_agregado === undefined || custo_agregado <= 0) {
          return Response.json({ error: 'Custo do agregado é obrigatório para programar o frete com motorista ou veículo agregado' }, { status: 422 })
        }
        camposAdicionais.custo_agregado = custo_agregado
      } else if (custo_agregado !== undefined && custo_agregado > 0) {
        camposAdicionais.custo_agregado = custo_agregado
      }
    } else if (custo_agregado !== undefined) {
      if (custo_agregado <= 0) {
        return Response.json({ error: 'Custo do agregado deve ser maior que zero' }, { status: 422 })
      }
      camposAdicionais.custo_agregado = custo_agregado
    }

    // valor_adiantamento: pode ser registrado já na programação
    const valor_adiantamento_prog = body.valor_adiantamento as number | undefined
    if (valor_adiantamento_prog !== undefined) {
      if (valor_adiantamento_prog <= 0) {
        return Response.json({ error: 'Valor de adiantamento deve ser maior que zero' }, { status: 422 })
      }
      camposAdicionais.valor_adiantamento = valor_adiantamento_prog
    }

    // placa_carreta: placa da carreta para combinações cavalo+carreta
    const placa_carreta = body.placa_carreta as string | null | undefined
    if (placa_carreta !== undefined) {
      camposAdicionais.placa_carreta = placa_carreta
        ? placa_carreta.trim().toUpperCase().slice(0, 8)
        : null
    }

    // placa_cavalo: placa do cavalo (trator) quando diferente da registrada no veículo
    const placa_cavalo = body.placa_cavalo as string | null | undefined
    if (placa_cavalo !== undefined) {
      camposAdicionais.placa_cavalo = placa_cavalo
        ? placa_cavalo.trim().toUpperCase().slice(0, 8)
        : null
    }

    // motorista_e_funcionario_agregado: flag ANTT — motorista é funcionário do proprietário do veículo
    const motorista_e_funcionario_agregado = body.motorista_e_funcionario_agregado as boolean | undefined
    if (motorista_e_funcionario_agregado !== undefined) {
      camposAdicionais.motorista_e_funcionario_agregado = !!motorista_e_funcionario_agregado
    }
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
    // Frota não emite contrato e não recebe adiantamento — apenas CT-e e CIOT
    const [{ data: motoristaDados }, { data: veiculoDados }] = await Promise.all([
      frete.motorista_id
        ? supabase.from('motoristas').select('tipo_motorista').eq('id', frete.motorista_id).single()
        : Promise.resolve({ data: null, error: null }),
      frete.veiculo_id
        ? supabase.from('veiculos').select('tipo_veiculo').eq('id', frete.veiculo_id).single()
        : Promise.resolve({ data: null, error: null }),
    ])
    const ambosFretas = motoristaDados?.tipo_motorista === 'FROTA' && veiculoDados?.tipo_veiculo === 'FROTA'

    const numero_contrato = (body.numero_contrato as string | undefined)?.trim()
    const numero_ciot = (body.numero_ciot as string | undefined)?.trim()
    const valor_adiantamento = body.valor_adiantamento as number | undefined

    if (!ambosFretas && !numero_contrato) {
      return Response.json({ error: 'N° do contrato é obrigatório' }, { status: 422 })
    }
    if (!numero_ciot) {
      return Response.json({ error: 'N° CIOT é obrigatório' }, { status: 422 })
    }
    const adiantamentoFinal = valor_adiantamento ?? frete.valor_adiantamento
    if (!ambosFretas && (!adiantamentoFinal || adiantamentoFinal <= 0)) {
      return Response.json({ error: 'Valor de adiantamento é obrigatório e deve ser maior que zero' }, { status: 422 })
    }

    if (numero_contrato) camposAdicionais.numero_contrato = numero_contrato
    camposAdicionais.numero_ciot = numero_ciot
    if (adiantamentoFinal && adiantamentoFinal > 0) camposAdicionais.valor_adiantamento = adiantamentoFinal
  }

  if (novoStatus === 'CONCLUIDA') {
    const data_entrega_real = (body.data_entrega_real as string | undefined)?.trim()
    if (!data_entrega_real) {
      return Response.json({ error: 'Data de descarga é obrigatória para concluir a viagem' }, { status: 422 })
    }
    camposAdicionais.data_entrega_real = data_entrega_real
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
    ip_address: extractIp(request),
    user_agent: request.headers.get('user-agent'),
  })

  return Response.json({ ok: true, novoStatus })
}

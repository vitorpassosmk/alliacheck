import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { extractIp, hashIp } from '@/lib/api-helpers'
import { sanitizarLinha } from '@/lib/export-safety'
import { z } from 'zod'
import ExcelJS from 'exceljs'

const DIAS_RETENCAO = 90
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

const BodySchema = z.object({
  freteIds: z.array(z.string().regex(UUID_RE)).min(1, 'Selecione ao menos um frete'),
})

function calcularDataCorte(): string {
  const corte = new Date()
  corte.setDate(corte.getDate() - DIAS_RETENCAO)
  return corte.toISOString()
}

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'Não autorizado' }, { status: 401 })

  const { data: perfil } = await supabase.from('users').select('papel').eq('id', user.id).single()
  if (!perfil || !['ADMIN', 'SUPERVISOR'].includes(perfil.papel)) {
    return Response.json({ error: 'Apenas ADMINs e SUPERVISORs podem exportar e limpar fretes' }, { status: 403 })
  }

  const body = await request.json().catch(() => null)
  const parsed = BodySchema.safeParse(body)
  if (!parsed.success) return Response.json({ error: parsed.error.flatten() }, { status: 422 })

  // Revalida a elegibilidade no servidor — nunca confia apenas na lista vinda do cliente.
  const { data: fretesElegiveis, error: fretesError } = await supabase
    .from('fretes')
    .select('*, clientes(razao_social), motoristas(nome), veiculos(placa)')
    .in('id', parsed.data.freteIds)
    .in('status', ['CONCLUIDA', 'CANCELADO'])
    .is('excluido_em', null)
    .lte('atualizado_em', calcularDataCorte())

  if (fretesError) return Response.json({ error: fretesError.message }, { status: 500 })
  if (!fretesElegiveis || fretesElegiveis.length === 0) {
    return Response.json({ error: 'Nenhum dos fretes selecionados é elegível para exportação' }, { status: 422 })
  }

  const freteIdsValidos = fretesElegiveis.map((f) => f.id)

  const { data: eventosRelacionados, error: eventosError } = await supabase
    .from('eventos')
    .select('*, users(nome)')
    .in('frete_id', freteIdsValidos)
    .order('criado_em', { ascending: true })

  if (eventosError) return Response.json({ error: eventosError.message }, { status: 500 })

  // Monta o Excel com duas abas — este arquivo passa a ser o único registro
  // permanente desses fretes e eventos após a limpeza do banco.
  const workbook = new ExcelJS.Workbook()

  const freteSheet = workbook.addWorksheet('Fretes')
  const freteColunas = Object.keys(fretesElegiveis[0]).filter((k) => k !== 'clientes' && k !== 'motoristas' && k !== 'veiculos')
  freteSheet.columns = [
    { header: 'cliente', key: 'cliente', width: 24 },
    { header: 'motorista', key: 'motorista', width: 24 },
    { header: 'veiculo_placa', key: 'veiculo_placa', width: 14 },
    ...freteColunas.map((k) => ({ header: k, key: k, width: 18 })),
  ]
  for (const f of fretesElegiveis) {
    freteSheet.addRow(sanitizarLinha({
      cliente: f.clientes?.razao_social ?? '',
      motorista: f.motoristas?.nome ?? '',
      veiculo_placa: f.veiculos?.placa ?? '',
      ...f,
    }))
  }

  const eventoSheet = workbook.addWorksheet('Eventos')
  const eventoColunas = eventosRelacionados && eventosRelacionados.length > 0
    ? Object.keys(eventosRelacionados[0]).filter((k) => k !== 'users')
    : ['id', 'frete_id', 'tipo', 'descricao', 'status_anterior', 'status_novo', 'usuario_id', 'ip_address', 'user_agent', 'criado_em']
  eventoSheet.columns = [
    { header: 'usuario_nome', key: 'usuario_nome', width: 24 },
    ...eventoColunas.map((k) => ({ header: k, key: k, width: 18 })),
  ]
  for (const e of eventosRelacionados ?? []) {
    eventoSheet.addRow(sanitizarLinha({ usuario_nome: e.users?.nome ?? '', ...e }))
  }

  const buffer = await workbook.xlsx.writeBuffer()

  // Só após o arquivo estar pronto: exclui os fretes. Não há policy de DELETE para
  // `fretes` no RLS (por design), então a exclusão exige o client com service role.
  const admin = createAdminClient()
  const { error: deleteError } = await admin
    .from('fretes')
    .delete()
    .in('id', freteIdsValidos)

  if (deleteError) {
    console.error('[exportar-fretes] delete error', deleteError)
    return Response.json({ error: 'Falha ao excluir os fretes após a exportação. Nada foi apagado.' }, { status: 500 })
  }

  // Registro permanente da limpeza — melhor esforço, não bloqueia a resposta se falhar.
  const { error: logError } = await supabase.from('exportacoes_arquivo').insert({
    executado_por: user.id,
    quantidade_fretes: freteIdsValidos.length,
    numeros_fretes: fretesElegiveis.map((f) => f.numero_frete),
    ip_address: hashIp(extractIp(request)),
    user_agent: request.headers.get('user-agent'),
  })
  if (logError) console.error('[exportar-fretes] log insert error', logError)

  return new Response(buffer, {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="fretes-exportados-${new Date().toISOString().slice(0, 10)}.xlsx"`,
    },
  })
}

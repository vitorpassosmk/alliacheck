import type { Tables } from '@/types/database.types'

export type FreteComRelacoes = Tables<'fretes'> & {
  clientes: Pick<Tables<'clientes'>, 'razao_social'> | null
  motoristas: Pick<Tables<'motoristas'>, 'nome'> | null
  veiculos: Pick<Tables<'veiculos'>, 'placa' | 'tipo'> | null
}

export type FreteCreatePayload = {
  cliente_id?: string | null
  motorista_id?: string | null
  veiculo_id?: string | null
  origem_cidade: string
  origem_uf: string
  destino_cidade: string
  destino_uf: string
  tipo_veiculo?: string | null
  valor_frete?: number | null
  data_carregamento?: string | null
  data_entrega_prevista?: string | null
  observacoes?: string | null
}

export type FreteUpdatePayload = Partial<FreteCreatePayload>

export type FreteStatusPayload = {
  status: Tables<'fretes'>['status']
  motivo_cancelamento?: string
}

async function handleResponse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }))
    throw new Error(err.error ?? 'Erro desconhecido')
  }
  return res.json()
}

export const fretesService = {
  listar: (): Promise<FreteComRelacoes[]> =>
    fetch('/api/fretes').then((r) => handleResponse(r)),

  buscar: (id: string): Promise<FreteComRelacoes> =>
    fetch(`/api/fretes/${id}`).then((r) => handleResponse(r)),

  criar: (payload: FreteCreatePayload): Promise<Tables<'fretes'>> =>
    fetch('/api/fretes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    }).then((r) => handleResponse(r)),

  atualizar: (id: string, payload: FreteUpdatePayload): Promise<Tables<'fretes'>> =>
    fetch(`/api/fretes/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    }).then((r) => handleResponse(r)),

  atualizarStatus: (id: string, payload: FreteStatusPayload): Promise<Tables<'fretes'>> =>
    fetch(`/api/fretes/${id}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    }).then((r) => handleResponse(r)),

}

import type { Tables, TablesInsert, TablesUpdate } from '@/types/database.types'

async function handleResponse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }))
    throw new Error(err.error ?? 'Erro desconhecido')
  }
  return res.json()
}

export const veiculosService = {
  listar: (): Promise<Tables<'veiculos'>[]> =>
    fetch('/api/veiculos').then((r) => handleResponse(r)),

  buscar: (id: string): Promise<Tables<'veiculos'>> =>
    fetch(`/api/veiculos/${id}`).then((r) => handleResponse(r)),

  criar: (payload: TablesInsert<'veiculos'>): Promise<Tables<'veiculos'>> =>
    fetch('/api/veiculos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    }).then((r) => handleResponse(r)),

  atualizar: (id: string, payload: TablesUpdate<'veiculos'>): Promise<Tables<'veiculos'>> =>
    fetch(`/api/veiculos/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    }).then((r) => handleResponse(r)),
}

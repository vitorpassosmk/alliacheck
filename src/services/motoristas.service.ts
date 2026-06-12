import type { Tables, TablesInsert, TablesUpdate } from '@/types/database.types'

async function handleResponse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }))
    throw new Error(err.error ?? 'Erro desconhecido')
  }
  return res.json()
}

export const motoristasService = {
  listar: (): Promise<Tables<'motoristas'>[]> =>
    fetch('/api/motoristas').then((r) => handleResponse(r)),

  buscar: (id: string): Promise<Tables<'motoristas'>> =>
    fetch(`/api/motoristas/${id}`).then((r) => handleResponse(r)),

  criar: (payload: TablesInsert<'motoristas'>): Promise<Tables<'motoristas'>> =>
    fetch('/api/motoristas', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    }).then((r) => handleResponse(r)),

  atualizar: (id: string, payload: TablesUpdate<'motoristas'>): Promise<Tables<'motoristas'>> =>
    fetch(`/api/motoristas/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    }).then((r) => handleResponse(r)),
}

import type { Tables, TablesInsert, TablesUpdate } from '@/types/database.types'

async function handleResponse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }))
    throw new Error(err.error ?? 'Erro desconhecido')
  }
  return res.json()
}

export const clientesService = {
  listar: (): Promise<Tables<'clientes'>[]> =>
    fetch('/api/clientes').then((r) => handleResponse(r)),

  buscar: (id: string): Promise<Tables<'clientes'>> =>
    fetch(`/api/clientes/${id}`).then((r) => handleResponse(r)),

  criar: (payload: TablesInsert<'clientes'>): Promise<Tables<'clientes'>> =>
    fetch('/api/clientes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    }).then((r) => handleResponse(r)),

  atualizar: (id: string, payload: TablesUpdate<'clientes'>): Promise<Tables<'clientes'>> =>
    fetch(`/api/clientes/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    }).then((r) => handleResponse(r)),
}

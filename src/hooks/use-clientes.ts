import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { clientesService } from '@/services/clientes.service'
import type { TablesInsert, TablesUpdate } from '@/types/database.types'
import { toast } from 'sonner'

export const CLIENTES_KEY = ['clientes'] as const

export function useClientes() {
  return useQuery({
    queryKey: CLIENTES_KEY,
    queryFn: () => clientesService.listar(),
  })
}

export function useClientesAtivos() {
  return useQuery({
    queryKey: [...CLIENTES_KEY, 'ativos'],
    queryFn: async () => {
      const todos = await clientesService.listar()
      return todos.filter((c) => c.ativo)
    },
  })
}

export function useCriarCliente() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: TablesInsert<'clientes'>) => clientesService.criar(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: CLIENTES_KEY })
      toast.success('Cliente cadastrado')
    },
    onError: (err: Error) => toast.error(err.message),
  })
}

export function useAtualizarCliente() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: TablesUpdate<'clientes'> }) =>
      clientesService.atualizar(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: CLIENTES_KEY })
      toast.success('Cliente atualizado')
    },
    onError: (err: Error) => toast.error(err.message),
  })
}

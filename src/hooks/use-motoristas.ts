import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motoristasService } from '@/services/motoristas.service'
import type { TablesInsert, TablesUpdate } from '@/types/database.types'
import { toast } from 'sonner'

export const MOTORISTAS_KEY = ['motoristas'] as const

export function useMotoristas() {
  return useQuery({
    queryKey: MOTORISTAS_KEY,
    queryFn: () => motoristasService.listar(),
  })
}

export function useMotoristasAtivos() {
  return useQuery({
    queryKey: [...MOTORISTAS_KEY, 'ativos'],
    queryFn: async () => {
      const todos = await motoristasService.listar()
      return todos.filter((m) => m.status === 'ATIVO')
    },
  })
}

export function useCriarMotorista() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: TablesInsert<'motoristas'>) => motoristasService.criar(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: MOTORISTAS_KEY })
      toast.success('Motorista cadastrado')
    },
    onError: (err: Error) => toast.error(err.message),
  })
}

export function useAtualizarMotorista() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: TablesUpdate<'motoristas'> }) =>
      motoristasService.atualizar(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: MOTORISTAS_KEY })
      toast.success('Motorista atualizado')
    },
    onError: (err: Error) => toast.error(err.message),
  })
}

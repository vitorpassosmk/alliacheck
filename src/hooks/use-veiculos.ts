import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { veiculosService } from '@/services/veiculos.service'
import type { TablesInsert, TablesUpdate } from '@/types/database.types'
import { toast } from 'sonner'

export const VEICULOS_KEY = ['veiculos'] as const

export function useVeiculos() {
  return useQuery({
    queryKey: VEICULOS_KEY,
    queryFn: () => veiculosService.listar(),
  })
}

export function useVeiculosAtivos() {
  return useQuery({
    queryKey: [...VEICULOS_KEY, 'ativos'],
    queryFn: async () => {
      const todos = await veiculosService.listar()
      return todos.filter((v) => v.ativo)
    },
  })
}

export function useCriarVeiculo() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: TablesInsert<'veiculos'>) => veiculosService.criar(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: VEICULOS_KEY })
      toast.success('Veículo cadastrado')
    },
    onError: (err: Error) => toast.error(err.message),
  })
}

export function useAtualizarVeiculo() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: TablesUpdate<'veiculos'> }) =>
      veiculosService.atualizar(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: VEICULOS_KEY })
      toast.success('Veículo atualizado')
    },
    onError: (err: Error) => toast.error(err.message),
  })
}

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { fretesService, type FreteCreatePayload, type FreteUpdatePayload, type FreteStatusPayload } from '@/services/fretes.service'
import { toast } from 'sonner'

export const FRETES_KEY = ['fretes'] as const

export function useFretes() {
  return useQuery({
    queryKey: FRETES_KEY,
    queryFn: () => fretesService.listar(),
  })
}

export function useFrete(id: string | null) {
  return useQuery({
    queryKey: [...FRETES_KEY, id],
    queryFn: () => fretesService.buscar(id!),
    enabled: !!id,
  })
}

export function useCriarFrete() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: FreteCreatePayload) => fretesService.criar(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: FRETES_KEY })
      toast.success('Frete criado com sucesso')
    },
    onError: (err: Error) => toast.error(err.message),
  })
}

export function useAtualizarFrete() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: FreteUpdatePayload }) =>
      fretesService.atualizar(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: FRETES_KEY })
      toast.success('Frete atualizado')
    },
    onError: (err: Error) => toast.error(err.message),
  })
}

export function useAtualizarStatusFrete() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: FreteStatusPayload }) =>
      fretesService.atualizarStatus(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: FRETES_KEY })
      toast.success('Status atualizado')
    },
    onError: (err: Error) => toast.error(err.message),
  })
}

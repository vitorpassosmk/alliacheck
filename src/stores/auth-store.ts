import { create } from 'zustand'
import type { Tables } from '@/types/database.types'

type Papel = 'ADMIN' | 'SUPERVISOR' | 'CONFERENTE'

type AuthUser = {
  id: string
  email: string
  nome: string
  papel: Papel
  telefone: string | null
  ativo: boolean
}

type AuthState = {
  user: AuthUser | null
  isLoading: boolean
  setUser: (user: AuthUser | null) => void
  setLoading: (loading: boolean) => void
  isAdmin: () => boolean
  isSupervisor: () => boolean
  isConferente: () => boolean
  podeGerenciar: () => boolean
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  isLoading: true,
  setUser: (user) => set({ user, isLoading: false }),
  setLoading: (isLoading) => set({ isLoading }),
  isAdmin: () => get().user?.papel === 'ADMIN',
  isSupervisor: () => get().user?.papel === 'SUPERVISOR',
  isConferente: () => get().user?.papel === 'CONFERENTE',
  podeGerenciar: () => {
    const papel = get().user?.papel
    return papel === 'ADMIN' || papel === 'SUPERVISOR'
  },
}))

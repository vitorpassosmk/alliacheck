'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import {
  LayoutDashboard,
  Users,
  Truck,
  Building2,
  LogOut,
  Package,
  BarChart3,
  UserCog,
  Banknote,
  CircleUser,
} from 'lucide-react'
import { toast } from 'sonner'
import { useEffect, useState } from 'react'
import { MinhaContaModal } from './MinhaContaModal'

type Papel = 'ADMIN' | 'SUPERVISOR' | 'CONFERENTE'

type NavItem = {
  href: string
  label: string
  icon: React.ElementType
  somente?: Papel[]
}

const navItems: NavItem[] = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/fretes', label: 'Fretes', icon: Package },
  { href: '/motoristas', label: 'Motoristas', icon: Users },
  { href: '/veiculos', label: 'Veículos', icon: Truck },
  { href: '/clientes', label: 'Clientes', icon: Building2 },
  { href: '/pagamentos', label: 'Pagamentos', icon: Banknote, somente: ['ADMIN', 'SUPERVISOR'] as Papel[] },
  { href: '/relatorios', label: 'Relatórios', icon: BarChart3 },
  { href: '/usuarios', label: 'Usuários', icon: UserCog, somente: ['ADMIN', 'SUPERVISOR'] as Papel[] },
]

const labelPapel: Record<Papel, string> = {
  ADMIN: 'Administrador',
  SUPERVISOR: 'Supervisor',
  CONFERENTE: 'Conferente',
}

type UsuarioLogado = {
  id: string
  nome: string
  email: string
  papel: Papel
  telefone: string | null
}

export function Sidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()
  const [papel, setPapel] = useState<Papel | null>(null)
  const [usuarioLogado, setUsuarioLogado] = useState<UsuarioLogado | null>(null)
  const [minhaContaAberta, setMinhaContaAberta] = useState(false)

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) return
      const { data } = await supabase.from('users').select('nome, papel, telefone').eq('id', user.id).single()
      if (data) {
        setPapel(data.papel as Papel)
        setUsuarioLogado({
          id: user.id,
          nome: data.nome,
          email: user.email ?? '',
          papel: data.papel as Papel,
          telefone: data.telefone ?? null,
        })
      }
    })
  }, [])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    toast.success('Sessão encerrada')
    router.push('/login')
    router.refresh()
  }

  const itemsVisiveis = navItems.filter(
    (item) => !item.somente || !papel || item.somente.includes(papel)
  )

  return (
    <aside className="flex flex-col w-64 h-screen bg-[#0F172A] border-r border-white/10 shrink-0">
      {/* Logo */}
      <div className="p-4 border-b border-white/10">
        <div className="flex items-center gap-2">
          <span className="text-lg font-bold text-white tracking-tight">
            ALLiA Check
          </span>
          <span className="w-2 h-2 rounded-full bg-[#E33900] shrink-0" />
        </div>
        <p className="text-xs text-slate-500 mt-0.5 pl-0.5">Madiã Transportes</p>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto">
        {itemsVisiveis.map(({ href, label, icon: Icon }) => {
          const ativo = pathname === href || pathname.startsWith(href + '/')
          return (
            <Link key={href} href={href}>
              <span
                className={cn(
                  'flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors',
                  ativo
                    ? 'bg-[#E33900]/15 text-[#E33900] border-l-2 border-[#E33900] pl-[10px]'
                    : 'text-slate-400 hover:text-white hover:bg-white/5 border-l-2 border-transparent pl-[10px]'
                )}
              >
                <Icon className="h-4 w-4 shrink-0" />
                {label}
              </span>
            </Link>
          )
        })}
      </nav>

      {/* Role badge */}
      {papel && (
        <div className="px-4 pb-2">
          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-white/10 text-slate-300">
            {labelPapel[papel]}
          </span>
        </div>
      )}

      {/* Minha Conta + Logout */}
      <div className="p-3 border-t border-white/10 space-y-0.5">
        <Button
          variant="ghost"
          className="w-full justify-start gap-3 text-slate-400 hover:text-white hover:bg-white/5"
          onClick={() => setMinhaContaAberta(true)}
        >
          <CircleUser className="h-4 w-4" />
          Minha Conta
        </Button>
        <Button
          variant="ghost"
          className="w-full justify-start gap-3 text-slate-400 hover:text-red-400 hover:bg-red-500/10"
          onClick={handleLogout}
        >
          <LogOut className="h-4 w-4" />
          Sair
        </Button>
      </div>

      {/* ALLiA footer */}
      <div className="p-3 border-t border-white/10 text-xs text-slate-600 text-center">
        powered by{' '}
        <span className="font-medium text-slate-500">ALLiA Lab</span>
      </div>

      {usuarioLogado && (
        <MinhaContaModal
          open={minhaContaAberta}
          onClose={() => setMinhaContaAberta(false)}
          userId={usuarioLogado.id}
          nomeAtual={usuarioLogado.nome}
          emailAtual={usuarioLogado.email}
          telefoneAtual={usuarioLogado.telefone}
        />
      )}
    </aside>
  )
}

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
} from 'lucide-react'
import { toast } from 'sonner'
import { useEffect, useState } from 'react'

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
  { href: '/relatorios', label: 'Relatórios', icon: BarChart3 },
  { href: '/usuarios', label: 'Usuários', icon: UserCog, somente: ['ADMIN'] },
]

export function Sidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()
  const [papel, setPapel] = useState<Papel | null>(null)

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) return
      const { data } = await supabase.from('users').select('papel').eq('id', user.id).single()
      if (data) setPapel(data.papel as Papel)
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
    <aside className="flex flex-col w-64 h-screen border-r bg-background shrink-0">
      {/* Logo */}
      <div className="p-4 border-b">
        <div
          className="text-lg font-bold text-white px-3 py-1.5 rounded-lg inline-block"
          style={{ backgroundColor: 'var(--brand-primary)' }}
        >
          ALLiA Check
        </div>
        <p className="text-xs text-muted-foreground mt-1 pl-1">Madiã Transportes</p>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        {itemsVisiveis.map(({ href, label, icon: Icon }) => {
          const ativo = pathname === href || pathname.startsWith(href + '/')
          return (
            <Link key={href} href={href}>
              <span
                className={cn(
                  'flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors',
                  ativo
                    ? 'bg-accent text-accent-foreground'
                    : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                )}
              >
                <Icon className="h-4 w-4 shrink-0" />
                {label}
              </span>
            </Link>
          )
        })}
      </nav>

      {/* Logout */}
      <div className="p-3 border-t">
        <Button
          variant="ghost"
          className="w-full justify-start gap-3 text-muted-foreground"
          onClick={handleLogout}
        >
          <LogOut className="h-4 w-4" />
          Sair
        </Button>
      </div>

      {/* ALLiA footer */}
      <div className="p-3 border-t text-xs text-muted-foreground text-center">
        powered by{' '}
        <span className="font-medium" style={{ color: 'var(--allia-teal)' }}>
          ALLiA Lab
        </span>
      </div>
    </aside>
  )
}

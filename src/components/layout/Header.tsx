'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { Menu } from 'lucide-react'
import { Sidebar } from './Sidebar'
import type { Tables } from '@/types/database.types'

export function Header() {
  const supabase = createClient()
  const [perfil, setPerfil] = useState<Tables<'users'> | null>(null)

  useEffect(() => {
    const fetchPerfil = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data } = await supabase.from('users').select('*').eq('id', user.id).single()
      setPerfil(data)
    }
    fetchPerfil()
  }, [])

  const initials = perfil?.nome
    ? perfil.nome.split(' ').map((n) => n[0]).slice(0, 2).join('').toUpperCase()
    : '?'

  const papelLabel: Record<string, string> = {
    ADMIN: 'Admin',
    SUPERVISOR: 'Supervisor',
    CONFERENTE: 'Conferente',
  }

  return (
    <header className="h-14 border-b flex items-center justify-between px-4 bg-background shrink-0">
      {/* Mobile menu */}
      <Sheet>
        <SheetTrigger asChild>
          <Button variant="ghost" size="icon" className="md:hidden">
            <Menu className="h-5 w-5" />
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="p-0 w-64">
          <Sidebar />
        </SheetContent>
      </Sheet>

      <div className="flex-1" />

      {/* User info */}
      <div className="flex items-center gap-3">
        {perfil && (
          <Badge variant="outline" className="hidden sm:flex">
            {papelLabel[perfil.papel] ?? perfil.papel}
          </Badge>
        )}
        <div className="flex items-center gap-2">
          <Avatar className="h-8 w-8">
            <AvatarFallback className="text-xs">{initials}</AvatarFallback>
          </Avatar>
          {perfil && (
            <span className="text-sm font-medium hidden sm:block">
              {perfil.nome.split(' ')[0]}
            </span>
          )}
        </div>
      </div>
    </header>
  )
}

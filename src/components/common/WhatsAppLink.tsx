'use client'

import { MessageCircle } from 'lucide-react'
import { buildWhatsAppLink } from '@/lib/whatsapp'
import { cn } from '@/lib/utils'

interface WhatsAppLinkProps {
  numero?: string | null
  label?: string
  className?: string
}

/** Renderiza o número como link clicável para o WhatsApp (wa.me), ou como texto simples se o número não puder ser normalizado. */
export function WhatsAppLink({ numero, label = 'Whatsapp', className }: WhatsAppLinkProps) {
  if (!numero) return null
  const link = buildWhatsAppLink(numero)

  if (!link) {
    return <p className={cn('text-xs text-muted-foreground', className)}>{label}: {numero}</p>
  }

  return (
    <a
      href={link}
      target="_blank"
      rel="noopener noreferrer"
      onClick={(e) => e.stopPropagation()}
      className={cn('text-xs text-emerald-700 hover:underline hover:text-emerald-800 inline-flex items-center gap-1 w-fit', className)}
    >
      <MessageCircle className="h-3 w-3 shrink-0" />
      {numero}
    </a>
  )
}

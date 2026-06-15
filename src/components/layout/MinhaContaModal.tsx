'use client'

import { useState } from 'react'
import { Eye, EyeOff, User } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

type Props = {
  open: boolean
  onClose: () => void
  userId: string
  nomeAtual: string
  emailAtual: string
  telefoneAtual: string | null
}

export function MinhaContaModal({ open, onClose, userId, nomeAtual, emailAtual, telefoneAtual }: Props) {
  const [nome, setNome] = useState(nomeAtual)
  const [telefone, setTelefone] = useState(telefoneAtual ?? '')
  const [senha, setSenha] = useState('')
  const [mostrarSenha, setMostrarSenha] = useState(false)
  const [salvando, setSalvando] = useState(false)

  async function salvar() {
    if (nome.trim().length < 2) {
      toast.error('Nome deve ter no mínimo 2 caracteres')
      return
    }
    if (senha && senha.length < 6) {
      toast.error('Senha deve ter no mínimo 6 caracteres')
      return
    }

    setSalvando(true)
    try {
      const body: Record<string, unknown> = {
        nome: nome.trim(),
        telefone: telefone.trim() || null,
      }
      if (senha) body.senha = senha

      const res = await fetch(`/api/usuarios/${userId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error ?? 'Erro ao salvar')
      }

      toast.success('Dados atualizados com sucesso')
      setSenha('')
      setMostrarSenha(false)
      onClose()
    } catch (err) {
      toast.error((err as Error).message)
    } finally {
      setSalvando(false)
    }
  }

  function fechar() {
    setSenha('')
    setMostrarSenha(false)
    onClose()
  }

  return (
    <Dialog open={open} onOpenChange={(open) => { if (!open) fechar() }}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <User className="h-4 w-4" />
            Minha Conta
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label htmlFor="mc-email">Email</Label>
            <Input id="mc-email" value={emailAtual} disabled className="opacity-60" />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="mc-nome">Nome</Label>
            <Input
              id="mc-nome"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              placeholder="Seu nome completo"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="mc-telefone">Telefone</Label>
            <Input
              id="mc-telefone"
              value={telefone}
              onChange={(e) => setTelefone(e.target.value)}
              placeholder="(11) 99999-9999"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="mc-senha">Nova senha</Label>
            <div className="relative">
              <Input
                id="mc-senha"
                type={mostrarSenha ? 'text' : 'password'}
                value={senha}
                onChange={(e) => setSenha(e.target.value)}
                placeholder="Deixe vazio para não alterar"
                className="pr-10"
              />
              <button
                type="button"
                onClick={() => setMostrarSenha((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                tabIndex={-1}
                aria-label={mostrarSenha ? 'Ocultar senha' : 'Mostrar senha'}
              >
                {mostrarSenha ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            {senha && senha.length < 6 && (
              <p className="text-xs text-destructive">Mínimo 6 caracteres</p>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={fechar}>
            Cancelar
          </Button>
          <Button
            onClick={salvar}
            disabled={salvando || (senha.length > 0 && senha.length < 6) || nome.trim().length < 2}
          >
            {salvando ? 'Salvando...' : 'Salvar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

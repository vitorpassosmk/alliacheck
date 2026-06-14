'use client'

import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { Plus, UserPlus, Shield, Eye, Wrench, Pencil, EyeOff } from 'lucide-react'
import { toast } from 'sonner'

type Papel = 'ADMIN' | 'SUPERVISOR' | 'CONFERENTE'

type Usuario = {
  id: string
  nome: string
  email: string | null
  papel: Papel
  telefone: string | null
  ativo: boolean
  criado_em: string
}

const papelConfig: Record<Papel, { label: string; icon: React.ElementType; className: string }> = {
  ADMIN: { label: 'Admin', icon: Shield, className: 'bg-red-100 text-red-700 border-red-300' },
  SUPERVISOR: { label: 'Supervisor', icon: Eye, className: 'bg-blue-100 text-blue-700 border-blue-300' },
  CONFERENTE: { label: 'Conferente', icon: Wrench, className: 'bg-green-100 text-green-700 border-green-300' },
}

const createSchema = z.object({
  nome: z.string().min(2, 'Nome obrigatório'),
  email: z.string().email('Email inválido'),
  papel: z.enum(['ADMIN', 'SUPERVISOR', 'CONFERENTE'] as const),
  telefone: z.string().optional(),
  senha: z.string().min(6, 'Senha deve ter no mínimo 6 caracteres'),
})

type CreateForm = z.infer<typeof createSchema>

function PapelBadge({ papel }: { papel: Papel }) {
  const config = papelConfig[papel]
  const Icon = config.icon
  return (
    <Badge variant="outline" className={`text-xs font-medium ${config.className}`}>
      <Icon className="h-3 w-3 mr-1" />
      {config.label}
    </Badge>
  )
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('pt-BR')
}

export default function UsuariosPage() {
  const [modalAberto, setModalAberto] = useState(false)
  const [editandoUsuario, setEditandoUsuario] = useState<Usuario | null>(null)
  const [editPapel, setEditPapel] = useState<Papel>('CONFERENTE')
  const [editSenha, setEditSenha] = useState('')
  const [editAtivo, setEditAtivo] = useState(true)
  const [mostrarSenha, setMostrarSenha] = useState(false)
  const [papelLogado, setPapelLogado] = useState<Papel | null>(null)

  const queryClient = useQueryClient()
  const supabase = createClient()

  useEffect(() => {
    const fetchPapel = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data } = await supabase.from('users').select('papel').eq('id', user.id).single()
      if (data) setPapelLogado(data.papel as Papel)
    }
    fetchPapel()
  }, [])

  const { data: usuarios, isLoading, error } = useQuery<Usuario[]>({
    queryKey: ['usuarios'],
    queryFn: () => fetch('/api/usuarios').then((r) => {
      if (!r.ok) throw new Error('Acesso negado')
      return r.json()
    }),
  })

  const form = useForm<CreateForm>({
    resolver: zodResolver(createSchema),
    defaultValues: { nome: '', email: '', papel: 'CONFERENTE', telefone: '', senha: '' },
  })

  const criar = useMutation({
    mutationFn: (payload: CreateForm) =>
      fetch('/api/usuarios', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      }).then(async (r) => {
        if (!r.ok) {
          const err = await r.json()
          throw new Error(err.error ?? 'Erro ao criar usuário')
        }
        return r.json()
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['usuarios'] })
      toast.success('Usuário criado com sucesso')
      setModalAberto(false)
      form.reset()
    },
    onError: (err: Error) => toast.error(err.message),
  })

  const editar = useMutation({
    mutationFn: (payload: { id: string; papel: Papel; senha?: string; ativo: boolean }) => {
      const body: Record<string, unknown> = { papel: payload.papel, ativo: payload.ativo }
      if (payload.senha) body.senha = payload.senha
      return fetch(`/api/usuarios/${payload.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      }).then(async (r) => {
        if (!r.ok) {
          const err = await r.json()
          throw new Error(err.error ?? 'Erro ao editar usuário')
        }
        return r.json()
      })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['usuarios'] })
      toast.success('Usuário atualizado com sucesso')
      setEditandoUsuario(null)
      setEditSenha('')
      setMostrarSenha(false)
    },
    onError: (err: Error) => toast.error(err.message),
  })

  function abrirEdicao(usuario: Usuario) {
    setEditandoUsuario(usuario)
    setEditPapel(usuario.papel)
    setEditSenha('')
    setEditAtivo(usuario.ativo)
    setMostrarSenha(false)
  }

  function fecharEdicao() {
    setEditandoUsuario(null)
    setEditSenha('')
    setMostrarSenha(false)
  }

  function submeterEdicao() {
    if (!editandoUsuario) return
    editar.mutate({
      id: editandoUsuario.id,
      papel: editPapel,
      senha: editSenha || undefined,
      ativo: editAtivo,
    })
  }

  // SUPERVISOR não pode editar ADMINs — verificação de UI (backend também valida)
  function podeEditar(usuario: Usuario): boolean {
    if (papelLogado === 'ADMIN') return true
    if (papelLogado === 'SUPERVISOR') return usuario.papel !== 'ADMIN'
    return false
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3 text-muted-foreground">
        <Shield className="h-10 w-10" />
        <p className="text-sm">Você não tem permissão para acessar esta página.</p>
        <p className="text-xs">Apenas ADMINs e SUPERVISORs podem gerenciar usuários.</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Usuários</h1>
          <p className="text-sm text-muted-foreground">
            {usuarios ? `${usuarios.length} usuário${usuarios.length !== 1 ? 's' : ''} cadastrado${usuarios.length !== 1 ? 's' : ''}` : 'Carregando...'}
          </p>
        </div>
        <Button onClick={() => setModalAberto(true)}>
          <UserPlus className="h-4 w-4 mr-2" />
          Novo Usuário
        </Button>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Perfil</TableHead>
              <TableHead>Telefone</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Cadastrado em</TableHead>
              <TableHead className="w-16" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 3 }).map((_, i) => (
                <TableRow key={i}>
                  {Array.from({ length: 7 }).map((_, j) => (
                    <TableCell key={j}><Skeleton className="h-5 w-full" /></TableCell>
                  ))}
                </TableRow>
              ))
            ) : !usuarios || usuarios.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">
                  Nenhum usuário cadastrado.
                </TableCell>
              </TableRow>
            ) : (
              usuarios.map((usuario) => (
                <TableRow key={usuario.id}>
                  <TableCell className="font-medium">{usuario.nome}</TableCell>
                  <TableCell className="text-muted-foreground text-sm">{usuario.email ?? '—'}</TableCell>
                  <TableCell><PapelBadge papel={usuario.papel} /></TableCell>
                  <TableCell className="text-muted-foreground text-sm">{usuario.telefone ?? '—'}</TableCell>
                  <TableCell>
                    <Badge variant={usuario.ativo ? 'default' : 'secondary'} className="text-xs">
                      {usuario.ativo ? 'Ativo' : 'Inativo'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {formatDate(usuario.criado_em)}
                  </TableCell>
                  <TableCell>
                    {podeEditar(usuario) && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => abrirEdicao(usuario)}
                        title="Editar usuário"
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Modal: Novo Usuário */}
      <Dialog open={modalAberto} onOpenChange={setModalAberto}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Novo Usuário</DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit((d) => criar.mutate(d))} className="space-y-4">
              <FormField
                control={form.control}
                name="nome"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nome completo</FormLabel>
                    <FormControl><Input placeholder="João Silva" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl><Input type="email" placeholder="joao@empresa.com" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="papel"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Perfil</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {papelLogado === 'ADMIN' && (
                          <SelectItem value="ADMIN">Admin — acesso total</SelectItem>
                        )}
                        <SelectItem value="SUPERVISOR">Supervisor — gestão da operação</SelectItem>
                        <SelectItem value="CONFERENTE">Conferente — execução de conferências</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="telefone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Telefone (opcional)</FormLabel>
                    <FormControl><Input placeholder="(11) 99999-9999" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="senha"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Senha inicial</FormLabel>
                    <FormControl><Input type="password" placeholder="Mínimo 6 caracteres" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setModalAberto(false)}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={criar.isPending}>
                  {criar.isPending ? 'Criando...' : 'Criar usuário'}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Modal: Editar Usuário */}
      <Dialog open={!!editandoUsuario} onOpenChange={(open) => { if (!open) fecharEdicao() }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Editar Usuário — {editandoUsuario?.nome}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            {/* Papel */}
            <div className="space-y-1.5">
              <Label htmlFor="edit-papel">Perfil</Label>
              <Select value={editPapel} onValueChange={(v) => setEditPapel(v as Papel)}>
                <SelectTrigger id="edit-papel">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {papelLogado === 'ADMIN' && (
                    <SelectItem value="ADMIN">Admin — acesso total</SelectItem>
                  )}
                  <SelectItem value="SUPERVISOR">Supervisor — gestão da operação</SelectItem>
                  <SelectItem value="CONFERENTE">Conferente — execução de conferências</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Senha */}
            <div className="space-y-1.5">
              <Label htmlFor="edit-senha">Nova senha</Label>
              <div className="relative">
                <Input
                  id="edit-senha"
                  type={mostrarSenha ? 'text' : 'password'}
                  value={editSenha}
                  onChange={(e) => setEditSenha(e.target.value)}
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
              {editSenha && editSenha.length < 6 && (
                <p className="text-xs text-destructive">Mínimo 6 caracteres</p>
              )}
            </div>

            {/* Ativo */}
            <div className="flex items-center gap-2">
              <Checkbox
                id="edit-ativo"
                checked={editAtivo}
                onCheckedChange={(checked) => setEditAtivo(checked === true)}
              />
              <Label htmlFor="edit-ativo" className="cursor-pointer">
                Usuário ativo
              </Label>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={fecharEdicao}>
              Cancelar
            </Button>
            <Button
              onClick={submeterEdicao}
              disabled={editar.isPending || (editSenha.length > 0 && editSenha.length < 6)}
            >
              {editar.isPending ? 'Salvando...' : 'Salvar alterações'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

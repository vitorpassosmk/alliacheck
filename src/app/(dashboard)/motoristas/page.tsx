'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Plus, AlertTriangle } from 'lucide-react'
import { toast } from 'sonner'
import { cnhProximaVencimento, cnhVencida } from '@/lib/alertas'
import type { Tables } from '@/types/database.types'

const MotoristaSchema = z.object({
  nome: z.string().min(1, 'Obrigatório'),
  cpf: z.string().min(11, 'CPF inválido'),
  cnh: z.string().min(1, 'Obrigatório'),
  categoria_cnh: z.string().optional(),
  validade_cnh: z.string().min(1, 'Obrigatório'),
  rntrc: z.string().optional(),
  telefone: z.string().optional(),
})

type MotoristaForm = z.infer<typeof MotoristaSchema>

export default function MotoristasPage() {
  const queryClient = useQueryClient()
  const [modalOpen, setModalOpen] = useState(false)
  const [editando, setEditando] = useState<Tables<'motoristas'> | null>(null)

  const { data: motoristas = [], isLoading } = useQuery<Tables<'motoristas'>[]>({
    queryKey: ['motoristas'],
    queryFn: () => fetch('/api/motoristas').then(r => r.json()),
  })

  const form = useForm<MotoristaForm>({
    resolver: zodResolver(MotoristaSchema),
    defaultValues: { nome: '', cpf: '', cnh: '', categoria_cnh: '', validade_cnh: '', rntrc: '', telefone: '' },
  })

  const mutation = useMutation({
    mutationFn: async (data: MotoristaForm) => {
      const url = editando ? `/api/motoristas/${editando.id}` : '/api/motoristas'
      const method = editando ? 'PATCH' : 'POST'
      const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) })
      if (!res.ok) throw new Error((await res.json()).error ?? 'Erro ao salvar')
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['motoristas'] })
      toast.success(editando ? 'Motorista atualizado' : 'Motorista cadastrado')
      setModalOpen(false)
      setEditando(null)
      form.reset()
    },
    onError: (e: Error) => toast.error(e.message),
  })

  const abrirEdicao = (m: Tables<'motoristas'>) => {
    setEditando(m)
    form.reset({
      nome: m.nome,
      cpf: m.cpf,
      cnh: m.cnh,
      categoria_cnh: m.categoria_cnh ?? '',
      validade_cnh: m.validade_cnh,
      rntrc: m.rntrc ?? '',
      telefone: m.telefone ?? '',
    })
    setModalOpen(true)
  }

  const fecharModal = () => {
    setModalOpen(false)
    setEditando(null)
    form.reset()
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Motoristas</h1>
        <Button onClick={() => setModalOpen(true)}>
          <Plus className="h-4 w-4 mr-2" /> Novo Motorista
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-16 rounded-lg" />)}
        </div>
      ) : (
        <div className="bg-white rounded-lg border divide-y">
          {motoristas.map((m) => {
            const vencida = cnhVencida(m.validade_cnh)
            const proxima = !vencida && cnhProximaVencimento(m.validade_cnh)
            return (
              <div key={m.id} className="flex items-center justify-between p-4 hover:bg-gray-50">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{m.nome}</span>
                    {(vencida || proxima) && (
                      <AlertTriangle className="h-4 w-4 text-amber-500" />
                    )}
                  </div>
                  <div className="flex items-center gap-3 text-sm text-muted-foreground">
                    <span>CNH {m.cnh} ({m.categoria_cnh})</span>
                    <span>·</span>
                    <span className={vencida ? 'text-red-600 font-medium' : proxima ? 'text-amber-600 font-medium' : ''}>
                      Venc. {new Date(m.validade_cnh + 'T00:00:00').toLocaleDateString('pt-BR')}
                    </span>
                    {m.telefone && <><span>·</span><span>{m.telefone}</span></>}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Badge variant={m.status === 'ATIVO' ? 'default' : 'secondary'}>
                    {m.status}
                  </Badge>
                  <Button variant="outline" size="sm" onClick={() => abrirEdicao(m)}>
                    Editar
                  </Button>
                </div>
              </div>
            )
          })}
          {motoristas.length === 0 && (
            <div className="text-center py-12 text-muted-foreground">
              Nenhum motorista cadastrado
            </div>
          )}
        </div>
      )}

      <Dialog open={modalOpen} onOpenChange={(o) => !o && fecharModal()}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editando ? 'Editar Motorista' : 'Novo Motorista'}</DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit((d) => mutation.mutate(d))} className="space-y-4">
              <FormField control={form.control} name="nome" render={({ field }) => (
                <FormItem><FormLabel>Nome</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <div className="grid grid-cols-2 gap-4">
                <FormField control={form.control} name="cpf" render={({ field }) => (
                  <FormItem><FormLabel>CPF</FormLabel><FormControl><Input placeholder="000.000.000-00" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="telefone" render={({ field }) => (
                  <FormItem><FormLabel>Telefone</FormLabel><FormControl><Input placeholder="(11) 99999-0000" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="cnh" render={({ field }) => (
                  <FormItem><FormLabel>CNH</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="categoria_cnh" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Categoria</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl><SelectTrigger><SelectValue placeholder="Categoria" /></SelectTrigger></FormControl>
                      <SelectContent>
                        {['A','B','C','D','E','AB','AC','AD','AE'].map(c =>
                          <SelectItem key={c} value={c}>{c}</SelectItem>
                        )}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="validade_cnh" render={({ field }) => (
                  <FormItem><FormLabel>Validade CNH</FormLabel><FormControl><Input type="date" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="rntrc" render={({ field }) => (
                  <FormItem><FormLabel>RNTRC</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                )} />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <Button type="button" variant="outline" onClick={fecharModal}>Cancelar</Button>
                <Button type="submit" disabled={mutation.isPending}>
                  {editando ? 'Salvar' : 'Cadastrar'}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  )
}

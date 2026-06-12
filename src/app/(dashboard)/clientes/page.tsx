'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Plus } from 'lucide-react'
import { toast } from 'sonner'
import { validarCNPJ, formatarCNPJ } from '@/lib/validations/cnpj'
import type { Tables } from '@/types/database.types'

const UFs = ['AC','AL','AM','AP','BA','CE','DF','ES','GO','MA','MG','MS','MT','PA','PB','PE','PI','PR','RJ','RN','RO','RR','RS','SC','SE','SP','TO']

const ClienteSchema = z.object({
  razao_social: z.string().min(1, 'Obrigatório'),
  cnpj: z.string().optional().refine(
    (v) => !v || validarCNPJ(v),
    { message: 'CNPJ inválido' }
  ),
  cidade: z.string().optional(),
  uf: z.string().length(2).optional(),
  contato_nome: z.string().optional(),
  contato_telefone: z.string().optional(),
})

type ClienteForm = z.infer<typeof ClienteSchema>

export default function ClientesPage() {
  const queryClient = useQueryClient()
  const [modalOpen, setModalOpen] = useState(false)
  const [editando, setEditando] = useState<Tables<'clientes'> | null>(null)

  const { data: clientes = [], isLoading } = useQuery<Tables<'clientes'>[]>({
    queryKey: ['clientes'],
    queryFn: () => fetch('/api/clientes').then(r => r.json()),
  })

  const form = useForm<ClienteForm>({
    resolver: zodResolver(ClienteSchema),
    defaultValues: { razao_social: '', cnpj: '', cidade: '', uf: '', contato_nome: '', contato_telefone: '' },
  })

  const mutation = useMutation({
    mutationFn: async (data: ClienteForm) => {
      const url = editando ? `/api/clientes/${editando.id}` : '/api/clientes'
      const method = editando ? 'PATCH' : 'POST'
      const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) })
      if (!res.ok) throw new Error((await res.json()).error ?? 'Erro ao salvar')
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clientes'] })
      toast.success(editando ? 'Cliente atualizado' : 'Cliente cadastrado')
      setModalOpen(false)
      setEditando(null)
      form.reset()
    },
    onError: (e: Error) => toast.error(e.message),
  })

  const abrirEdicao = (c: Tables<'clientes'>) => {
    setEditando(c)
    form.reset({
      razao_social: c.razao_social,
      cnpj: c.cnpj ?? '',
      cidade: c.cidade ?? '',
      uf: c.uf ?? '',
      contato_nome: c.contato_nome ?? '',
      contato_telefone: c.contato_telefone ?? '',
    })
    setModalOpen(true)
  }

  const fecharModal = () => { setModalOpen(false); setEditando(null); form.reset() }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Clientes</h1>
        <Button onClick={() => setModalOpen(true)}>
          <Plus className="h-4 w-4 mr-2" /> Novo Cliente
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-2">{[1,2,3].map(i => <Skeleton key={i} className="h-16 rounded-lg" />)}</div>
      ) : (
        <div className="bg-white rounded-lg border divide-y">
          {clientes.map((c) => (
            <div key={c.id} className="flex items-center justify-between p-4 hover:bg-gray-50">
              <div className="space-y-1">
                <span className="font-medium">{c.razao_social}</span>
                <div className="flex items-center gap-3 text-sm text-muted-foreground">
                  {c.cnpj && <span>{formatarCNPJ(c.cnpj)}</span>}
                  {c.cidade && <><span>·</span><span>{c.cidade}/{c.uf}</span></>}
                  {c.contato_nome && <><span>·</span><span>{c.contato_nome}</span></>}
                </div>
              </div>
              <Button variant="outline" size="sm" onClick={() => abrirEdicao(c)}>Editar</Button>
            </div>
          ))}
          {clientes.length === 0 && (
            <div className="text-center py-12 text-muted-foreground">Nenhum cliente cadastrado</div>
          )}
        </div>
      )}

      <Dialog open={modalOpen} onOpenChange={(o) => !o && fecharModal()}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editando ? 'Editar Cliente' : 'Novo Cliente'}</DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit((d) => mutation.mutate(d))} className="space-y-4">
              <FormField control={form.control} name="razao_social" render={({ field }) => (
                <FormItem><FormLabel>Razão Social</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="cnpj" render={({ field }) => (
                <FormItem>
                  <FormLabel>CNPJ</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="00.000.000/0001-00"
                      {...field}
                      onChange={(e) => field.onChange(formatarCNPJ(e.target.value))}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <div className="grid grid-cols-2 gap-4">
                <FormField control={form.control} name="cidade" render={({ field }) => (
                  <FormItem><FormLabel>Cidade</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="uf" render={({ field }) => (
                  <FormItem>
                    <FormLabel>UF</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl><SelectTrigger><SelectValue placeholder="UF" /></SelectTrigger></FormControl>
                      <SelectContent>
                        {UFs.map(uf => <SelectItem key={uf} value={uf}>{uf}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="contato_nome" render={({ field }) => (
                  <FormItem><FormLabel>Contato</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="contato_telefone" render={({ field }) => (
                  <FormItem><FormLabel>Telefone Contato</FormLabel><FormControl><Input placeholder="(11) 99999-0000" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <Button type="button" variant="outline" onClick={fecharModal}>Cancelar</Button>
                <Button type="submit" disabled={mutation.isPending}>{editando ? 'Salvar' : 'Cadastrar'}</Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  )
}

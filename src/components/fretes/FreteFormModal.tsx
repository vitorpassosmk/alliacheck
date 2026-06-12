'use client'

import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import type { Tables } from '@/types/database.types'

const UFs = ['AC','AL','AM','AP','BA','CE','DF','ES','GO','MA','MG','MS','MT','PA','PB','PE','PI','PR','RJ','RN','RO','RR','RS','SC','SE','SP','TO']

const FreteSchema = z.object({
  origem_cidade: z.string().min(1, 'Obrigatório'),
  origem_uf: z.string().length(2, 'UF inválida'),
  destino_cidade: z.string().min(1, 'Obrigatório'),
  destino_uf: z.string().length(2, 'UF inválida'),
  cliente_id: z.string().uuid().nullable().optional(),
  motorista_id: z.string().uuid().nullable().optional(),
  veiculo_id: z.string().uuid().nullable().optional(),
  tipo_veiculo: z.string().nullable().optional(),
  valor_frete: z.string().optional(),
  data_carregamento: z.string().nullable().optional(),
  data_entrega_prevista: z.string().nullable().optional(),
  observacoes: z.string().nullable().optional(),
})

type FreteFormData = z.infer<typeof FreteSchema>

interface FreteFormModalProps {
  open: boolean
  onClose: () => void
  freteId?: string
}

export function FreteFormModal({ open, onClose, freteId }: FreteFormModalProps) {
  const queryClient = useQueryClient()
  const isEditing = !!freteId

  const { data: clientes = [] } = useQuery<Tables<'clientes'>[]>({
    queryKey: ['clientes'],
    queryFn: () => fetch('/api/clientes').then(r => r.json()),
    enabled: open,
  })

  const { data: motoristas = [] } = useQuery<Tables<'motoristas'>[]>({
    queryKey: ['motoristas'],
    queryFn: () => fetch('/api/motoristas').then(r => r.json()),
    enabled: open,
  })

  const { data: veiculos = [] } = useQuery<Tables<'veiculos'>[]>({
    queryKey: ['veiculos'],
    queryFn: () => fetch('/api/veiculos').then(r => r.json()),
    enabled: open,
  })

  const form = useForm<FreteFormData>({
    resolver: zodResolver(FreteSchema),
    defaultValues: {
      origem_cidade: '',
      origem_uf: '',
      destino_cidade: '',
      destino_uf: '',
      cliente_id: null,
      motorista_id: null,
      veiculo_id: null,
      tipo_veiculo: null,
      valor_frete: '',
      data_carregamento: null,
      data_entrega_prevista: null,
      observacoes: null,
    },
  })

  const mutation = useMutation({
    mutationFn: async (data: FreteFormData) => {
      const url = isEditing ? `/api/fretes/${freteId}` : '/api/fretes'
      const method = isEditing ? 'PATCH' : 'POST'
      const payload = {
        ...data,
        valor_frete: data.valor_frete ? parseFloat(data.valor_frete) : null,
      }
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error ?? 'Erro ao salvar frete')
      }
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fretes'] })
      toast.success(isEditing ? 'Frete atualizado' : 'Frete criado com sucesso')
      form.reset()
      onClose()
    },
    onError: (err: Error) => {
      toast.error(err.message)
    },
  })

  useEffect(() => {
    if (!open) form.reset()
  }, [open, form])

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Editar Frete' : 'Novo Frete'}</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit((d) => mutation.mutate(d))} className="space-y-4">
            {/* Origem / Destino */}
            <div className="grid grid-cols-2 gap-4">
              <FormField control={form.control} name="origem_cidade" render={({ field }) => (
                <FormItem>
                  <FormLabel>Cidade Origem</FormLabel>
                  <FormControl><Input placeholder="São Paulo" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="origem_uf" render={({ field }) => (
                <FormItem>
                  <FormLabel>UF Origem</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl><SelectTrigger><SelectValue placeholder="UF" /></SelectTrigger></FormControl>
                    <SelectContent>
                      {UFs.map(uf => <SelectItem key={uf} value={uf}>{uf}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="destino_cidade" render={({ field }) => (
                <FormItem>
                  <FormLabel>Cidade Destino</FormLabel>
                  <FormControl><Input placeholder="Rio de Janeiro" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="destino_uf" render={({ field }) => (
                <FormItem>
                  <FormLabel>UF Destino</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl><SelectTrigger><SelectValue placeholder="UF" /></SelectTrigger></FormControl>
                    <SelectContent>
                      {UFs.map(uf => <SelectItem key={uf} value={uf}>{uf}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />
            </div>

            {/* Cliente */}
            <FormField control={form.control} name="cliente_id" render={({ field }) => (
              <FormItem>
                <FormLabel>Cliente</FormLabel>
                <Select onValueChange={field.onChange} value={field.value ?? undefined}>
                  <FormControl><SelectTrigger><SelectValue placeholder="Selecione o cliente" /></SelectTrigger></FormControl>
                  <SelectContent>
                    {clientes.map(c => <SelectItem key={c.id} value={c.id}>{c.razao_social}</SelectItem>)}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )} />

            {/* Motorista / Veículo */}
            <div className="grid grid-cols-2 gap-4">
              <FormField control={form.control} name="motorista_id" render={({ field }) => (
                <FormItem>
                  <FormLabel>Motorista</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value ?? undefined}>
                    <FormControl><SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger></FormControl>
                    <SelectContent>
                      {motoristas.filter(m => m.status === 'ATIVO').map(m =>
                        <SelectItem key={m.id} value={m.id}>{m.nome}</SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="veiculo_id" render={({ field }) => (
                <FormItem>
                  <FormLabel>Veículo</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value ?? undefined}>
                    <FormControl><SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger></FormControl>
                    <SelectContent>
                      {veiculos.map(v =>
                        <SelectItem key={v.id} value={v.id}>{v.placa} — {v.tipo}</SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />
            </div>

            {/* Datas / Valor */}
            <div className="grid grid-cols-2 gap-4">
              <FormField control={form.control} name="data_carregamento" render={({ field }) => (
                <FormItem>
                  <FormLabel>Data Carregamento</FormLabel>
                  <FormControl><Input type="date" {...field} value={field.value ?? ''} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="data_entrega_prevista" render={({ field }) => (
                <FormItem>
                  <FormLabel>Entrega Prevista</FormLabel>
                  <FormControl><Input type="date" {...field} value={field.value ?? ''} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            </div>

            <FormField control={form.control} name="valor_frete" render={({ field }) => (
              <FormItem>
                <FormLabel>Valor do Frete (opcional)</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    step="0.01"
                    min="0.01"
                    placeholder="0,00"
                    {...field}
                    value={field.value ?? ''}
                    onChange={e => field.onChange(e.target.value)}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )} />

            <FormField control={form.control} name="observacoes" render={({ field }) => (
              <FormItem>
                <FormLabel>Observações</FormLabel>
                <FormControl>
                  <textarea
                    className="flex min-h-[60px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                    placeholder="Informações adicionais..."
                    {...field}
                    value={field.value ?? ''}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )} />

            <div className="flex justify-end gap-3 pt-2">
              <Button type="button" variant="outline" onClick={onClose}>
                Cancelar
              </Button>
              <Button type="submit" disabled={mutation.isPending}>
                {mutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isEditing ? 'Salvar' : 'Criar Frete'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}

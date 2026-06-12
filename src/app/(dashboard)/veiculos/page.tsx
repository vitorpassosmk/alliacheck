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
import { Plus } from 'lucide-react'
import { toast } from 'sonner'
import type { Tables } from '@/types/database.types'

const TIPOS_VEICULO = ['VAN', 'TOCO', 'TRUCK', 'BITRUCK', 'CARRETA', 'BITREM'] as const

const VeiculoSchema = z.object({
  placa: z.string().min(7, 'Placa inválida'),
  tipo: z.enum(TIPOS_VEICULO),
  modelo: z.string().optional(),
  ano: z.string().optional(),
  proprietario: z.string().optional(),
  rntrc: z.string().optional(),
})

type VeiculoForm = z.infer<typeof VeiculoSchema>

export default function VeiculosPage() {
  const queryClient = useQueryClient()
  const [modalOpen, setModalOpen] = useState(false)
  const [editando, setEditando] = useState<Tables<'veiculos'> | null>(null)

  const { data: veiculos = [], isLoading } = useQuery<Tables<'veiculos'>[]>({
    queryKey: ['veiculos'],
    queryFn: () => fetch('/api/veiculos').then(r => r.json()),
  })

  const form = useForm<VeiculoForm>({
    resolver: zodResolver(VeiculoSchema),
    defaultValues: { placa: '', tipo: 'CARRETA', modelo: '', ano: '', proprietario: '', rntrc: '' },
  })

  const mutation = useMutation({
    mutationFn: async (data: VeiculoForm) => {
      const url = editando ? `/api/veiculos/${editando.id}` : '/api/veiculos'
      const method = editando ? 'PATCH' : 'POST'
      const payload = { ...data, ano: data.ano ? parseInt(data.ano, 10) : null }
      const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
      if (!res.ok) throw new Error((await res.json()).error ?? 'Erro ao salvar')
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['veiculos'] })
      toast.success(editando ? 'Veículo atualizado' : 'Veículo cadastrado')
      setModalOpen(false)
      setEditando(null)
      form.reset()
    },
    onError: (e: Error) => toast.error(e.message),
  })

  const abrirEdicao = (v: Tables<'veiculos'>) => {
    setEditando(v)
    form.reset({
      placa: v.placa,
      tipo: v.tipo,
      modelo: v.modelo ?? '',
      ano: v.ano?.toString() ?? '',
      proprietario: v.proprietario ?? '',
      rntrc: v.rntrc ?? '',
    })
    setModalOpen(true)
  }

  const fecharModal = () => { setModalOpen(false); setEditando(null); form.reset() }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Veículos</h1>
        <Button onClick={() => setModalOpen(true)}>
          <Plus className="h-4 w-4 mr-2" /> Novo Veículo
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-2">{[1,2,3].map(i => <Skeleton key={i} className="h-16 rounded-lg" />)}</div>
      ) : (
        <div className="bg-white rounded-lg border divide-y">
          {veiculos.map((v) => (
            <div key={v.id} className="flex items-center justify-between p-4 hover:bg-gray-50">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="font-medium font-mono">{v.placa}</span>
                  <Badge variant="outline">{v.tipo}</Badge>
                </div>
                <div className="flex items-center gap-3 text-sm text-muted-foreground">
                  {v.modelo && <span>{v.modelo}</span>}
                  {v.ano && <><span>·</span><span>{v.ano}</span></>}
                  {v.proprietario && <><span>·</span><span>{v.proprietario}</span></>}
                </div>
              </div>
              <Button variant="outline" size="sm" onClick={() => abrirEdicao(v)}>Editar</Button>
            </div>
          ))}
          {veiculos.length === 0 && (
            <div className="text-center py-12 text-muted-foreground">Nenhum veículo cadastrado</div>
          )}
        </div>
      )}

      <Dialog open={modalOpen} onOpenChange={(o) => !o && fecharModal()}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editando ? 'Editar Veículo' : 'Novo Veículo'}</DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit((d) => mutation.mutate(d))} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <FormField control={form.control} name="placa" render={({ field }) => (
                  <FormItem><FormLabel>Placa</FormLabel><FormControl><Input placeholder="ABC-1234" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="tipo" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tipo</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                      <SelectContent>
                        {TIPOS_VEICULO.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="modelo" render={({ field }) => (
                  <FormItem><FormLabel>Modelo</FormLabel><FormControl><Input placeholder="Scania R450" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="ano" render={({ field }) => (
                  <FormItem><FormLabel>Ano</FormLabel><FormControl><Input type="number" placeholder="2021" {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="proprietario" render={({ field }) => (
                  <FormItem><FormLabel>Proprietário</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="rntrc" render={({ field }) => (
                  <FormItem><FormLabel>RNTRC</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
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

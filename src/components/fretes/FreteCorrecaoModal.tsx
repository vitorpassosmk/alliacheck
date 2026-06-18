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
import { Checkbox } from '@/components/ui/checkbox'
import { Separator } from '@/components/ui/separator'
import { Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import type { Tables } from '@/types/database.types'

const UFs = ['AC','AL','AM','AP','BA','CE','DF','ES','GO','MA','MG','MS','MT','PA','PB','PE','PI','PR','RJ','RN','RO','RR','RS','SC','SE','SP','TO']
const TIPOS_VEICULO = ['VAN', 'TOCO', 'TRUCK', 'BITRUCK', 'CARRETA', 'CARRETA_LS', 'BITREM'] as const

const STATUS_IDX: Record<string, number> = {
  ABERTO: 0, PROGRAMADO: 1, CARREGANDO: 2, CTE_EMITIDO: 3,
  AGUARDANDO_LIBERACAO: 4, EM_VIAGEM: 5, CONCLUIDA: 6, CANCELADO: 7,
}

const CorrecaoSchema = z.object({
  numero_frete: z.string().min(1, 'Obrigatório'),
  origem_cidade: z.string().min(1, 'Obrigatório'),
  origem_uf: z.string().length(2, 'UF inválida'),
  destino_cidade: z.string().min(1, 'Obrigatório'),
  destino_uf: z.string().length(2, 'UF inválida'),
  cliente_id: z.string().uuid().nullable().optional(),
  tipo_veiculo: z.string().nullable().optional(),
  tipo_produto: z.string().nullable().optional(),
  valor_mercadoria: z.string().optional(),
  valor_frete: z.string().optional(),
  data_carregamento: z.string().nullable().optional(),
  data_entrega_prevista: z.string().nullable().optional(),
  observacoes: z.string().nullable().optional(),
  motorista_id: z.string().uuid().nullable().optional(),
  veiculo_id: z.string().uuid().nullable().optional(),
  placa_cavalo: z.string().max(8).nullable().optional(),
  placa_carreta: z.string().max(8).nullable().optional(),
  motorista_e_funcionario_agregado: z.boolean().optional(),
  custo_agregado: z.string().optional(),
  valor_adiantamento: z.string().optional(),
  numero_gr: z.string().nullable().optional(),
  chave_cte: z.string().nullable().optional(),
  numero_contrato: z.string().nullable().optional(),
  numero_ciot: z.string().nullable().optional(),
})

type CorrecaoFormData = z.infer<typeof CorrecaoSchema>

interface FreteCorrecaoModalProps {
  open: boolean
  onClose: () => void
  freteId: string
  frete: Tables<'fretes'>
}

export function FreteCorrecaoModal({ open, onClose, freteId, frete }: FreteCorrecaoModalProps) {
  const queryClient = useQueryClient()
  const sidx = STATUS_IDX[frete.status] ?? 0
  const isProgamadoOuMais = sidx >= STATUS_IDX.PROGRAMADO
  const isCarregandoOuMais = sidx >= STATUS_IDX.CARREGANDO
  const isCteOuMais = sidx >= STATUS_IDX.CTE_EMITIDO
  const isAguardandoOuMais = sidx >= STATUS_IDX.AGUARDANDO_LIBERACAO

  const { data: clientes = [] } = useQuery<Tables<'clientes'>[]>({
    queryKey: ['clientes'],
    queryFn: () => fetch('/api/clientes').then(r => r.json()),
    enabled: open,
  })

  const { data: motoristas = [] } = useQuery<Tables<'motoristas'>[]>({
    queryKey: ['motoristas'],
    queryFn: () => fetch('/api/motoristas').then(r => r.json()),
    enabled: open && isProgamadoOuMais,
  })

  const { data: veiculos = [] } = useQuery<Tables<'veiculos'>[]>({
    queryKey: ['veiculos'],
    queryFn: () => fetch('/api/veiculos').then(r => r.json()),
    enabled: open && isProgamadoOuMais,
  })

  const form = useForm<CorrecaoFormData>({
    resolver: zodResolver(CorrecaoSchema),
    defaultValues: {
      numero_frete: '',
      origem_cidade: '',
      origem_uf: '',
      destino_cidade: '',
      destino_uf: '',
      cliente_id: undefined,
      tipo_veiculo: undefined,
      tipo_produto: '',
      valor_mercadoria: '',
      valor_frete: '',
      data_carregamento: '',
      data_entrega_prevista: '',
      observacoes: '',
      motorista_id: undefined,
      veiculo_id: undefined,
      placa_cavalo: '',
      placa_carreta: '',
      motorista_e_funcionario_agregado: false,
      custo_agregado: '',
      valor_adiantamento: '',
      numero_gr: '',
      chave_cte: '',
      numero_contrato: '',
      numero_ciot: '',
    },
  })

  useEffect(() => {
    if (!open) {
      form.reset()
      return
    }
    form.reset({
      numero_frete: frete.numero_frete ?? '',
      origem_cidade: frete.origem_cidade ?? '',
      origem_uf: frete.origem_uf ?? '',
      destino_cidade: frete.destino_cidade ?? '',
      destino_uf: frete.destino_uf ?? '',
      cliente_id: frete.cliente_id ?? undefined,
      tipo_veiculo: frete.tipo_veiculo ?? undefined,
      tipo_produto: frete.tipo_produto ?? '',
      valor_mercadoria: frete.valor_mercadoria?.toString() ?? '',
      valor_frete: frete.valor_frete?.toString() ?? '',
      data_carregamento: frete.data_carregamento ?? '',
      data_entrega_prevista: frete.data_entrega_prevista ?? '',
      observacoes: frete.observacoes ?? '',
      motorista_id: frete.motorista_id ?? undefined,
      veiculo_id: frete.veiculo_id ?? undefined,
      placa_cavalo: frete.placa_cavalo ?? '',
      placa_carreta: frete.placa_carreta ?? '',
      motorista_e_funcionario_agregado: frete.motorista_e_funcionario_agregado ?? false,
      custo_agregado: frete.custo_agregado?.toString() ?? '',
      valor_adiantamento: frete.valor_adiantamento?.toString() ?? '',
      numero_gr: frete.numero_gr ?? '',
      chave_cte: frete.chave_cte ?? '',
      numero_contrato: frete.numero_contrato ?? '',
      numero_ciot: frete.numero_ciot ?? '',
    })
  }, [open, freteId]) // eslint-disable-line react-hooks/exhaustive-deps

  const mutation = useMutation({
    mutationFn: async (data: CorrecaoFormData) => {
      const parsePositive = (v: string | undefined): number | null => {
        const n = parseFloat(v ?? '')
        return !isNaN(n) && n > 0 ? n : null
      }

      const cteDigits = data.chave_cte?.replace(/\D/g, '') ?? ''

      const payload: Record<string, unknown> = {
        numero_frete: data.numero_frete,
        origem_cidade: data.origem_cidade,
        origem_uf: data.origem_uf,
        destino_cidade: data.destino_cidade,
        destino_uf: data.destino_uf,
        cliente_id: data.cliente_id || null,
        tipo_veiculo: data.tipo_veiculo || null,
        tipo_produto: data.tipo_produto?.trim() || null,
        valor_mercadoria: parsePositive(data.valor_mercadoria),
        valor_frete: parsePositive(data.valor_frete),
        data_carregamento: data.data_carregamento || null,
        data_entrega_prevista: data.data_entrega_prevista || null,
        observacoes: data.observacoes?.trim() || null,
      }

      if (isProgamadoOuMais) {
        payload.motorista_id = data.motorista_id || null
        payload.veiculo_id = data.veiculo_id || null
        payload.placa_cavalo = data.placa_cavalo?.trim().toUpperCase() || null
        payload.placa_carreta = data.placa_carreta?.trim().toUpperCase() || null
        payload.motorista_e_funcionario_agregado = data.motorista_e_funcionario_agregado ?? false
        payload.custo_agregado = parsePositive(data.custo_agregado)
        payload.valor_adiantamento = parsePositive(data.valor_adiantamento)
      }

      if (isCarregandoOuMais) {
        payload.numero_gr = data.numero_gr?.trim() || null
      }

      if (isCteOuMais && cteDigits.length > 0) {
        payload.chave_cte = cteDigits
      }

      if (isAguardandoOuMais) {
        payload.numero_contrato = data.numero_contrato?.trim() || null
        payload.numero_ciot = data.numero_ciot?.trim() || null
      }

      const res = await fetch(`/api/fretes/${freteId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error ?? 'Erro ao salvar correção')
      }
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fretes'] })
      queryClient.invalidateQueries({ queryKey: ['frete', freteId] })
      toast.success('Correção salva com sucesso')
      onClose()
    },
    onError: (err: Error) => {
      toast.error(err.message)
    },
  })

  const chaveCteAtual = form.watch('chave_cte') ?? ''
  const cteLen = chaveCteAtual.replace(/\D/g, '').length

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Corrigir Dados — Frete {frete.numero_frete}</DialogTitle>
          <p className="text-sm text-muted-foreground">
            Apenas ADMIN e SUPERVISOR podem editar. Toda alteração é registrada na auditoria.
          </p>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit((d) => mutation.mutate(d))} className="space-y-6">

            {/* ── Seção 1: Dados do Frete ── */}
            <div className="space-y-4">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Dados do Frete</p>

              <FormField control={form.control} name="numero_frete" render={({ field }) => (
                <FormItem>
                  <FormLabel>Número do Frete *</FormLabel>
                  <FormControl>
                    <Input placeholder="F-0001" className="font-mono font-semibold" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              <div className="grid grid-cols-2 gap-4">
                <FormField control={form.control} name="origem_cidade" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Cidade Origem *</FormLabel>
                    <FormControl><Input placeholder="São Paulo" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="origem_uf" render={({ field }) => (
                  <FormItem>
                    <FormLabel>UF Origem *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value ?? ''}>
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
                    <FormLabel>Cidade Destino *</FormLabel>
                    <FormControl><Input placeholder="Rio de Janeiro" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="destino_uf" render={({ field }) => (
                  <FormItem>
                    <FormLabel>UF Destino *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value ?? ''}>
                      <FormControl><SelectTrigger><SelectValue placeholder="UF" /></SelectTrigger></FormControl>
                      <SelectContent>
                        {UFs.map(uf => <SelectItem key={uf} value={uf}>{uf}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>

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

              <div className="grid grid-cols-2 gap-4">
                <FormField control={form.control} name="tipo_veiculo" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tipo de Veículo</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value ?? undefined}>
                      <FormControl><SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger></FormControl>
                      <SelectContent>
                        {TIPOS_VEICULO.map(t => <SelectItem key={t} value={t}>{t.replace('_', ' ')}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="tipo_produto" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tipo de Produto</FormLabel>
                    <FormControl>
                      <Input placeholder="Ex: Grãos, Carga Seca..." {...field} value={field.value ?? ''} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <FormField control={form.control} name="valor_mercadoria" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Valor da Mercadoria (R$)</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.01" min="0.01" placeholder="0,00" {...field} value={field.value ?? ''} onChange={e => field.onChange(e.target.value)} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="valor_frete" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Valor do Frete (R$)</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.01" min="0.01" placeholder="0,00" {...field} value={field.value ?? ''} onChange={e => field.onChange(e.target.value)} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>

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
            </div>

            {/* ── Seção 2: Programação ── */}
            {isProgamadoOuMais && (
              <>
                <Separator />
                <div className="space-y-4">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Programação</p>

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

                  <div className="grid grid-cols-2 gap-4">
                    <FormField control={form.control} name="placa_cavalo" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Placa do Cavalo</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="Ex: ABC1D23"
                            className="uppercase"
                            maxLength={8}
                            {...field}
                            value={field.value ?? ''}
                            onChange={e => field.onChange(e.target.value.toUpperCase())}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="placa_carreta" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Placa da Carreta</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="Ex: ABC1D23"
                            className="uppercase"
                            maxLength={8}
                            {...field}
                            value={field.value ?? ''}
                            onChange={e => field.onChange(e.target.value.toUpperCase())}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                  </div>

                  <FormField control={form.control} name="motorista_e_funcionario_agregado" render={({ field }) => (
                    <FormItem className="flex items-center gap-2 space-y-0">
                      <FormControl>
                        <Checkbox
                          checked={field.value ?? false}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                      <FormLabel className="text-sm font-normal cursor-pointer">
                        Motorista é funcionário agregado ao proprietário do veículo
                      </FormLabel>
                    </FormItem>
                  )} />

                  <div className="grid grid-cols-2 gap-4">
                    <FormField control={form.control} name="custo_agregado" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Custo do Agregado (R$)</FormLabel>
                        <FormControl>
                          <Input type="number" step="0.01" min="0.01" placeholder="0,00" {...field} value={field.value ?? ''} onChange={e => field.onChange(e.target.value)} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="valor_adiantamento" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Valor de Adiantamento (R$)</FormLabel>
                        <FormControl>
                          <Input type="number" step="0.01" min="0.01" placeholder="0,00" {...field} value={field.value ?? ''} onChange={e => field.onChange(e.target.value)} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                  </div>
                </div>
              </>
            )}

            {/* ── Seção 3: Documentos Operacionais ── */}
            {isCarregandoOuMais && (
              <>
                <Separator />
                <div className="space-y-4">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Documentos Operacionais</p>

                  {isCarregandoOuMais && (
                    <FormField control={form.control} name="numero_gr" render={({ field }) => (
                      <FormItem>
                        <FormLabel>N° GR / Apólice de Seguro</FormLabel>
                        <FormControl>
                          <Input placeholder="N° GR" {...field} value={field.value ?? ''} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                  )}

                  {isCteOuMais && (
                    <FormField control={form.control} name="chave_cte" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Chave CT-e</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="44 dígitos numéricos"
                            className="font-mono text-xs"
                            maxLength={44}
                            {...field}
                            value={field.value ?? ''}
                            onChange={e => field.onChange(e.target.value.replace(/\D/g, '').slice(0, 44))}
                          />
                        </FormControl>
                        <p className="text-xs text-muted-foreground">{cteLen}/44 dígitos</p>
                        <FormMessage />
                      </FormItem>
                    )} />
                  )}

                  {isAguardandoOuMais && (
                    <div className="grid grid-cols-2 gap-4">
                      <FormField control={form.control} name="numero_contrato" render={({ field }) => (
                        <FormItem>
                          <FormLabel>N° Contrato</FormLabel>
                          <FormControl>
                            <Input placeholder="Ex: 2024-001" {...field} value={field.value ?? ''} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )} />
                      <FormField control={form.control} name="numero_ciot" render={({ field }) => (
                        <FormItem>
                          <FormLabel>N° CIOT</FormLabel>
                          <FormControl>
                            <Input placeholder="N° CIOT" {...field} value={field.value ?? ''} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )} />
                    </div>
                  )}
                </div>
              </>
            )}

            <div className="flex justify-end gap-3 pt-2 border-t">
              <Button type="button" variant="outline" onClick={onClose}>
                Cancelar
              </Button>
              <Button type="submit" disabled={mutation.isPending}>
                {mutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Salvar Correção
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}

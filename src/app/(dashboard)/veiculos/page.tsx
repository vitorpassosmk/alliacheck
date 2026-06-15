'use client'

import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Plus, CreditCard } from 'lucide-react'
import { toast } from 'sonner'
import { validarCNPJ, formatarCNPJ } from '@/lib/validations/cnpj'
import type { Tables } from '@/types/database.types'

const TIPOS_VEICULO = ['VAN', 'TOCO', 'TRUCK', 'BITRUCK', 'CARRETA', 'CARRETA_LS', 'BITREM'] as const
const TIPOS_ARTICULADOS = ['CARRETA', 'CARRETA_LS', 'BITREM'] as const
type TipoVeiculo = typeof TIPOS_VEICULO[number]

const TIPOS_LABEL: Record<TipoVeiculo, string> = {
  VAN: 'Van',
  TOCO: 'Toco',
  TRUCK: 'Truck',
  BITRUCK: 'Bitruck',
  CARRETA: 'Carreta',
  CARRETA_LS: 'Carreta LS',
  BITREM: 'Bitrem',
}

const VeiculoSchema = z.object({
  placa: z.string().min(7, 'Placa inválida'),
  tipo: z.enum(TIPOS_VEICULO),
  modelo: z.string().optional(),
  ano: z.string().optional(),
  proprietario: z.string().optional(),
  tipo_veiculo: z.enum(['FROTA', 'AGREGADO']).nullable().optional(),
  tem_placas_separadas: z.boolean().optional(),
  placa_carreta: z.string().optional(),
  cpf_proprietario: z.string().optional(),
  cnpj_proprietario: z.string().optional(),
  banco_proprietario: z.string().optional(),
  agencia_conta_proprietario: z.string().optional(),
  chave_pix_proprietario: z.string().optional(),
  rntrc: z.string().optional(),
  tag: z.string().optional(),
})

type VeiculoForm = z.infer<typeof VeiculoSchema>

export default function VeiculosPage() {
  const queryClient = useQueryClient()
  const [modalOpen, setModalOpen] = useState(false)
  const [editando, setEditando] = useState<Tables<'veiculos'> | null>(null)
  const [tipoDocProprietario, setTipoDocProprietario] = useState<'CPF' | 'CNPJ'>('CPF')
  const [podeGerenciar, setPodeGerenciar] = useState(false)

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) return
      const { data } = await supabase.from('users').select('papel').eq('id', user.id).single()
      setPodeGerenciar(data?.papel === 'ADMIN' || data?.papel === 'SUPERVISOR')
    })
  }, [])

  const { data: veiculos = [], isLoading } = useQuery<Tables<'veiculos'>[]>({
    queryKey: ['veiculos'],
    queryFn: () => fetch('/api/veiculos').then(r => r.json()),
  })

  const form = useForm<VeiculoForm>({
    resolver: zodResolver(VeiculoSchema),
    defaultValues: {
      placa: '', tipo: 'CARRETA', modelo: '', ano: '', proprietario: '',
      tipo_veiculo: null, tem_placas_separadas: false, placa_carreta: '',
      cpf_proprietario: '', cnpj_proprietario: '',
      banco_proprietario: '', agencia_conta_proprietario: '', chave_pix_proprietario: '',
      rntrc: '',
      tag: '',
    },
  })

  const tipoAtual = useWatch({ control: form.control, name: 'tipo' })
  const temPlacasSeparadas = useWatch({ control: form.control, name: 'tem_placas_separadas' })
  const ehArticulado = (TIPOS_ARTICULADOS as readonly string[]).includes(tipoAtual)

  const mutation = useMutation({
    mutationFn: async (data: VeiculoForm) => {
      const url = editando ? `/api/veiculos/${editando.id}` : '/api/veiculos'
      const method = editando ? 'PATCH' : 'POST'
      const payload = {
        ...data,
        ano: data.ano ? parseInt(data.ano, 10) : null,
        tem_placas_separadas: ehArticulado ? (data.tem_placas_separadas ?? false) : false,
        placa_carreta: ehArticulado && data.tem_placas_separadas ? data.placa_carreta || null : null,
      }
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
    const temCnpj = !!v.cnpj_proprietario
    setTipoDocProprietario(temCnpj ? 'CNPJ' : 'CPF')
    form.reset({
      placa: v.placa,
      tipo: v.tipo,
      modelo: v.modelo ?? '',
      ano: v.ano?.toString() ?? '',
      proprietario: v.proprietario ?? '',
      tipo_veiculo: v.tipo_veiculo ?? null,
      tem_placas_separadas: v.tem_placas_separadas ?? false,
      placa_carreta: v.placa_carreta ?? '',
      cpf_proprietario: v.cpf_proprietario ?? '',
      cnpj_proprietario: v.cnpj_proprietario ?? '',
      banco_proprietario: v.banco_proprietario ?? '',
      agencia_conta_proprietario: v.agencia_conta_proprietario ?? '',
      chave_pix_proprietario: v.chave_pix_proprietario ?? '',
      rntrc: v.rntrc ?? '',
      tag: (v as typeof v & { tag?: string | null }).tag ?? '',
    })
    setModalOpen(true)
  }

  const fecharModal = () => { setModalOpen(false); setEditando(null); form.reset(); setTipoDocProprietario('CPF') }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Veículos</h1>
        {podeGerenciar && (
          <Button onClick={() => setModalOpen(true)}>
            <Plus className="h-4 w-4 mr-2" /> Novo Veículo
          </Button>
        )}
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
                  {v.placa_carreta && v.tem_placas_separadas && (
                    <span className="text-muted-foreground text-sm font-mono">/ {v.placa_carreta}</span>
                  )}
                  <Badge variant="outline">{TIPOS_LABEL[v.tipo as TipoVeiculo] ?? v.tipo}</Badge>
                  {v.tipo_veiculo && (
                    <Badge variant="secondary" className="text-xs">{v.tipo_veiculo}</Badge>
                  )}
                </div>
                <div className="flex items-center gap-3 text-sm text-muted-foreground">
                  {v.modelo && <span>{v.modelo}</span>}
                  {v.ano && <><span>·</span><span>{v.ano}</span></>}
                  {v.proprietario && <><span>·</span><span>{v.proprietario}</span></>}
                  {v.rntrc && <><span>·</span><span>RNTRC: {v.rntrc}</span></>}
                  {(v as typeof v & { tag?: string | null }).tag && (
                    <><span>·</span><span>TAG: {(v as typeof v & { tag?: string | null }).tag}</span></>
                  )}
                </div>
              </div>
              {podeGerenciar && (
                <Button variant="outline" size="sm" onClick={() => abrirEdicao(v)}>Editar</Button>
              )}
            </div>
          ))}
          {veiculos.length === 0 && (
            <div className="text-center py-12 text-muted-foreground">Nenhum veículo cadastrado</div>
          )}
        </div>
      )}

      <Dialog open={modalOpen} onOpenChange={(o) => !o && fecharModal()}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editando ? 'Editar Veículo' : 'Novo Veículo'}</DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit((d) => mutation.mutate(d))} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <FormField control={form.control} name="tipo" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tipo de Veículo *</FormLabel>
                    <Select onValueChange={(v) => {
                      field.onChange(v)
                      if (!(TIPOS_ARTICULADOS as readonly string[]).includes(v)) {
                        form.setValue('tem_placas_separadas', false)
                        form.setValue('placa_carreta', '')
                      }
                    }} value={field.value}>
                      <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                      <SelectContent>
                        {TIPOS_VEICULO.map(t => <SelectItem key={t} value={t}>{TIPOS_LABEL[t]}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="tipo_veiculo" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Propriedade</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value ?? undefined}>
                      <FormControl><SelectTrigger><SelectValue placeholder="Frota / Agregado" /></SelectTrigger></FormControl>
                      <SelectContent>
                        <SelectItem value="FROTA">Frota</SelectItem>
                        <SelectItem value="AGREGADO">Agregado</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>

              {/* Placa(s) */}
              {ehArticulado ? (
                <div className="space-y-3">
                  <FormField control={form.control} name="tem_placas_separadas" render={({ field }) => (
                    <FormItem>
                      <div className="flex items-center gap-3">
                        <input
                          type="checkbox"
                          id="placas-sep"
                          checked={field.value ?? false}
                          onChange={e => field.onChange(e.target.checked)}
                          className="h-4 w-4 rounded border-gray-300"
                        />
                        <label htmlFor="placas-sep" className="text-sm cursor-pointer select-none">
                          Cavalo mecânico e carreta têm placas diferentes
                        </label>
                      </div>
                    </FormItem>
                  )} />

                  <div className={`grid gap-4 ${temPlacasSeparadas ? 'grid-cols-2' : 'grid-cols-1'}`}>
                    <FormField control={form.control} name="placa" render={({ field }) => (
                      <FormItem>
                        <FormLabel>{temPlacasSeparadas ? 'Placa do Cavalo *' : 'Placa *'}</FormLabel>
                        <FormControl><Input placeholder="ABC-1234" className="font-mono uppercase" {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    {temPlacasSeparadas && (
                      <FormField control={form.control} name="placa_carreta" render={({ field }) => (
                        <FormItem>
                          <FormLabel>Placa da Carreta</FormLabel>
                          <FormControl><Input placeholder="XYZ-5678" className="font-mono uppercase" {...field} value={field.value ?? ''} /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )} />
                    )}
                  </div>
                </div>
              ) : (
                <FormField control={form.control} name="placa" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Placa *</FormLabel>
                    <FormControl><Input placeholder="ABC-1234" className="font-mono uppercase" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              )}

              <div className="grid grid-cols-2 gap-4">
                <FormField control={form.control} name="modelo" render={({ field }) => (
                  <FormItem><FormLabel>Modelo</FormLabel><FormControl><Input placeholder="Scania R450" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="ano" render={({ field }) => (
                  <FormItem><FormLabel>Ano</FormLabel><FormControl><Input type="number" placeholder="2021" {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="proprietario" render={({ field }) => (
                  <FormItem><FormLabel>Nome do Proprietário</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                )} />

                {/* Item 7: toggle CPF / CNPJ do proprietário */}
                <FormItem>
                  <FormLabel>Documento do Proprietário</FormLabel>
                  <div className="flex rounded-md overflow-hidden border text-sm">
                    <button
                      type="button"
                      onClick={() => { setTipoDocProprietario('CPF'); form.setValue('cnpj_proprietario', '') }}
                      className={`flex-1 px-3 py-1.5 font-medium transition-colors ${tipoDocProprietario === 'CPF' ? 'bg-primary text-primary-foreground' : 'bg-transparent text-muted-foreground hover:bg-muted'}`}
                    >
                      CPF
                    </button>
                    <button
                      type="button"
                      onClick={() => { setTipoDocProprietario('CNPJ'); form.setValue('cpf_proprietario', '') }}
                      className={`flex-1 px-3 py-1.5 font-medium transition-colors ${tipoDocProprietario === 'CNPJ' ? 'bg-primary text-primary-foreground' : 'bg-transparent text-muted-foreground hover:bg-muted'}`}
                    >
                      CNPJ
                    </button>
                  </div>
                </FormItem>

                {tipoDocProprietario === 'CPF' ? (
                  <FormField control={form.control} name="cpf_proprietario" render={({ field }) => (
                    <FormItem className="col-span-1">
                      <FormLabel>CPF</FormLabel>
                      <FormControl><Input placeholder="000.000.000-00" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                ) : (
                  <FormField
                    control={form.control}
                    name="cnpj_proprietario"
                    rules={{
                      validate: (v) => !v || validarCNPJ(v) || 'CNPJ inválido',
                    }}
                    render={({ field }) => (
                      <FormItem className="col-span-1">
                        <FormLabel>CNPJ</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="00.000.000/0001-00"
                            value={field.value ?? ''}
                            onChange={(e) => field.onChange(formatarCNPJ(e.target.value))}
                            maxLength={18}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}
              </div>

              {/* Dados Bancários do Proprietário */}
              <div className="space-y-3 pt-2 border-t">
                <p className="text-sm font-medium flex items-center gap-2 text-muted-foreground">
                  <CreditCard className="h-4 w-4" /> Dados Bancários do Proprietário
                </p>
                <div className="grid grid-cols-2 gap-4">
                  <FormField control={form.control} name="banco_proprietario" render={({ field }) => (
                    <FormItem><FormLabel>Banco</FormLabel><FormControl><Input placeholder="Ex: Bradesco, BB..." {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                  <FormField control={form.control} name="agencia_conta_proprietario" render={({ field }) => (
                    <FormItem><FormLabel>Agência / Conta</FormLabel><FormControl><Input placeholder="0001 / 12345-6" {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                </div>
                <FormField control={form.control} name="chave_pix_proprietario" render={({ field }) => (
                  <FormItem><FormLabel>Chave PIX</FormLabel><FormControl><Input placeholder="CPF, e-mail, telefone ou chave aleatória" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
              </div>

              {/* RNTRC e TAG do veículo */}
              <div className="space-y-3 pt-2 border-t">
                <p className="text-sm font-medium text-muted-foreground">Identificadores do Veículo</p>
                <div className="grid grid-cols-2 gap-4">
                  <FormField control={form.control} name="rntrc" render={({ field }) => (
                    <FormItem>
                      <FormLabel>RNTRC</FormLabel>
                      <FormControl>
                        <Input placeholder="N° RNTRC" {...field} value={field.value ?? ''} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="tag" render={({ field }) => (
                    <FormItem>
                      <FormLabel>TAG</FormLabel>
                      <FormControl>
                        <Input placeholder="ID da TAG" {...field} value={field.value ?? ''} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                </div>
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

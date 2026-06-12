'use client'

import { useState, useEffect } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { CTEStatusBadge } from '@/components/kanban/StatusBadge'
import { toast } from 'sonner'
import { CheckCircle2, Loader2 } from 'lucide-react'
import type { StatusCTE } from '@/lib/state-machine'
import { CHECKLIST_ITEMS } from '@/lib/checklist-items'
import type { ChecklistItem } from '@/lib/checklist-items'

type ChecklistApiItem = { item: string; conferido: boolean }

interface ConferenceChecklistProps {
  freteId: string
  cteStatus: StatusCTE
}

export function ConferenceChecklist({ freteId, cteStatus }: ConferenceChecklistProps) {
  const queryClient = useQueryClient()
  const [marcados, setMarcados] = useState<Set<ChecklistItem>>(new Set())

  const { data: checklistData, isLoading: checklistLoading } = useQuery<ChecklistApiItem[]>({
    queryKey: ['checklist', freteId],
    queryFn: () => fetch(`/api/fretes/${freteId}/checklist`).then((r) => r.json()),
  })

  useEffect(() => {
    if (checklistData) {
      const conferidos = new Set(
        checklistData.filter((i) => i.conferido).map((i) => i.item as ChecklistItem)
      )
      setMarcados(conferidos)
    }
  }, [checklistData])

  const todosCompletos = marcados.size === CHECKLIST_ITEMS.length
  const cteEmitido = cteStatus === 'CT_E_EMITIDO'

  const salvarItem = useMutation({
    mutationFn: async (item: ChecklistItem) => {
      const res = await fetch(`/api/fretes/${freteId}/checklist`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ item }),
      })
      if (!res.ok) throw new Error((await res.json()).error ?? 'Erro ao salvar')
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['checklist', freteId] })
    },
    onError: (e: Error) => toast.error(e.message),
  })

  const emitirCTE = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/fretes/${freteId}/cte`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cte_status: 'CT_E_EMITIDO' }),
      })
      if (!res.ok) throw new Error((await res.json()).error ?? 'Erro ao emitir CT-e')
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['frete', freteId] })
      queryClient.invalidateQueries({ queryKey: ['fretes'] })
      toast.success('CT-e marcado como emitido')
    },
    onError: (e: Error) => toast.error(e.message),
  })

  const toggleItem = (item: ChecklistItem, checked: boolean) => {
    const novoSet = new Set(marcados)
    if (checked) {
      novoSet.add(item)
      salvarItem.mutate(item)
    } else {
      novoSet.delete(item)
    }
    setMarcados(novoSet)
  }

  if (checklistLoading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-6 w-full" />
        ))}
      </div>
    )
  }

  if (cteEmitido) {
    return (
      <div className="flex flex-col items-center gap-3 py-8 text-center">
        <CheckCircle2 className="h-12 w-12 text-green-600" />
        <p className="font-medium">CT-e emitido com sucesso</p>
        <CTEStatusBadge status={cteStatus} />
      </div>
    )
  }

  const podeEmitir = cteStatus === 'NF_RECEBIDA'

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-medium text-sm">Checklist de Conferência</h3>
        <CTEStatusBadge status={cteStatus} pulsante />
      </div>

      {!podeEmitir && (
        <p className="text-xs text-muted-foreground bg-amber-50 border border-amber-200 rounded-md p-2">
          A NF-e precisa estar recebida antes de conferir e emitir o CT-e.
          Status atual: {cteStatus}
        </p>
      )}

      <div className="space-y-3">
        {CHECKLIST_ITEMS.map((item) => {
          const marcado = marcados.has(item)
          return (
            <div key={item} className="flex items-start gap-3">
              <Checkbox
                id={item}
                checked={marcado}
                onCheckedChange={(checked) => toggleItem(item, !!checked)}
                className="mt-0.5"
              />
              <Label
                htmlFor={item}
                className={`text-sm cursor-pointer ${marcado ? 'line-through text-muted-foreground' : ''}`}
              >
                {item}
              </Label>
            </div>
          )
        })}
      </div>

      <div className="pt-2">
        <p className="text-xs text-muted-foreground mb-3">
          {marcados.size}/{CHECKLIST_ITEMS.length} itens conferidos
        </p>
        <Button
          className="w-full"
          disabled={!todosCompletos || !podeEmitir || emitirCTE.isPending}
          onClick={() => emitirCTE.mutate()}
        >
          {emitirCTE.isPending ? (
            <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Registrando...</>
          ) : (
            <>
              <CheckCircle2 className="h-4 w-4 mr-2" />
              Emitir CT-e
            </>
          )}
        </Button>
        {!todosCompletos && (
          <p className="text-xs text-muted-foreground text-center mt-2">
            Complete todos os itens para habilitar
          </p>
        )}
      </div>
    </div>
  )
}

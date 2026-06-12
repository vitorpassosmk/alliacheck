'use client'

import { useRef, useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import { Upload, Loader2, CheckCircle, AlertCircle } from 'lucide-react'
import { validarChaveNFe } from '@/lib/validations/chave-nfe'

const TIPOS_DOCUMENTO = ['NFE', 'CTE', 'CNH', 'CRLV', 'RNTRC', 'OUTROS'] as const
type TipoDocumento = typeof TIPOS_DOCUMENTO[number]

interface DocumentUploadProps {
  freteId: string
  onSuccess?: () => void
}

export function DocumentUpload({ freteId, onSuccess }: DocumentUploadProps) {
  const queryClient = useQueryClient()
  const fileRef = useRef<HTMLInputElement>(null)
  const [tipo, setTipo] = useState<TipoDocumento>('NFE')
  const [chaveAcesso, setChaveAcesso] = useState('')
  const [valor, setValor] = useState('')
  const [arquivoNome, setArquivoNome] = useState<string | null>(null)

  const chaveValida = chaveAcesso.length === 0 || validarChaveNFe(chaveAcesso)
  const chaveCompleta = chaveAcesso.replace(/\D/g, '').length === 44

  const mutation = useMutation({
    mutationFn: async () => {
      const file = fileRef.current?.files?.[0]
      if (!file) throw new Error('Selecione um arquivo')

      const formData = new FormData()
      formData.append('file', file)
      formData.append('frete_id', freteId)
      formData.append('tipo', tipo)
      if (chaveAcesso) formData.append('chave_acesso', chaveAcesso.replace(/\D/g, ''))
      if (valor) formData.append('valor', valor)

      const res = await fetch('/api/documentos', { method: 'POST', body: formData })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error ?? 'Erro ao enviar documento')
      }
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['frete', freteId] })
      queryClient.invalidateQueries({ queryKey: ['fretes'] })
      toast.success('Documento enviado com sucesso')
      setChaveAcesso('')
      setValor('')
      setArquivoNome(null)
      if (fileRef.current) fileRef.current.value = ''
      onSuccess?.()
    },
    onError: (e: Error) => toast.error(e.message),
  })

  return (
    <div className="space-y-4 border rounded-lg p-4">
      <h3 className="font-medium text-sm">Anexar Documento</h3>

      <div className="space-y-2">
        <Label>Tipo</Label>
        <Select value={tipo} onValueChange={(v) => setTipo(v as TipoDocumento)}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {TIPOS_DOCUMENTO.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {/* Arquivo com câmera no mobile */}
      <div className="space-y-2">
        <Label>Arquivo</Label>
        <div
          className="border-2 border-dashed rounded-lg p-4 text-center cursor-pointer hover:border-primary transition-colors"
          onClick={() => fileRef.current?.click()}
        >
          {arquivoNome ? (
            <div className="flex items-center justify-center gap-2 text-sm">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <span className="truncate max-w-[200px]">{arquivoNome}</span>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2 text-muted-foreground">
              <Upload className="h-6 w-6" />
              <span className="text-sm">Clique para selecionar ou fotografar</span>
            </div>
          )}
        </div>
        <input
          ref={fileRef}
          type="file"
          accept=".pdf,.xml,image/*"
          capture="environment"
          className="hidden"
          onChange={(e) => setArquivoNome(e.target.files?.[0]?.name ?? null)}
        />
      </div>

      {/* Chave NF-e — apenas para tipo NFE */}
      {tipo === 'NFE' && (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Label>Chave de Acesso NF-e</Label>
            {chaveAcesso.length > 0 && (
              chaveCompleta && chaveValida
                ? <Badge className="text-xs bg-green-100 text-green-700">Válida</Badge>
                : <Badge className="text-xs bg-red-100 text-red-700">
                    <AlertCircle className="h-3 w-3 mr-1" />
                    {!chaveCompleta ? '44 dígitos' : 'Inválida'}
                  </Badge>
            )}
          </div>
          <Input
            placeholder="00000000000000000000000000000000000000000000"
            value={chaveAcesso}
            onChange={(e) => setChaveAcesso(e.target.value)}
            maxLength={50}
            className="font-mono text-xs"
          />
        </div>
      )}

      <div className="space-y-2">
        <Label>Valor (opcional)</Label>
        <Input
          type="number"
          step="0.01"
          min="0.01"
          placeholder="0,00"
          value={valor}
          onChange={(e) => setValor(e.target.value)}
        />
      </div>

      <Button
        className="w-full"
        onClick={() => mutation.mutate()}
        disabled={mutation.isPending || !arquivoNome || (tipo === 'NFE' && !!chaveAcesso && !chaveValida)}
      >
        {mutation.isPending ? (
          <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Enviando...</>
        ) : (
          <><Upload className="h-4 w-4 mr-2" />Enviar Documento</>
        )}
      </Button>
    </div>
  )
}

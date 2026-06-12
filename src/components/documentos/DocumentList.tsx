import { Badge } from '@/components/ui/badge'
import { FileText, ExternalLink } from 'lucide-react'
import type { Tables } from '@/types/database.types'

interface DocumentListProps {
  documentos: Tables<'documentos'>[]
}

const tipoLabel: Record<string, string> = {
  NFE: 'NF-e',
  CTE: 'CT-e',
  CNH: 'CNH',
  CRLV: 'CRLV',
  RNTRC: 'RNTRC',
  OUTROS: 'Outros',
}

export function DocumentList({ documentos }: DocumentListProps) {
  if (documentos.length === 0) {
    return (
      <div className="text-center py-8 text-sm text-muted-foreground border-2 border-dashed rounded-lg">
        Nenhum documento anexado
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {documentos.map((doc) => (
        <div
          key={doc.id}
          className="flex items-center justify-between p-3 border rounded-lg bg-white"
        >
          <div className="flex items-center gap-3">
            <FileText className="h-5 w-5 text-muted-foreground shrink-0" />
            <div className="space-y-0.5">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium truncate max-w-[200px]">
                  {doc.nome_arquivo}
                </span>
                <Badge variant="outline" className="text-xs">
                  {tipoLabel[doc.tipo] ?? doc.tipo}
                </Badge>
              </div>
              {doc.chave_acesso && (
                <p className="text-xs text-muted-foreground font-mono">
                  Chave: {doc.chave_acesso}
                </p>
              )}
              {doc.valor && (
                <p className="text-xs text-muted-foreground">
                  R$ {doc.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </p>
              )}
            </div>
          </div>
          <a
            href={doc.url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex h-8 w-8 items-center justify-center rounded-md hover:bg-muted transition-colors"
          >
            <ExternalLink className="h-4 w-4 text-muted-foreground" />
          </a>
        </div>
      ))}
    </div>
  )
}

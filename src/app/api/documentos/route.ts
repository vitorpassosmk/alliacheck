import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { validarChaveNFe } from '@/lib/validations/chave-nfe'
import { invalidUUID } from '@/lib/api-helpers'

const TIPOS_VALIDOS = ['NFE', 'CTE', 'CNH', 'CRLV', 'RNTRC', 'OUTROS'] as const
type TipoDoc = typeof TIPOS_VALIDOS[number]

const EXT_PERMITIDAS = ['pdf', 'xml', 'jpg', 'jpeg', 'png'] as const
const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10 MB

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'Não autorizado' }, { status: 401 })

  const { data: perfil } = await supabase.from('users').select('papel').eq('id', user.id).single()
  if (!perfil || !['ADMIN', 'CONFERENTE'].includes(perfil.papel)) {
    return Response.json({ error: 'Permissão insuficiente' }, { status: 403 })
  }

  const formData = await request.formData()
  const file = formData.get('file') as File | null
  const frete_id = formData.get('frete_id') as string
  const tipo = formData.get('tipo') as string
  const chave_acesso = formData.get('chave_acesso') as string | null
  const valor = formData.get('valor') as string | null

  if (!file || !frete_id || !tipo) {
    return Response.json({ error: 'Arquivo, frete_id e tipo são obrigatórios' }, { status: 422 })
  }

  // Validar UUID antes de qualquer I/O
  const uuidErr = invalidUUID(frete_id)
  if (uuidErr) return uuidErr

  // Validar tipo antes de qualquer upload
  if (!TIPOS_VALIDOS.includes(tipo as TipoDoc)) {
    return Response.json({ error: 'Tipo de documento inválido' }, { status: 422 })
  }

  // Verificar tamanho do arquivo
  if (file.size > MAX_FILE_SIZE) {
    return Response.json({ error: 'Arquivo muito grande (máx. 10 MB)' }, { status: 413 })
  }

  // Verificar extensão (whitelist server-side — não confiar no file.type do cliente)
  const ext = file.name.split('.').pop()?.toLowerCase() ?? ''
  if (!EXT_PERMITIDAS.includes(ext as typeof EXT_PERMITIDAS[number])) {
    return Response.json(
      { error: `Extensão não permitida. Use: ${EXT_PERMITIDAS.join(', ')}` },
      { status: 422 }
    )
  }

  // Validar chave NF-e se informada
  if (tipo === 'NFE' && chave_acesso) {
    if (!validarChaveNFe(chave_acesso)) {
      return Response.json({ error: 'Chave NF-e inválida (deve ter 44 dígitos válidos)' }, { status: 422 })
    }
  }

  // Só agora fazer upload ao Storage
  const admin = createAdminClient()
  const path = `${frete_id}/${crypto.randomUUID()}.${ext}`

  const { error: uploadError } = await admin.storage
    .from('documentos')
    .upload(path, file, { contentType: file.type })

  if (uploadError) {
    console.error('[documentos] upload error', uploadError)
    return Response.json({ error: 'Erro ao salvar arquivo' }, { status: 500 })
  }

  const { data: urlData } = await admin.storage.from('documentos').createSignedUrl(path, 3600)

  const { data: doc, error: docError } = await supabase
    .from('documentos')
    .insert({
      frete_id,
      tipo: tipo as TipoDoc,
      nome_arquivo: file.name,
      url: urlData?.signedUrl ?? path,
      chave_acesso: chave_acesso ?? null,
      valor: valor ? parseFloat(valor) : null,
      enviado_por: user.id,
    })
    .select()
    .single()

  if (docError) {
    console.error('[documentos] insert error', docError)
    return Response.json({ error: 'Erro interno' }, { status: 500 })
  }

  await supabase.from('eventos').insert({
    frete_id,
    tipo: 'DOCUMENTO_ANEXADO',
    descricao: `${tipo} anexado: ${file.name}`,
    usuario_id: user.id,
    ip_address: request.headers.get('x-forwarded-for') ?? request.headers.get('x-real-ip'),
    user_agent: request.headers.get('user-agent'),
  })

  return Response.json(doc, { status: 201 })
}

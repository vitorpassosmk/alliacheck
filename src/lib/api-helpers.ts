import { createHmac } from 'crypto'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/** Returns an error Response if `id` is not a valid UUID, null otherwise. */
export function invalidUUID(id: string): Response | null {
  return UUID_RE.test(id)
    ? null
    : Response.json({ error: 'ID inválido' }, { status: 400 })
}

/**
 * Extracts the originating client IP from request headers.
 * Takes only the first entry of x-forwarded-for to avoid logging proxy chain IPs.
 * In production behind Vercel/Cloudflare the first entry is the real client IP.
 */
export function extractIp(request: Request): string | null {
  const forwarded = request.headers.get('x-forwarded-for')
  return forwarded?.split(',')[0]?.trim() ?? request.headers.get('x-real-ip')
}

/**
 * Hash do IP para gravar em `eventos` sem armazenar o IP em texto puro (LGPD).
 * Usa HMAC-SHA256: um SHA-256 simples seria reversível por força bruta (o espaço
 * de IPv4 é pequeno o suficiente para testar todos os valores em minutos), então
 * uma chave secreta é o que torna o hash inviável de reverter. Mesma entrada
 * sempre gera o mesmo hash, preservando a capacidade de correlacionar eventos
 * da mesma origem.
 *
 * Prioriza `IP_HASH_PEPPER` (secret dedicado, sem outro uso) e cai para a
 * service role key apenas enquanto o pepper dedicado não é configurado no
 * ambiente de produção — evita reuso de secret sem arriscar quebrar a gravação
 * de eventos num app já em produção caso a variável ainda não exista.
 */
export function hashIp(ip: string | null): string | null {
  if (!ip) return null
  const secret = process.env.IP_HASH_PEPPER || process.env.SUPABASE_SERVICE_ROLE_KEY || ''
  return createHmac('sha256', secret).update(ip).digest('hex')
}

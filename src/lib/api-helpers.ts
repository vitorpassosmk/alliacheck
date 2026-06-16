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

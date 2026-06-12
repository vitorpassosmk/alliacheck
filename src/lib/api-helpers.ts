const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/** Returns an error Response if `id` is not a valid UUID, null otherwise. */
export function invalidUUID(id: string): Response | null {
  return UUID_RE.test(id)
    ? null
    : Response.json({ error: 'ID inválido' }, { status: 400 })
}

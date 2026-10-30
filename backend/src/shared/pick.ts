/**
 * Copia só as chaves permitidas (e definidas) de um objeto.
 * Use em todo `update` que recebe dados do cliente: `data: { ...req.body }` deixa o cliente gravar
 * tenantId, clinicId, status, etc. (o Prisma aceita campos de FK num update).
 */
export function pick<K extends string>(
  obj: Record<string, any> | null | undefined,
  keys: readonly K[]
): Partial<Record<K, any>> {
  const out: Partial<Record<K, any>> = {}
  if (!obj) return out
  for (const k of keys) {
    if (Object.prototype.hasOwnProperty.call(obj, k) && obj[k] !== undefined) out[k] = obj[k]
  }
  return out
}

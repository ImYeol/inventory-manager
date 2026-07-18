/** The supplier contract deliberately preserves every character except edge Unicode whitespace. */
const EDGE_UNICODE_WHITESPACE = /^[\u0009-\u000d\u0020\u0085\u00a0\u1680\u2000-\u200a\u2028\u2029\u202f\u205f\u3000]+|[\u0009-\u000d\u0020\u0085\u00a0\u1680\u2000-\u200a\u2028\u2029\u202f\u205f\u3000]+$/g

export function normalizeSupplierExternalSku(value: string) {
  return value.replace(EDGE_UNICODE_WHITESPACE, '')
}

export function supplierSkuKey(supplierId: number, externalSku: string) {
  return `${supplierId}:${normalizeSupplierExternalSku(externalSku)}`
}

export function suggestExactSupplierSkuLinks<T extends { externalSku: string; productVariantId: number | null }>(rows: T[], links: Map<string, number>, supplierId: number) {
  return rows.map((row) => ({ ...row, productVariantId: links.get(supplierSkuKey(supplierId, row.externalSku)) ?? null }))
}

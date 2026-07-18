import { createHash } from 'node:crypto'

const EDGE_UNICODE_WHITESPACE = /^[\u0009-\u000d\u0020\u0085\u00a0\u1680\u2000-\u200a\u2028\u2029\u202f\u205f\u3000]+|[\u0009-\u000d\u0020\u0085\u00a0\u1680\u2000-\u200a\u2028\u2029\u202f\u205f\u3000]+$/g

export function normalizeExternalShipmentNumber(value: string) {
  return value.replace(EDGE_UNICODE_WHITESPACE, '')
}

export async function sha256OriginalBytes(bytes: Uint8Array) {
  return createHash('sha256').update(bytes).digest('hex')
}

export function classifyInboundReviewRows(rows: Array<{ sourceRowNumber: number; quantity: number | null; validationError: string | null; productVariantId: number | null }>) {
  const blockers = rows.filter((row) => row.validationError || !Number.isInteger(row.quantity) || (row.quantity ?? 0) <= 0 || !row.productVariantId).map((row) => row.sourceRowNumber)
  return { valid: blockers.length === 0, blockers, rows: rows.map((row) => row.sourceRowNumber) }
}

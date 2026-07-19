export const FACTORY_ARRIVAL_LIFECYCLE_VALUES = [
  'DRAFT', 'READY', 'PARTIAL', 'RECEIVED', 'VARIANCE_CLOSED', 'CANCELLED',
] as const

export type FactoryArrivalLifecycle = (typeof FACTORY_ARRIVAL_LIFECYCLE_VALUES)[number]

export function allocationRemainder(input: { allocatedQuantity: number; normallyReceivedQuantity: number; shortageClosedQuantity: number }) {
  return Math.max(input.allocatedQuantity - input.normallyReceivedQuantity - input.shortageClosedQuantity, 0)
}

export function deriveFactoryArrivalReadiness(rows: Array<{ productVariantId: number | null; hasWarehouseAllocation: boolean; isValid: boolean }>) {
  const blockers = new Set<string>()
  for (const row of rows) {
    if (row.productVariantId === null) blockers.add('UNMAPPED_PRODUCT_VARIANT')
    if (!row.hasWarehouseAllocation) blockers.add('UNALLOCATED_WAREHOUSE')
    if (!row.isValid) blockers.add('INVALID_SOURCE_ROW')
  }
  return { ready: blockers.size === 0 && rows.length > 0, blockers: [...blockers] }
}

export function isCanonicalIncomingArrival(status: FactoryArrivalLifecycle | string) {
  return status === 'READY' || status === 'PARTIAL'
}

export type AllocationSplit = { warehouseId: number; quantity: number }

/** Client/server preflight only; the RPC repeats this under row locks. */
export function assertAllocationSplit(requiredQuantity: number, splits: AllocationSplit[]) {
  if (!Number.isInteger(requiredQuantity) || requiredQuantity <= 0 || splits.length === 0) throw new Error('배정 수량을 입력해주세요.')
  const warehouses = new Set<number>()
  let total = 0
  for (const split of splits) {
    if (!Number.isInteger(split.warehouseId) || !Number.isInteger(split.quantity) || split.quantity <= 0) throw new Error('배정 수량은 양수여야 합니다.')
    if (warehouses.has(split.warehouseId)) throw new Error('같은 창고를 중복 배정할 수 없습니다.')
    warehouses.add(split.warehouseId)
    total += split.quantity
  }
  if (total !== requiredQuantity) throw new Error('배정 합계가 필요한 수량과 일치해야 합니다.')
}

export async function receiptPayloadHash(payload: unknown) {
  const bytes = new TextEncoder().encode(JSON.stringify(payload))
  const digest = await crypto.subtle.digest('SHA-256', bytes)
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('')
}

/** Business dates are Korean local calendar dates, never a UTC date slice. */
export function koreaLocalDate(now = new Date()) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Seoul', year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(now)
  const part = (type: string) => parts.find((entry) => entry.type === type)?.value
  return `${part('year')}-${part('month')}-${part('day')}`
}

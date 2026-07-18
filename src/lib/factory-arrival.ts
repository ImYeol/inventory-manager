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

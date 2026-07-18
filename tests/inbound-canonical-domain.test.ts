import { describe, expect, it } from 'vitest'
import {
  FACTORY_ARRIVAL_LIFECYCLE_VALUES,
  allocationRemainder,
  deriveFactoryArrivalReadiness,
  isCanonicalIncomingArrival,
} from '@/lib/factory-arrival'

describe('canonical factory arrival domain', () => {
  it('keeps lifecycle values limited to receipt lifecycle, not mapping blockers', () => {
    expect(FACTORY_ARRIVAL_LIFECYCLE_VALUES).toEqual([
      'DRAFT', 'READY', 'PARTIAL', 'RECEIVED', 'VARIANCE_CLOSED', 'CANCELLED',
    ])
  })

  it('derives readiness from row mapping, allocation and validation rather than persisting it', () => {
    expect(deriveFactoryArrivalReadiness([
      { productVariantId: 9, hasWarehouseAllocation: true, isValid: true },
    ])).toEqual({ ready: true, blockers: [] })
    expect(deriveFactoryArrivalReadiness([
      { productVariantId: null, hasWarehouseAllocation: false, isValid: false },
    ])).toEqual({ ready: false, blockers: ['UNMAPPED_PRODUCT_VARIANT', 'UNALLOCATED_WAREHOUSE', 'INVALID_SOURCE_ROW'] })
  })

  it('uses allocation remainder as the sole expected incoming quantity', () => {
    expect(allocationRemainder({ allocatedQuantity: 12, normallyReceivedQuantity: 5, shortageClosedQuantity: 2 })).toBe(5)
    expect(allocationRemainder({ allocatedQuantity: 2, normallyReceivedQuantity: 4, shortageClosedQuantity: 0 })).toBe(0)
    expect(isCanonicalIncomingArrival('READY')).toBe(true)
    expect(isCanonicalIncomingArrival('PARTIAL')).toBe(true)
    expect(isCanonicalIncomingArrival('DRAFT')).toBe(false)
    expect(isCanonicalIncomingArrival('RECEIVED')).toBe(false)
  })
})

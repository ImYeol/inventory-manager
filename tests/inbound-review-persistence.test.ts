import { describe, expect, it } from 'vitest'
import { classifyInboundReviewRows } from '@/lib/inbound-import-review'

describe('incomplete inbound review', () => {
  it('reports blockers without preventing evidence persistence', () => {
    const state = classifyInboundReviewRows([{ sourceRowNumber: 2, externalSku: 'UNKNOWN', rawQuantity: '3', quantity: 3, validationError: null, productVariantId: null, sourceValues: {} }])
    expect(state.valid).toBe(false)
    expect(state.blockers).toContain(2)
  })
})

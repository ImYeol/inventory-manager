import { describe, expect, it } from 'vitest'
import { classifyInboundReviewRows, normalizeExternalShipmentNumber, sha256OriginalBytes } from '@/lib/inbound-import-review'

describe('inbound import review contract', () => {
  it('hashes the original bytes and preserves shipment identifiers except edge unicode whitespace', async () => {
    expect(await sha256OriginalBytes(new Uint8Array([0, 1, 2, 255]))).toBe('3d1f57c984978ef98a18378c8166c1cb8ede02c03eeb6aee7e2f121dfeee3e56')
    expect(normalizeExternalShipmentNumber('\u00a0 REF  01\u3000')).toBe('REF  01')
  })

  it('keeps repeated source rows ordered and blocks invalid or unmapped exact identifiers', () => {
    expect(classifyInboundReviewRows([
      { sourceRowNumber: 4, externalSku: 'SKU-1', quantity: 2, validationError: null, productVariantId: 8 },
      { sourceRowNumber: 5, externalSku: 'SKU-1', quantity: 3, validationError: null, productVariantId: 8 },
      { sourceRowNumber: 6, externalSku: 'sku-1', quantity: 1, validationError: null, productVariantId: null },
      { sourceRowNumber: 7, externalSku: 'SKU-2', quantity: 0, validationError: null, productVariantId: 9 },
    ])).toEqual({ valid: false, blockers: [6, 7], rows: [4, 5, 6, 7] })
  })
})

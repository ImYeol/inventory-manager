import { describe, expect, it } from 'vitest'
import { assertAllocationSplit, receiptPayloadHash } from '@/lib/factory-arrival'

describe('factory arrival operation contracts', () => {
  it('requires a complete, positive, duplicate-free allocation split', async () => {
    expect(() => assertAllocationSplit(30, [{ warehouseId: 1, quantity: 20 }, { warehouseId: 2, quantity: 10 }])).not.toThrow()
    expect(() => assertAllocationSplit(30, [{ warehouseId: 1, quantity: 20 }, { warehouseId: 1, quantity: 10 }])).toThrow('중복')
    expect(() => assertAllocationSplit(30, [{ warehouseId: 1, quantity: 20 }, { warehouseId: 2, quantity: 9 }])).toThrow('일치')
    expect(() => assertAllocationSplit(30, [{ warehouseId: 1, quantity: 0 }, { warehouseId: 2, quantity: 30 }])).toThrow('양수')
  })

  it('hashes an immutable receipt request payload deterministically', async () => {
    const payload = { arrivalId: 9, receiptRequestId: 'r-1', lines: [{ allocationId: 2, quantity: 3, overageQuantity: 0 }] }
    await expect(receiptPayloadHash(payload)).resolves.toBe(await receiptPayloadHash(payload))
    await expect(receiptPayloadHash({ ...payload, lines: [{ allocationId: 2, quantity: 4, overageQuantity: 0 }] })).resolves.not.toBe(await receiptPayloadHash(payload))
  })
})

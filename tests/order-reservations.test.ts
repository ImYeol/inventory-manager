import { describe, expect, it } from 'vitest'
import { inventorySyncEntries, reservationDisposition } from '@/lib/orders'

describe('order reservations', () => {
  it('reserves only one warehouse with enough available stock and never decrements on-hand inventory', () => {
    expect(reservationDisposition(3, [{ warehouseId: 1, quantity: 5, committed: 1 }])).toEqual({ status: 'ACTIVE', warehouseId: 1 })
    expect(reservationDisposition(3, [{ warehouseId: 1, quantity: 3, committed: 1 }])).toEqual({ status: 'EXCEPTION' })
  })

  it('requires a mapping when the line has no unique variant', () => {
    expect(reservationDisposition(1, [], false)).toEqual({ status: 'MAPPING_REQUIRED' })
  })

  it('queues the latest absolute available quantity for every explicit mapping only', () => {
    expect(inventorySyncEntries({
      onHand: 12,
      committed: 4,
      refs: [
        { id: 11, channel: 'naver', externalVariantId: 'NV-1' },
        { id: 12, channel: 'naver', externalVariantId: 'NV-2' },
      ],
    })).toEqual([
      { channelProductRefId: 11, channel: 'naver', externalVariantId: 'NV-1', targetQuantity: 8 },
      { channelProductRefId: 12, channel: 'naver', externalVariantId: 'NV-2', targetQuantity: 8 },
    ])
  })

  it('does not create a channel inventory target without an explicit mapping', () => {
    expect(inventorySyncEntries({ onHand: 12, committed: 4, refs: [] })).toEqual([])
  })
})

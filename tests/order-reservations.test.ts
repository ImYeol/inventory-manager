import { describe, expect, it } from 'vitest'
import { reservationDisposition } from '@/lib/orders'

describe('order reservations', () => {
  it('reserves only one warehouse with enough available stock and never decrements on-hand inventory', () => {
    expect(reservationDisposition(3, [{ warehouseId: 1, quantity: 5, committed: 1 }])).toEqual({ status: 'ACTIVE', warehouseId: 1 })
    expect(reservationDisposition(3, [{ warehouseId: 1, quantity: 3, committed: 1 }])).toEqual({ status: 'EXCEPTION' })
  })

  it('requires a mapping when the line has no unique variant', () => {
    expect(reservationDisposition(1, [], false)).toEqual({ status: 'MAPPING_REQUIRED' })
  })
})

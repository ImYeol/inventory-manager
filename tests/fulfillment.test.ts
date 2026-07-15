import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({ getSupabaseWithUser: vi.fn(), sendNaverTrackingNumbers: vi.fn(), sendCoupangTrackingNumbers: vi.fn() }))
vi.mock('@/lib/db', () => ({ getSupabaseWithUser: mocks.getSupabaseWithUser }))
vi.mock('@/lib/actions/shipping', () => ({ sendNaverTrackingNumbers: mocks.sendNaverTrackingNumbers, sendCoupangTrackingNumbers: mocks.sendCoupangTrackingNumbers }))
import { finalizeTrackingImport } from '@/lib/actions/tracking-import'

beforeEach(() => Object.values(mocks).forEach((mock) => mock.mockReset()))

describe('fulfillment finalization', () => {
  it('records only external successes, finalizes once, and reports reconcile when local finalization fails', async () => {
    const insertedSelect = vi.fn().mockResolvedValue({ data: [{ id: 9 }], error: null })
    const insert = vi.fn(() => ({ select: insertedSelect }))
    const inExisting = vi.fn().mockResolvedValue({ data: [], error: null })
    const select = vi.fn(() => ({ in: inExisting }))
    const rpc = vi.fn().mockResolvedValue({ data: false, error: { message: 'inventory lock' } })
    const update = vi.fn(() => ({ eq: vi.fn(() => Promise.resolve({ error: null })) }))
    mocks.getSupabaseWithUser.mockResolvedValue({ user: { id: 'u1' }, supabase: { from: vi.fn(() => ({ select, insert, update })), rpc } })
    mocks.sendNaverTrackingNumbers.mockResolvedValue({ success: true, failedOrders: [] })
    mocks.sendCoupangTrackingNumbers.mockResolvedValue({ success: true, failedBoxes: [] })
    const result = await finalizeTrackingImport([{ lineId: 3, reservationId: 4, channel: 'naver', externalLineId: 'PO-1', trackingNumber: 'T-1', carrier: 'CJGLS' }])
    expect(result).toEqual({ externalSucceeded: 1, finalized: 0, reconcileRequired: 1, failed: 0 })
    expect(insert).toHaveBeenCalledWith(expect.objectContaining({ external_status: 'success', idempotency_key: expect.any(String) }))
    expect(rpc).toHaveBeenCalledWith('finalize_order_fulfillment', { p_fulfillment_id: 9 })
  })

  it('does not call the external API again for an existing idempotency key', async () => {
    const inExisting = vi.fn().mockResolvedValue({ data: [{ id: 12, idempotency_key: 'naver:PO-1:T-1', local_status: 'fulfilled' }], error: null })
    const select = vi.fn(() => ({ in: inExisting }))
    const insert = vi.fn()
    const rpc = vi.fn()
    mocks.getSupabaseWithUser.mockResolvedValue({ user: { id: 'u1' }, supabase: { from: vi.fn(() => ({ select, insert })), rpc } })

    const result = await finalizeTrackingImport([{ lineId: 3, reservationId: 4, channel: 'naver', externalLineId: 'PO-1', trackingNumber: 'T-1', carrier: 'CJGLS' }])

    expect(result).toMatchObject({ externalSucceeded: 1, finalized: 1, failed: 0 })
    expect(mocks.sendNaverTrackingNumbers).not.toHaveBeenCalled()
    expect(insert).not.toHaveBeenCalled()
  })

  it('does not record or finalize a Coupang fulfillment when the overall provider result fails', async () => {
    const inExisting = vi.fn().mockResolvedValue({ data: [], error: null })
    const select = vi.fn(() => ({ in: inExisting }))
    const insert = vi.fn(() => ({ select: vi.fn().mockResolvedValue({ data: [{ id: 9 }], error: null }) }))
    const rpc = vi.fn()
    mocks.getSupabaseWithUser.mockResolvedValue({ user: { id: 'u1' }, supabase: { from: vi.fn(() => ({ select, insert })), rpc } })
    mocks.sendCoupangTrackingNumbers.mockResolvedValue({ success: false, failedBoxes: [] })

    const result = await finalizeTrackingImport([{ lineId: 3, reservationId: 4, channel: 'coupang', externalLineId: '11:301', shipmentBoxId: 11, orderId: 22, vendorItemId: 301, trackingNumber: 'T-1', carrier: 'CJGLS' }])

    expect(result).toEqual({ externalSucceeded: 0, finalized: 0, reconcileRequired: 0, failed: 1 })
    expect(insert).not.toHaveBeenCalled()
    expect(rpc).not.toHaveBeenCalled()
  })
})

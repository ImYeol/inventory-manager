import { describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({ getSupabaseWithUser: vi.fn(), sendNaverTrackingNumbers: vi.fn(), sendCoupangTrackingNumbers: vi.fn() }))
vi.mock('@/lib/db', () => ({ getSupabaseWithUser: mocks.getSupabaseWithUser }))
vi.mock('@/lib/actions/shipping', () => ({ sendNaverTrackingNumbers: mocks.sendNaverTrackingNumbers, sendCoupangTrackingNumbers: mocks.sendCoupangTrackingNumbers }))
import { finalizeTrackingImport } from '@/lib/actions/tracking-import'

describe('fulfillment finalization', () => {
  it('records only external successes, finalizes once, and reports reconcile when local finalization fails', async () => {
    const select = vi.fn().mockResolvedValue({ data: [{ id: 9 }], error: null })
    const insert = vi.fn(() => ({ select }))
    const rpc = vi.fn().mockResolvedValue({ data: false, error: { message: 'inventory lock' } })
    const update = vi.fn(() => ({ eq: vi.fn(() => Promise.resolve({ error: null })) }))
    mocks.getSupabaseWithUser.mockResolvedValue({ user: { id: 'u1' }, supabase: { from: vi.fn(() => ({ insert, update })), rpc } })
    mocks.sendNaverTrackingNumbers.mockResolvedValue({ success: true, failedOrders: [] })
    mocks.sendCoupangTrackingNumbers.mockResolvedValue({ success: true, failedBoxes: [] })
    const result = await finalizeTrackingImport([{ lineId: 3, reservationId: 4, channel: 'naver', externalLineId: 'PO-1', trackingNumber: 'T-1', carrier: 'CJGLS' }])
    expect(result).toEqual({ externalSucceeded: 1, finalized: 0, reconcileRequired: 1, failed: 0 })
    expect(insert).toHaveBeenCalledWith(expect.objectContaining({ external_status: 'success', idempotency_key: expect.any(String) }))
    expect(rpc).toHaveBeenCalledWith('finalize_order_fulfillment', { p_fulfillment_id: 9 })
  })
})

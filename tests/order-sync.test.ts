import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  getSupabaseWithUser: vi.fn(),
  getRequiredShippingCredentials: vi.fn(),
  fetchNaverPendingOrders: vi.fn(),
  fetchCoupangPendingOrders: vi.fn(),
}))

vi.mock('@/lib/db', () => ({ getSupabaseWithUser: mocks.getSupabaseWithUser }))
vi.mock('@/lib/shipping-credentials', () => ({ getRequiredShippingCredentials: mocks.getRequiredShippingCredentials }))
vi.mock('@/lib/api/naver', () => ({ fetchNaverPendingOrders: mocks.fetchNaverPendingOrders }))
vi.mock('@/lib/api/coupang', () => ({ fetchCoupangPendingOrders: mocks.fetchCoupangPendingOrders }))

import { syncOrders } from '@/lib/actions/order-sync'

beforeEach(() => Object.values(mocks).forEach((mock) => mock.mockReset()))

describe('order sync', () => {
  it('idempotently upserts normalized Naver orders with SKU and external product reference', async () => {
    const upsert = vi.fn(() => ({ select: vi.fn(async () => ({ data: [{ id: 10 }], error: null })) }))
    const query = { eq: vi.fn(), then: (resolve: (value: unknown) => unknown) => resolve({ data: [], error: null }) }
    query.eq.mockReturnValue(query)
    const select = vi.fn(() => query)
    const supabase = { from: vi.fn(() => ({ upsert, select })) }
    mocks.getSupabaseWithUser.mockResolvedValue({ supabase, user: { id: 'user-1' } })
    mocks.getRequiredShippingCredentials.mockResolvedValue({})
    mocks.fetchNaverPendingOrders.mockResolvedValue([{ productOrderId: 'line-1', orderId: 'order-1', productName: '상품', quantity: 2, orderDate: '2026-07-15T00:00:00Z', productOrderStatus: 'PAYED', recipientName: '홍길동', recipientAddress: '서울', sellerSku: 'SKU-1', externalProductId: '100', externalVariantId: '200' }])

    await expect(syncOrders('naver')).resolves.toMatchObject({ orders: 1, lines: 1, failed: 0 })
    expect(upsert).toHaveBeenCalledWith(expect.objectContaining({ channel: 'naver', external_order_id: 'order-1' }), { onConflict: 'user_id,channel,external_order_id' })
  })
})

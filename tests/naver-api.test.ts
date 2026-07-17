import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  hashSync: vi.fn(),
}))

vi.mock('bcryptjs', () => ({
  default: { hashSync: mocks.hashSync },
  hashSync: mocks.hashSync,
}))

import {
  dispatchNaverOrders,
  fetchNaverPendingOrders,
  fetchNaverProductSnapshots,
} from '@/lib/api/naver'

const fetchMock = vi.fn()

beforeEach(() => {
  fetchMock.mockReset()
  mocks.hashSync.mockReset()
  mocks.hashSync.mockReturnValue('$2b$hashed-signature')
  vi.stubGlobal('fetch', fetchMock)
  vi.spyOn(Date, 'now').mockReturnValue(1_752_576_000_000)
})

afterEach(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

describe('naver product API helper', () => {
  it('uses bcrypt plus Base64 for a client-credentials token request without sending the client secret', async () => {
    const credentials = { clientId: 'test-client-id', clientSecret: '[redacted]' }
    fetchMock.mockResolvedValueOnce({ ok: true, json: async () => ({ access_token: 'access-token' }) })
    fetchMock.mockResolvedValueOnce({ ok: true, json: async () => ({ data: { contents: [], pagination: { page: 1, totalPages: 1 } } }) })

    await fetchNaverProductSnapshots(credentials)

    expect(mocks.hashSync).toHaveBeenCalledWith('test-client-id_1752576000000', '[redacted]')
    const tokenRequest = fetchMock.mock.calls[0]
    expect(String(tokenRequest[0])).toContain('/v1/oauth2/token')
    expect(tokenRequest[1]).toMatchObject({ method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' } })
    expect(tokenRequest[1].headers).not.toHaveProperty('Authorization')
    const params = new URLSearchParams(String(tokenRequest[1].body))
    expect(Object.fromEntries(params)).toEqual({
      client_id: 'test-client-id',
      timestamp: '1752576000000',
      client_secret_sign: Buffer.from('$2b$hashed-signature').toString('base64'),
      grant_type: 'client_credentials',
      type: 'SELF',
    })
    expect(String(tokenRequest[1].body)).not.toContain(credentials.clientSecret)
  })

  it('pages the current product-search response and emits one snapshot per channel product', async () => {
    fetchMock
      .mockResolvedValueOnce({ ok: true, json: async () => ({ access_token: 'access-token' }) })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          contents: [
            {
              originProductNo: 101,
              channelProducts: [
                {
                  channelProductNo: 202,
                  sellerManagementCode: 'SKU-NAV-1',
                  name: '네이버 상품',
                  statusType: 'SALE',
                  channelProductDisplayStatusType: 'ON',
                  stockQuantity: 12,
                  salePrice: 18000,
                  discountedPrice: 16000,
                  representativeImage: { url: 'https://image.example/naver.jpg' },
                },
                {
                  channelProductNo: 203,
                  sellerManagementCode: 'SKU-NAV-2',
                  name: '네이버 상품 2',
                  statusType: 'OUTOFSTOCK',
                  channelProductDisplayStatusType: 'ON',
                  stockQuantity: 0,
                  salePrice: 20000,
                },
              ],
            },
          ],
          page: 1,
          totalPages: 2,
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ contents: [], page: 2, totalPages: 2 }),
      })

    await expect(
      fetchNaverProductSnapshots({ clientId: 'client-id', clientSecret: 'secret-value' }),
    ).resolves.toEqual([
      {
        channel: 'naver',
        externalProductId: '101',
        externalVariantId: '202',
        sellerSku: 'SKU-NAV-1',
        productName: '네이버 상품',
        optionName: null,
        listingStatus: 'active',
        stockQuantity: 12,
        price: 16000,
        imageUrl: 'https://image.example/naver.jpg',
        rawAttributes: expect.objectContaining({
          originProductNo: 101,
        }),
      },
      {
        channel: 'naver',
        externalProductId: '101',
        externalVariantId: '203',
        sellerSku: 'SKU-NAV-2',
        productName: '네이버 상품 2',
        optionName: null,
        listingStatus: 'sold-out',
        stockQuantity: 0,
        price: 20000,
        imageUrl: null,
        rawAttributes: expect.objectContaining({
          originProductNo: 101,
        }),
      },
    ])

    expect(fetchMock).toHaveBeenCalledTimes(3)
    expect(String(fetchMock.mock.calls[1][0])).toContain('/v1/products/search')
    expect(JSON.parse(String(fetchMock.mock.calls[1][1].body))).toMatchObject({ page: 1, size: 500 })
    expect(JSON.parse(String(fetchMock.mock.calls[2][1].body))).toMatchObject({ page: 2, size: 500 })
    expect(String(fetchMock.mock.calls[0][1].body)).not.toContain('secret-value')
  })

  it('keeps credential values out of product search errors', async () => {
    fetchMock.mockResolvedValueOnce({ ok: false, status: 401, text: async () => 'clientSecret=secret-value' })

    await expect(
      fetchNaverProductSnapshots({ clientId: 'client-id', clientSecret: 'secret-value' }),
    ).rejects.toThrow('네이버 인증 실패: 401')
  })

  it('uses GET query cursors for changed orders, chunks detail requests, and retains shippable rows', async () => {
    const credentials = { clientId: 'test-client-id', clientSecret: '[redacted]' }
    const productOrderIds = Array.from({ length: 301 }, (_, index) => `PO-${index + 1}`)
    fetchMock
      .mockResolvedValueOnce({ ok: true, json: async () => ({ access_token: 'access-token' }) })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: { lastChangeStatuses: productOrderIds.slice(0, 300).map((productOrderId) => ({ productOrderId })), more: { moreFrom: 'cursor-from', moreSequence: 'cursor-sequence' } } }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: { lastChangeStatuses: productOrderIds.slice(300).map((productOrderId) => ({ productOrderId })), more: null } }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: [
          { productOrderId: 'PO-1', orderId: 'O-1', productName: 'Shippable', shippingAddress: {}, quantity: 1, orderDate: '2026-07-15T00:00:00Z', productOrderStatus: 'PAYED' },
          { productOrderId: 'PO-2', orderId: 'O-2', productName: 'Not shippable', shippingAddress: {}, quantity: 1, orderDate: '2026-07-15T00:00:00Z', productOrderStatus: 'CANCELED' },
        ] }),
      })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ data: [] }) })

    await expect(fetchNaverPendingOrders(credentials)).resolves.toEqual([
      expect.objectContaining({ productOrderId: 'PO-1', productOrderStatus: 'PAYED' }),
    ])

    const changedOrderFirstRequest = fetchMock.mock.calls[1]
    const changedOrderSecondRequest = fetchMock.mock.calls[2]
    expect(String(changedOrderFirstRequest[0])).toContain('/v1/pay-order/seller/product-orders/last-changed-statuses?')
    expect(changedOrderFirstRequest[1]).toMatchObject({ method: 'GET', headers: { Authorization: 'Bearer access-token' } })
    expect(changedOrderFirstRequest[1]).not.toHaveProperty('body')
    const continuationRequest = new URL(String(changedOrderSecondRequest[0]))
    expect(continuationRequest.searchParams.get('lastChangedFrom')).toBe('cursor-from')
    expect(continuationRequest.searchParams.get('moreSequence')).toBe('cursor-sequence')
    const detailRequests = fetchMock.mock.calls.slice(3)
    expect(detailRequests).toHaveLength(2)
    for (const [, init] of detailRequests) {
      expect(init).toMatchObject({ method: 'POST', headers: { Authorization: 'Bearer access-token' } })
      expect(JSON.parse(String(init.body)).productOrderIds.length).toBeLessThanOrEqual(300)
    }
  })

  it('keeps bearer-token dispatch requests on the server helper', async () => {
    fetchMock
      .mockResolvedValueOnce({ ok: true, json: async () => ({ access_token: 'access-token' }) })
      .mockResolvedValueOnce({ ok: true })

    await expect(dispatchNaverOrders([{ productOrderId: 'PO-1', trackingNumber: 'TRACK-1' }], { clientId: 'test-client-id', clientSecret: '[redacted]' })).resolves.toEqual({ success: true, failedOrders: [] })

    expect(fetchMock.mock.calls[1][0]).toContain('/v1/pay-order/seller/product-orders/dispatch')
    expect(fetchMock.mock.calls[1][1]).toMatchObject({
      method: 'POST',
      headers: { Authorization: 'Bearer access-token', 'Content-Type': 'application/json' },
    })
  })
})

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { fetchNaverProductSnapshots } from '@/lib/api/naver'

const fetchMock = vi.fn()

beforeEach(() => {
  fetchMock.mockReset()
  vi.stubGlobal('fetch', fetchMock)
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('naver product API helper', () => {
  it('pages product search at the maximum supported size and normalizes typed snapshots', async () => {
    fetchMock
      .mockResolvedValueOnce({ ok: true, json: async () => ({ access_token: 'access-token' }) })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: {
            contents: [
              {
                originProduct: {
                  originProductNo: 101,
                  sellerManagementCode: 'SKU-NAV-1',
                  name: '네이버 상품',
                  statusType: 'SALE',
                  stockQuantity: 12,
                  salePrice: 18000,
                  images: [{ url: 'https://image.example/naver.jpg' }],
                },
                smartstoreChannelProduct: {
                  channelProductNo: 202,
                  channelProductDisplayStatusType: 'ON',
                },
              },
            ],
            pagination: { page: 1, totalPages: 2 },
          },
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: { contents: [], pagination: { page: 2, totalPages: 2 } } }),
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
        price: 18000,
        imageUrl: 'https://image.example/naver.jpg',
        rawAttributes: expect.objectContaining({
          originProduct: expect.objectContaining({ originProductNo: 101 }),
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
})

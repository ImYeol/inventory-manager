import crypto from 'crypto'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import {
  confirmCoupangShipments,
  fetchCoupangPendingOrders,
  fetchCoupangProductSnapshots,
} from '@/lib/api/coupang'

const fetchMock = vi.fn()

beforeEach(() => {
  fetchMock.mockReset()
  vi.stubGlobal('fetch', fetchMock)
  vi.useFakeTimers()
  vi.setSystemTime(new Date('2026-04-12T00:00:00.000Z'))
})

afterEach(() => {
  vi.unstubAllGlobals()
  vi.useRealTimers()
})

describe('coupang api helpers', () => {
  it('pages seller products and fetches each detail with bounded concurrency', async () => {
    fetchMock
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: [{ sellerProductId: 1001 }], nextToken: 'NEXT' }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: [{ sellerProductId: 1002 }], nextToken: '' }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: {
            sellerProductId: 1001,
            sellerProductName: '쿠팡 상품',
            items: [{ vendorItemId: 2001, externalVendorSku: 'SKU-CP-1', itemName: '옵션 1' }],
          },
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: {
            sellerProductId: 1002,
            sellerProductName: '쿠팡 상품 2',
            items: [{ vendorItemId: 2002, externalVendorSku: 'SKU-CP-2', itemName: '옵션 2' }],
          },
        }),
      })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ data: { amountInStock: 7, salePrice: 12000, onSale: true } }) })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ data: { amountInStock: 0, salePrice: 15000, onSale: false } }) })

    await expect(fetchCoupangProductSnapshots({
      accessKey: 'access-key', secretKey: 'secret-key', vendorId: 'A00012345', defaultDeliveryCompanyCode: 'CJGLS',
    })).resolves.toEqual([
      expect.objectContaining({ channel: 'coupang', externalProductId: '1001', externalVariantId: '2001', sellerSku: 'SKU-CP-1', optionName: '옵션 1', listingStatus: 'active', stockQuantity: 7, price: 12000 }),
      expect.objectContaining({ channel: 'coupang', externalProductId: '1002', externalVariantId: '2002', sellerSku: 'SKU-CP-2', optionName: '옵션 2', listingStatus: 'paused', stockQuantity: 0, price: 15000 }),
    ])

    expect(fetchMock).toHaveBeenCalledTimes(6)
    const firstListRequest = new URL(String(fetchMock.mock.calls[0][0]))
    const secondListRequest = new URL(String(fetchMock.mock.calls[1][0]))
    const firstDetailRequest = new URL(String(fetchMock.mock.calls[2][0]))
    const [, firstListInit] = fetchMock.mock.calls[0]
    const [, firstDetailInit] = fetchMock.mock.calls[2]

    expect(firstListRequest.pathname).toBe('/v2/providers/seller_api/apis/api/v1/marketplace/seller-products')
    expect(firstListRequest.searchParams.get('maxPerPage')).toBe('100')
    expect(firstListRequest.searchParams.get('vendorId')).toBe('A00012345')
    expect(secondListRequest.searchParams.get('nextToken')).toBe('NEXT')
    expect(firstDetailRequest.pathname).toBe('/v2/providers/seller_api/apis/api/v1/marketplace/seller-products/1001')
    expect(firstDetailRequest.searchParams.has('vendorId')).toBe(false)
    const requestedBy = firstListRequest.searchParams.get('vendorId')
    expect(firstListInit.headers).toEqual(expect.objectContaining({
      Authorization: expect.any(String),
      'Content-Type': 'application/json',
      'X-Requested-By': requestedBy,
      'X-MARKET': 'KR',
    }))
    expect(firstDetailInit.headers).toEqual(expect.objectContaining({
      Authorization: expect.any(String),
      'Content-Type': 'application/json',
      'X-Requested-By': requestedBy,
      'X-MARKET': 'KR',
    }))
    const signedDate = String(firstListInit.headers.Authorization).match(/signed-date=([^,]+)/)?.[1]
    expect(signedDate).toBe('260412T000000Z')
    const signature = String(firstListInit.headers.Authorization).match(/signature=([^,]+)/)?.[1]
    const canonicalPath = `${firstListRequest.pathname}${firstListRequest.search.slice(1)}`
    const expectedSignature = crypto.createHmac('sha256', 'secret-key').update(`${signedDate}GET${canonicalPath}`).digest('hex')
    const incorrectSignature = crypto.createHmac('sha256', 'secret-key').update(`${signedDate}GET${firstListRequest.pathname}${firstListRequest.search}`).digest('hex')
    expect(signature).toBe(expectedSignature)
    expect(signature).not.toBe(incorrectSignature)
    expect(new URL(String(fetchMock.mock.calls[4][0])).pathname).toBe('/v2/providers/seller_api/apis/api/v1/marketplace/vendor-items/2001/inventories')
    expect(new URL(String(fetchMock.mock.calls[5][0])).pathname).toBe('/v2/providers/seller_api/apis/api/v1/marketplace/vendor-items/2002/inventories')
  })

  it('fetches v5 order sheets with nextToken pagination and maps shipment data', async () => {
    fetchMock
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: [
            {
              shipmentBoxId: 101,
              orderId: 202,
              orderedAt: '2026-04-12T09:00:00.000Z',
              status: 'INSTRUCT',
              receiver: {
                name: '홍길동',
                addr1: '서울특별시',
                addr2: '송파구',
              },
              orderItems: [
                {
                  vendorItemId: 301,
                  vendorItemName: '옵션 1',
                  shippingCount: 3,
                  holdCountForCancel: 1,
                  cancelCount: 1,
                  externalVendorSkuCode: 'SKU-301',
                },
              ],
            },
          ],
          nextToken: 'NEXT-1',
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: [
            {
              shipmentBoxId: 102,
              orderId: 203,
              orderedAt: '2026-04-13T09:00:00.000Z',
              status: 'INSTRUCT',
              receiver: {
                name: '김철수',
                addr1: '부산광역시',
                addr2: '해운대구',
              },
              orderItems: [
                {
                  vendorItemId: 302,
                  vendorItemName: '옵션 2',
                  shippingCount: 2,
                  holdCountForCancel: 1,
                  cancelCount: 5,
                  externalVendorSkuCode: 'SKU-302',
                },
              ],
            },
          ],
          nextToken: '',
        }),
      })

    const orders = await fetchCoupangPendingOrders(
      {
        accessKey: 'access-key',
        secretKey: 'secret-key',
        vendorId: 'A00012345',
        defaultDeliveryCompanyCode: 'CJGLS',
      },
      {
        fromDate: '2026-04-12',
        toDate: '2026-04-13',
      },
    )

    expect(fetchMock).toHaveBeenCalledTimes(2)
    expect(String(fetchMock.mock.calls[0][0])).toContain('/api/v5/vendors/A00012345/ordersheets')
    expect(String(fetchMock.mock.calls[0][0])).toContain('status=INSTRUCT')
    expect(String(fetchMock.mock.calls[0][0])).toContain('createdAtFrom=2026-04-12%2B09%3A00')
    expect(String(fetchMock.mock.calls[0][0])).toContain('createdAtTo=2026-04-13%2B09%3A00')
    expect(String(fetchMock.mock.calls[1][0])).toContain('nextToken=NEXT-1')
    expect(orders).toEqual([
      {
        shipmentBoxId: 101,
        orderId: 202,
        orderedAt: '2026-04-12T09:00:00.000Z',
        status: 'INSTRUCT',
        receiver: {
          name: '홍길동',
          addr1: '서울특별시',
          addr2: '송파구',
        },
        orderItems: [
          {
            vendorItemId: 301,
            vendorItemName: '옵션 1',
            shippingCount: 1,
            sellerSku: 'SKU-301',
            externalProductId: null,
          },
        ],
      },
      expect.objectContaining({ shipmentBoxId: 102, orderId: 203, orderItems: [] }),
    ])
  })

  it('posts invoice uploads to orders/invoices with item-level payloads', async () => {
    fetchMock
      .mockResolvedValueOnce({ ok: true, json: async () => ({ code: 'SUCCESS', message: '성공', data: [{ shipmentBoxId: 111, orderId: 101, status: 'INSTRUCT', orderItems: [{ vendorItemId: 301, shippingCount: 1 }, { vendorItemId: 302, shippingCount: 1 }] }] }) })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ code: 'SUCCESS', message: '성공', data: [{ shipmentBoxId: 12, orderId: 102, status: 'INSTRUCT', orderItems: [{ vendorItemId: 303, shippingCount: 1 }] }] }) })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ data: { responseCode: 1, responseMessage: 'PARTIAL_ERROR', responseList: [{ shipmentBoxId: 111, succeed: true }, { shipmentBoxId: 12, succeed: false }] } }) })

    const result = await confirmCoupangShipments(
      [
        {
          shipmentBoxId: 11,
          orderId: 101,
          vendorItemIds: [301, 302],
          trackingNumber: '1234567890',
        },
        {
          shipmentBoxId: 12,
          orderId: 102,
          vendorItemIds: [303],
          trackingNumber: '5555555555',
        },
      ],
      {
        accessKey: 'access-key',
        secretKey: 'secret-key',
        vendorId: 'A00012345',
        defaultDeliveryCompanyCode: 'CJGLS',
      },
    )

    expect(fetchMock).toHaveBeenCalledTimes(3)
    expect(String(fetchMock.mock.calls[0][0])).toContain('/api/v5/vendors/A00012345/101/ordersheets')
    expect(String(fetchMock.mock.calls[1][0])).toContain('/api/v5/vendors/A00012345/102/ordersheets')
    expect(String(fetchMock.mock.calls[2][0])).toContain('/api/v4/vendors/A00012345/orders/invoices')
    const [, requestInit] = fetchMock.mock.calls[2]
    expect(requestInit.method).toBe('POST')
    expect(JSON.parse(String(requestInit.body))).toEqual({
      vendorId: 'A00012345',
      orderSheetInvoiceApplyDtos: [
        {
          shipmentBoxId: 111,
          orderId: 101,
          vendorItemId: 301,
          deliveryCompanyCode: 'CJGLS',
          invoiceNumber: '1234567890',
          splitShipping: false,
          preSplitShipped: false,
          estimatedShippingDate: '',
        },
        {
          shipmentBoxId: 111,
          orderId: 101,
          vendorItemId: 302,
          deliveryCompanyCode: 'CJGLS',
          invoiceNumber: '1234567890',
          splitShipping: false,
          preSplitShipped: false,
          estimatedShippingDate: '',
        },
        {
          shipmentBoxId: 12,
          orderId: 102,
          vendorItemId: 303,
          deliveryCompanyCode: 'CJGLS',
          invoiceNumber: '5555555555',
          splitShipping: false,
          preSplitShipped: false,
          estimatedShippingDate: '',
        },
      ],
    })
    expect(result).toEqual({
      success: false,
      failedBoxes: [12],
      error: '쿠팡 발송 처리에 실패했습니다.',
    })
  })

  it('does not upload invoices when the refreshed order detail array is empty', async () => {
    fetchMock.mockResolvedValueOnce({ ok: true, json: async () => ({ code: 'SUCCESS', message: '성공', data: [] }) })

    await expect(confirmCoupangShipments([{ shipmentBoxId: 11, orderId: 101, vendorItemIds: [301], trackingNumber: '1234567890' }], {
      accessKey: 'access-key', secretKey: 'secret-key', vendorId: 'A00012345', defaultDeliveryCompanyCode: 'CJGLS',
    })).resolves.toEqual({ success: false, failedBoxes: [11], error: '쿠팡 주문 상태를 다시 확인해 주세요.' })

    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('selects the matching refreshed order sheet from multiple detail rows', async () => {
    fetchMock
      .mockResolvedValueOnce({ ok: true, json: async () => ({
        code: 'SUCCESS',
        message: '성공',
        data: [
          { shipmentBoxId: 10, orderId: 100, status: 'INSTRUCT', orderItems: [{ vendorItemId: 301, shippingCount: 1 }] },
          { shipmentBoxId: 111, orderId: 101, status: 'INSTRUCT', orderItems: [{ vendorItemId: 301, shippingCount: 1 }, { vendorItemId: 302, shippingCount: 1 }] },
        ],
      }) })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ data: { responseCode: 0, responseList: [] } }) })

    await expect(confirmCoupangShipments([{ shipmentBoxId: 11, orderId: 101, vendorItemIds: [301, 302], trackingNumber: '1234567890' }], {
      accessKey: 'access-key', secretKey: 'secret-key', vendorId: 'A00012345', defaultDeliveryCompanyCode: 'CJGLS',
    })).resolves.toEqual({ success: true, failedBoxes: [] })

    expect(JSON.parse(String(fetchMock.mock.calls[1][1].body))).toMatchObject({
      orderSheetInvoiceApplyDtos: [
        { shipmentBoxId: 111, orderId: 101, vendorItemId: 301 },
        { shipmentBoxId: 111, orderId: 101, vendorItemId: 302 },
      ],
    })
  })
})

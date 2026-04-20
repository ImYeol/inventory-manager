import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import {
  confirmCoupangShipments,
  fetchCoupangPendingOrders,
} from '@/lib/api/coupang'

const fetchMock = vi.fn()

beforeEach(() => {
  fetchMock.mockReset()
  vi.stubGlobal('fetch', fetchMock)
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('coupang api helpers', () => {
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
                  shippingCount: 1,
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
          },
        ],
      },
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
          },
        ],
      },
    ])
  })

  it('posts invoice uploads to orders/invoices with item-level payloads', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({
        data: {
          responseCode: 1,
          responseMessage: 'PARTIAL_ERROR',
          responseList: [
            {
              shipmentBoxId: 11,
              succeed: true,
              resultCode: 'OK',
              retryRequired: false,
              resultMessage: null,
            },
            {
              shipmentBoxId: 12,
              succeed: false,
              resultCode: 'INVALID_INVOICE_NUMBER',
              retryRequired: true,
              resultMessage: '송장번호가 유효하지 않습니다.',
            },
          ],
        },
      }),
    })

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

    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(String(fetchMock.mock.calls[0][0])).toContain('/api/v4/vendors/A00012345/orders/invoices')
    const [, requestInit] = fetchMock.mock.calls[0]
    expect(requestInit.method).toBe('POST')
    expect(JSON.parse(String(requestInit.body))).toEqual({
      vendorId: 'A00012345',
      orderSheetInvoiceApplyDtos: [
        {
          shipmentBoxId: 11,
          orderId: 101,
          vendorItemId: 301,
          deliveryCompanyCode: 'CJGLS',
          invoiceNumber: '1234567890',
          splitShipping: false,
          preSplitShipped: false,
          estimatedShippingDate: '',
        },
        {
          shipmentBoxId: 11,
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
      error: 'PARTIAL_ERROR',
    })
  })
})

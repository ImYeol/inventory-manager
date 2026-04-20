import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  fetchNaverPendingOrders: vi.fn(),
  dispatchNaverOrders: vi.fn(),
  fetchCoupangPendingOrders: vi.fn(),
  confirmCoupangShipments: vi.fn(),
  getRequiredShippingCredentials: vi.fn(),
  MissingShippingCredentialsError: class MissingShippingCredentialsError extends Error {
    constructor(message: string) {
      super(message)
      this.name = 'MissingShippingCredentialsError'
    }
  },
}))

vi.mock('@/lib/api/naver', () => ({
  fetchNaverPendingOrders: mocks.fetchNaverPendingOrders,
  dispatchNaverOrders: mocks.dispatchNaverOrders,
}))

vi.mock('@/lib/api/coupang', () => ({
  fetchCoupangPendingOrders: mocks.fetchCoupangPendingOrders,
  confirmCoupangShipments: mocks.confirmCoupangShipments,
}))

vi.mock('@/lib/shipping-credentials', () => ({
  MissingShippingCredentialsError: mocks.MissingShippingCredentialsError,
  getRequiredShippingCredentials: mocks.getRequiredShippingCredentials,
}))

import {
  fetchCoupangOrders,
  fetchNaverOrders,
  sendCoupangTrackingNumbers,
  sendNaverTrackingNumbers,
} from '@/lib/actions/shipping'

beforeEach(() => {
  for (const mock of [
    mocks.fetchNaverPendingOrders,
    mocks.dispatchNaverOrders,
    mocks.fetchCoupangPendingOrders,
    mocks.confirmCoupangShipments,
    mocks.getRequiredShippingCredentials,
  ]) {
    mock.mockReset?.()
  }
})

afterEach(() => {
  for (const mock of [
    mocks.fetchNaverPendingOrders,
    mocks.dispatchNaverOrders,
    mocks.fetchCoupangPendingOrders,
    mocks.confirmCoupangShipments,
    mocks.getRequiredShippingCredentials,
  ]) {
    mock.mockReset?.()
  }
})

describe('shipping server actions', () => {
  it('returns a clear user-facing error when naver credentials are not configured', async () => {
    mocks.getRequiredShippingCredentials.mockRejectedValue(
      new mocks.MissingShippingCredentialsError(
        '네이버 API 설정이 필요합니다. 설정에서 API 키를 먼저 저장해주세요.'
      )
    )

    await expect(fetchNaverOrders()).resolves.toEqual({
      success: false,
      orders: [],
      error: '네이버 API 설정이 필요합니다. 설정에서 API 키를 먼저 저장해주세요.',
    })

    expect(mocks.fetchNaverPendingOrders).not.toHaveBeenCalled()
  })

  it('passes per-user coupang credentials to the API helper', async () => {
    const credentials = {
      accessKey: 'coupang-access',
      secretKey: 'coupang-secret',
      vendorId: 'A00012345',
      defaultDeliveryCompanyCode: 'CJGLS',
    }

    mocks.getRequiredShippingCredentials.mockResolvedValue(credentials)
    mocks.fetchCoupangPendingOrders.mockResolvedValue([
      {
        shipmentBoxId: 101,
        orderId: 202,
        orderedAt: '2026-04-12T00:00:00.000Z',
        status: 'ACCEPT',
        receiver: {
          name: '홍길동',
          addr1: '서울시',
          addr2: '송파구',
        },
        orderItems: [
          {
            vendorItemId: 303,
            vendorItemName: '테스트 상품',
            shippingCount: 1,
          },
        ],
      },
    ])

    await expect(fetchCoupangOrders({ fromDate: '2026-04-10', toDate: '2026-04-12' })).resolves.toEqual({
      success: true,
      orders: [
        {
          shipmentBoxId: 101,
          orderId: 202,
          orderedAt: '2026-04-12T00:00:00.000Z',
          status: 'ACCEPT',
          receiver: {
            name: '홍길동',
            addr1: '서울시',
            addr2: '송파구',
          },
          orderItems: [
            {
              vendorItemId: 303,
              vendorItemName: '테스트 상품',
              shippingCount: 1,
            },
          ],
        },
      ],
    })

    expect(mocks.getRequiredShippingCredentials).toHaveBeenCalledWith('coupang')
    expect(mocks.fetchCoupangPendingOrders).toHaveBeenCalledWith(credentials, {
      fromDate: '2026-04-10',
      toDate: '2026-04-12',
    })
  })

  it('returns a clear user-facing error when naver send is attempted without credentials', async () => {
    mocks.getRequiredShippingCredentials.mockRejectedValue(
      new mocks.MissingShippingCredentialsError(
        '네이버 API 설정이 필요합니다. 설정에서 API 키를 먼저 저장해주세요.'
      )
    )

    await expect(
      sendNaverTrackingNumbers([{ productOrderId: 'PO-1', trackingNumber: '1234567890' }])
    ).resolves.toEqual({
      success: false,
      failedOrders: ['PO-1'],
      error: '네이버 API 설정이 필요합니다. 설정에서 API 키를 먼저 저장해주세요.',
    })

    expect(mocks.dispatchNaverOrders).not.toHaveBeenCalled()
  })

  it('passes per-user coupang credentials when confirming shipments', async () => {
    const credentials = {
      accessKey: 'coupang-access',
      secretKey: 'coupang-secret',
      vendorId: 'A00012345',
      defaultDeliveryCompanyCode: 'CJGLS',
    }
    const matches = [{ shipmentBoxId: 11, orderId: 22, vendorItemIds: [301, 302], trackingNumber: 'TRACK-11' }]

    mocks.getRequiredShippingCredentials.mockResolvedValue(credentials)
    mocks.confirmCoupangShipments.mockResolvedValue({
      success: true,
      failedBoxes: [],
    })

    await expect(sendCoupangTrackingNumbers(matches)).resolves.toEqual({
      success: true,
      failedBoxes: [],
    })

    expect(mocks.getRequiredShippingCredentials).toHaveBeenCalledWith('coupang')
    expect(mocks.confirmCoupangShipments).toHaveBeenCalledWith(matches, credentials)
  })
})

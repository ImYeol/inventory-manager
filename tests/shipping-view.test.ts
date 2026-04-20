// @vitest-environment jsdom
import React from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import * as XLSX from 'xlsx'

const shippingActions = vi.hoisted(() => ({
  fetchNaverOrders: vi.fn(),
  sendNaverTrackingNumbers: vi.fn(),
  fetchCoupangOrders: vi.fn(),
  sendCoupangTrackingNumbers: vi.fn(),
}))

vi.mock('next/link', () => ({
  default: ({
    href,
    children,
    className,
  }: {
    href: string
    children: React.ReactNode
    className?: string
  }) => React.createElement('a', { href, className }, children),
}))

vi.mock('@/lib/actions/shipping', () => ({
  fetchNaverOrders: shippingActions.fetchNaverOrders,
  sendNaverTrackingNumbers: shippingActions.sendNaverTrackingNumbers,
  fetchCoupangOrders: shippingActions.fetchCoupangOrders,
  sendCoupangTrackingNumbers: shippingActions.sendCoupangTrackingNumbers,
}))

import ShippingView from '@/app/(protected)/shipping/ShippingView'

afterEach(() => {
  cleanup()
  shippingActions.fetchNaverOrders.mockReset()
  shippingActions.sendNaverTrackingNumbers.mockReset()
  shippingActions.fetchCoupangOrders.mockReset()
  shippingActions.sendCoupangTrackingNumbers.mockReset()
})

function makeExcelFile(rows?: string[][]) {
  const workbook = XLSX.utils.book_new()
  const worksheet = XLSX.utils.aoa_to_sheet([
    ['No', '집화예정장소', '접수일자', '집화예정일자', '집화일자', '예약구분', '예약번호', '운송장번호', '받는분', '전화번호', '주소', '예약매체'],
    ...(rows ?? [
      ['1', '서울집화장', '2026-04-12', '2026-04-13', '2026-04-14', '일반', 'AB-123', '123456789', '홍길동', '010-1234-5678', '서울특별시', '웹'],
      ['2', '부산집화장', '2026-04-15', '2026-04-16', '2026-04-17', '일반', 'CD-456', '987654321', '김철수', '010-2222-3333', '부산', '파일'],
    ]),
  ])
  XLSX.utils.book_append_sheet(workbook, worksheet, '시트1')
  const arrayBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' })

  return new File([arrayBuffer], '운송장.xlsx', {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  })
}

function makeCoupangOrderSheet(overrides?: Record<string, unknown>) {
  return {
    shipmentBoxId: 1001,
    orderId: 2001,
    orderedAt: '2026-04-12T09:00:00.000Z',
    status: 'INSTRUCT',
    receiver: {
      name: '홍길동',
      addr1: '서울특별시',
      addr2: '송파구 오금동',
    },
    orderItems: [
      {
        vendorItemId: 3001,
        vendorItemName: '옵션 1',
        shippingCount: 1,
      },
    ],
    ...overrides,
  }
}

describe('ShippingView', () => {
  it('keeps upload available and exposes provider deep links when both provider keys are missing', () => {
    render(
      React.createElement(ShippingView, {
        settingsSummary: {
          naver: { configured: false, masked: {}, updatedAt: null },
          coupang: { configured: false, masked: {}, updatedAt: null },
        },
      })
    )

    expect(screen.queryByText('연동 준비 상태')).toBeNull()
    expect(screen.getByText('운송장 업로드').closest('section')?.className).toContain('ui-card')
    expect(screen.getByText('분류 미리보기').closest('section')?.className).toContain('ui-card')
    expect(screen.getByLabelText('운송장 엑셀 업로드')).toBeTruthy()
    expect(screen.getByRole('link', { name: /네이버 미연결/ }).getAttribute('href')).toBe('/settings?section=store-connections&provider=naver')
    expect(screen.getByRole('link', { name: /쿠팡 미연결/ }).getAttribute('href')).toBe('/settings?section=store-connections&provider=coupang')
    expect(screen.getAllByLabelText('미연결')).toHaveLength(2)
    expect(screen.getByRole('combobox', { name: '분류 필터' }).className).not.toContain('bg-white')
  })

  it('shows provider action groups for configured stores and keeps links for unconfigured stores', () => {
    render(
      React.createElement(ShippingView, {
        settingsSummary: {
          naver: {
            configured: true,
            masked: { clientId: 'naver-••••' },
            updatedAt: '2026-04-12T09:00:00.000Z',
          },
          coupang: { configured: false, masked: {}, updatedAt: null },
        },
      })
    )

    expect(screen.queryByText('연동 준비 상태')).toBeNull()
    expect((screen.getByRole('button', { name: '네이버 갱신' }) as HTMLButtonElement).disabled).toBe(true)
    expect((screen.getByRole('button', { name: '네이버 반영' }) as HTMLButtonElement).disabled).toBe(true)
    expect(screen.getByRole('link', { name: /쿠팡 미연결/ }).getAttribute('href')).toBe('/settings?section=store-connections&provider=coupang')
    expect(screen.getAllByLabelText('연결됨')).toHaveLength(1)
    expect(screen.getByRole('button', { name: '네이버 갱신' }).parentElement?.className).toContain('whitespace-nowrap')
  })

  it('classifies uploaded rows and filters the preview by badge state', async () => {
    shippingActions.fetchNaverOrders.mockResolvedValue({
      success: true,
      orders: [
        {
          productOrderId: 'PO-1',
          orderId: 'ORDER-1',
          productName: '테스트 상품',
          recipientName: '홍길동',
          recipientAddress: '서울특별시 송파구 오금동',
          quantity: 1,
          orderDate: '2026-04-12T09:00:00.000Z',
          productOrderStatus: 'PAYED',
        },
      ],
    })
    shippingActions.fetchCoupangOrders.mockResolvedValue({
      success: true,
      orders: [],
    })

    render(
      React.createElement(ShippingView, {
        settingsSummary: {
          naver: { configured: true, masked: { clientId: 'naver-••••' }, updatedAt: '2026-04-12T09:00:00.000Z' },
          coupang: {
            configured: true,
            masked: { accessKey: 'cp-••••', vendorId: 'v-••', defaultDeliveryCompanyCode: 'CJGLS' },
            updatedAt: '2026-04-12T10:00:00.000Z',
          },
        },
      })
    )

    const dropZone = screen.getByLabelText('운송장 엑셀 업로드 영역')
    const file = makeExcelFile()
    const dataTransfer = { files: [file] } as unknown as DataTransfer

    fireEvent.drop(dropZone, {
      dataTransfer,
    })

    await waitFor(() => {
      expect(screen.getByRole('cell', { name: '홍길동' })).toBeTruthy()
    })

    expect(shippingActions.fetchCoupangOrders).toHaveBeenCalledWith({
      fromDate: '2026-04-12',
      toDate: '2026-04-17',
    })

    expect(screen.getByText('분류 미리보기')).toBeTruthy()
    expect(screen.getByRole('columnheader', { name: '분류' })).toBeTruthy()
    expect(screen.getByRole('columnheader', { name: 'No' })).toBeTruthy()
    expect(screen.getByRole('columnheader', { name: '집화예정장소' })).toBeTruthy()
    expect(screen.getByRole('columnheader', { name: '예약번호' })).toBeTruthy()
    expect(screen.getByRole('cell', { name: '홍길동' })).toBeTruthy()
    expect(screen.getByRole('cell', { name: 'AB-123' })).toBeTruthy()
    expect(screen.getByRole('cell', { name: '010-1234-5678' })).toBeTruthy()
    expect(screen.getByRole('combobox', { name: '홍길동 분류 변경' }).textContent).toContain('네이버')
    expect(screen.getByRole('combobox', { name: '김철수 분류 변경' }).textContent).toContain('미분류')
    await waitFor(() => {
      expect((screen.getByRole('button', { name: '네이버 갱신' }) as HTMLButtonElement).disabled).toBe(false)
      expect((screen.getByRole('button', { name: '네이버 반영' }) as HTMLButtonElement).disabled).toBe(false)
      expect((screen.getByRole('button', { name: '쿠팡 반영' }) as HTMLButtonElement).disabled).toBe(true)
    })
    expect(screen.queryByRole('button', { name: '네이버 발송' })).toBeNull()

    fireEvent.click(screen.getByRole('combobox', { name: '분류 필터' }))
    fireEvent.click(await screen.findByRole('option', { name: '미분류' }))

    expect(screen.queryByRole('cell', { name: '홍길동' })).toBeNull()
    expect(screen.getByRole('cell', { name: '김철수' })).toBeTruthy()
  })

  it('keeps manual classification when provider data is refreshed', async () => {
    shippingActions.fetchNaverOrders.mockResolvedValue({
      success: true,
      orders: [
        {
          productOrderId: 'PO-1',
          orderId: 'ORDER-1',
          productName: '테스트 상품',
          recipientName: '홍길동',
          recipientAddress: '서울특별시 송파구 오금동',
          quantity: 1,
          orderDate: '2026-04-12T09:00:00.000Z',
          productOrderStatus: 'PAYED',
        },
      ],
    })
    shippingActions.fetchCoupangOrders.mockResolvedValue({
      success: true,
      orders: [],
    })

    render(
      React.createElement(ShippingView, {
        settingsSummary: {
          naver: { configured: true, masked: { clientId: 'naver-••••' }, updatedAt: '2026-04-12T09:00:00.000Z' },
          coupang: { configured: false, masked: {}, updatedAt: null },
        },
      })
    )

    const dropZone = screen.getByLabelText('운송장 엑셀 업로드 영역')
    const file = makeExcelFile()
    const dataTransfer = { files: [file] } as unknown as DataTransfer

    fireEvent.drop(dropZone, {
      dataTransfer,
    })

    await waitFor(() => {
      expect(screen.getByRole('combobox', { name: '홍길동 분류 변경' }).textContent).toContain('네이버')
    })

    fireEvent.click(screen.getByRole('combobox', { name: '홍길동 분류 변경' }))
    fireEvent.click(await screen.findByRole('option', { name: '미분류' }))

    expect(screen.getByRole('combobox', { name: '홍길동 분류 변경' }).textContent).toContain('미분류')

    fireEvent.click(screen.getByRole('button', { name: '네이버 갱신' }))

    await waitFor(() => {
      expect(screen.getByRole('combobox', { name: '홍길동 분류 변경' }).textContent).toContain('미분류')
    })
  })

  it('allows resolving ambiguous rows through the classification dropdown', async () => {
    shippingActions.fetchNaverOrders.mockResolvedValue({
      success: true,
      orders: [
        {
          productOrderId: 'PO-1',
          orderId: 'ORDER-1',
          productName: '테스트 상품',
          recipientName: '홍길동',
          recipientAddress: '서울특별시 송파구 오금동',
          quantity: 1,
          orderDate: '2026-04-12T09:00:00.000Z',
          productOrderStatus: 'PAYED',
        },
      ],
    })
    shippingActions.fetchCoupangOrders.mockResolvedValue({
      success: true,
      orders: [makeCoupangOrderSheet()],
    })

    render(
      React.createElement(ShippingView, {
        settingsSummary: {
          naver: { configured: true, masked: { clientId: 'naver-••••' }, updatedAt: '2026-04-12T09:00:00.000Z' },
          coupang: {
            configured: true,
            masked: { accessKey: 'cp-••••', vendorId: 'v-••', defaultDeliveryCompanyCode: 'CJGLS' },
            updatedAt: '2026-04-12T10:00:00.000Z',
          },
        },
      })
    )

    const dropZone = screen.getByLabelText('운송장 엑셀 업로드 영역')
    const file = makeExcelFile()
    const dataTransfer = { files: [file] } as unknown as DataTransfer

    fireEvent.drop(dropZone, {
      dataTransfer,
    })

    await waitFor(() => {
      expect(screen.getByRole('combobox', { name: '홍길동 분류 변경' }).textContent).toContain('중복 후보')
    })

    fireEvent.click(screen.getByRole('combobox', { name: '홍길동 분류 변경' }))
    fireEvent.click(await screen.findByRole('option', { name: '네이버' }))

    expect(screen.getByRole('combobox', { name: '홍길동 분류 변경' }).textContent).toContain('네이버')
  })

  it('keeps rows without tracking numbers in preview and excludes them from coupang apply targets', async () => {
    shippingActions.fetchNaverOrders.mockResolvedValue({
      success: true,
      orders: [],
    })
    shippingActions.fetchCoupangOrders.mockResolvedValue({
      success: true,
      orders: [makeCoupangOrderSheet()],
    })

    render(
      React.createElement(ShippingView, {
        settingsSummary: {
          naver: { configured: false, masked: {}, updatedAt: null },
          coupang: {
            configured: true,
            masked: { accessKey: 'cp-••••', vendorId: 'v-••', defaultDeliveryCompanyCode: 'CJGLS' },
            updatedAt: '2026-04-12T10:00:00.000Z',
          },
        },
      }),
    )

    fireEvent.drop(screen.getByLabelText('운송장 엑셀 업로드 영역'), {
      dataTransfer: {
        files: [
          makeExcelFile([
            ['1', '서울집화장', '2026-04-12', '2026-04-13', '2026-04-14', '일반', 'AB-123', '', '홍길동', '010-1234-5678', '서울특별시', '웹'],
          ]),
        ],
      } as unknown as DataTransfer,
    })

    await waitFor(() => {
      expect(screen.getByRole('cell', { name: '홍길동' })).toBeTruthy()
    })

    expect(screen.getByRole('combobox', { name: '홍길동 분류 변경' }).textContent).toContain('쿠팡')
    expect(screen.getByRole('cell', { name: '-' })).toBeTruthy()
    await waitFor(() => {
      expect((screen.getByRole('button', { name: '쿠팡 반영' }) as HTMLButtonElement).disabled).toBe(true)
    })
  })

  it('refreshes coupang matches with the uploaded date range and sends shipment payloads with vendor item ids', async () => {
    shippingActions.fetchNaverOrders.mockResolvedValue({
      success: true,
      orders: [],
    })
    shippingActions.fetchCoupangOrders
      .mockResolvedValueOnce({
        success: true,
        orders: [
          makeCoupangOrderSheet({
            orderItems: [
              { vendorItemId: 301, vendorItemName: '옵션 1', shippingCount: 1 },
              { vendorItemId: 302, vendorItemName: '옵션 2', shippingCount: 1 },
            ],
          }),
        ],
      })
      .mockResolvedValueOnce({
        success: true,
        orders: [
          makeCoupangOrderSheet({
            orderItems: [
              { vendorItemId: 301, vendorItemName: '옵션 1', shippingCount: 1 },
              { vendorItemId: 302, vendorItemName: '옵션 2', shippingCount: 1 },
            ],
          }),
        ],
      })
    shippingActions.sendCoupangTrackingNumbers.mockResolvedValue({
      success: true,
      failedBoxes: [],
    })

    render(
      React.createElement(ShippingView, {
        settingsSummary: {
          naver: { configured: false, masked: {}, updatedAt: null },
          coupang: {
            configured: true,
            masked: { accessKey: 'cp-••••', vendorId: 'v-••', defaultDeliveryCompanyCode: 'CJGLS' },
            updatedAt: '2026-04-12T10:00:00.000Z',
          },
        },
      }),
    )

    fireEvent.drop(screen.getByLabelText('운송장 엑셀 업로드 영역'), {
      dataTransfer: {
        files: [
          makeExcelFile([
            ['1', '서울집화장', '2026-04-12', '2026-04-13', '2026-04-14', '일반', 'AB-123', '123456789', '홍길동', '010-1234-5678', '서울특별시', '웹'],
          ]),
        ],
      } as unknown as DataTransfer,
    })

    await waitFor(() => {
      expect(screen.getByRole('combobox', { name: '홍길동 분류 변경' }).textContent).toContain('쿠팡')
    })

    fireEvent.click(screen.getByRole('button', { name: '쿠팡 갱신' }))

    await waitFor(() => {
      expect(shippingActions.fetchCoupangOrders).toHaveBeenLastCalledWith({
        fromDate: '2026-04-12',
        toDate: '2026-04-14',
      })
    })

    await waitFor(() => {
      expect((screen.getByRole('button', { name: '쿠팡 반영' }) as HTMLButtonElement).disabled).toBe(false)
    })

    fireEvent.click(screen.getByRole('button', { name: '쿠팡 반영' }))

    await waitFor(() => {
      expect(shippingActions.sendCoupangTrackingNumbers).toHaveBeenCalledWith([
        {
          shipmentBoxId: 1001,
          orderId: 2001,
          vendorItemIds: [301, 302],
          trackingNumber: '123456789',
        },
      ])
    })
  })
})

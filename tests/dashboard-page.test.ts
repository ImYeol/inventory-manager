// @vitest-environment jsdom
import React from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'

const mocks = vi.hoisted(() => ({
  getOperationsDashboard: vi.fn(),
}))

vi.mock('@/lib/actions/dashboard', () => ({
  getOperationsDashboard: mocks.getOperationsDashboard,
}))

import DashboardPage from '@/app/(protected)/page'

beforeEach(() => {
  mocks.getOperationsDashboard.mockReset()
})

describe('DashboardPage', () => {
  it('renders the action-oriented commerce operations dashboard', async () => {
    mocks.getOperationsDashboard.mockResolvedValue({
      metrics: {
        newOrders: 4,
        readyToFulfill: 3,
        needsAttention: 2,
        dispatchedToday: 7,
      },
      flow: [
        { date: '2026-07-14', label: '7/14', inbound: 8, outbound: 3 },
        { date: '2026-07-15', label: '7/15', inbound: 2, outbound: 7 },
      ],
      warehouses: [
        { id: 1, name: '오금동', onHand: 20, committed: 4, available: 16 },
        { id: 2, name: '대자동', onHand: 10, committed: 3, available: 7 },
      ],
      exceptions: [
        { id: 10, channel: 'coupang', externalOrderId: 'CP-100', customerName: '홍길동', reason: 'SKU 연결 필요' },
      ],
      upcomingSourcing: [
        { id: 20, expectedDate: '2026-07-18', factoryName: '이우 A공장', referenceCode: 'PO-20', remainingQuantity: 40 },
      ],
    })

    render((await DashboardPage()) as React.ReactElement)

    expect(screen.getByRole('heading', { name: '대시보드' })).toBeTruthy()
    expect(screen.getByRole('link', { name: '신규 주문 4건' }).getAttribute('href')).toBe('/orders?view=new')
    expect(screen.getByRole('link', { name: '출고 준비 3건' }).getAttribute('href')).toBe('/orders?view=ready')
    expect(screen.getByRole('link', { name: '확인 필요 2건' }).getAttribute('href')).toBe('/orders?view=exception')
    expect(screen.getByRole('link', { name: '오늘 발송 7건' }).getAttribute('href')).toBe('/orders?view=fulfilled')

    expect(screen.getByRole('heading', { name: '최근 14일 입출고' })).toBeTruthy()
    expect(screen.getByLabelText('7/14 입고 8, 출고 3')).toBeTruthy()
    expect(screen.getByRole('table', { name: '창고별 재고 상태' })).toBeTruthy()
    expect(screen.getByRole('columnheader', { name: '실재고' })).toBeTruthy()
    expect(screen.getByRole('columnheader', { name: '예약' })).toBeTruthy()
    expect(screen.getByRole('columnheader', { name: '가용' })).toBeTruthy()

    expect(screen.getByRole('table', { name: '처리해야 할 주문 예외' })).toBeTruthy()
    expect(screen.getByText('쿠팡')).toBeTruthy()
    expect(screen.getByText('SKU 연결 필요')).toBeTruthy()
    expect(screen.getByRole('table', { name: '곧 도착할 소싱' })).toBeTruthy()
    expect(screen.getByText('이우 A공장')).toBeTruthy()
    expect(screen.getByText('40개')).toBeTruthy()

    expect(screen.queryByRole('heading', { name: '재고 추이' })).toBeNull()
    expect(screen.queryByRole('heading', { name: '창고별 비교' })).toBeNull()
    expect(screen.queryByRole('heading', { name: '최근 처리 이력' })).toBeNull()
    expect(mocks.getOperationsDashboard).toHaveBeenCalledTimes(1)
  })
})

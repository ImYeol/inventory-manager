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

function makeExcelFile() {
  const workbook = XLSX.utils.book_new()
  const worksheet = XLSX.utils.aoa_to_sheet([
    ['운송장번호', '받는분', '주소'],
    ['123456789', '홍길동', '서울특별시'],
    ['987654321', '김철수', '부산'],
  ])
  XLSX.utils.book_append_sheet(workbook, worksheet, '시트1')
  const arrayBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' })

  return new File([arrayBuffer], '운송장.xlsx', {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  })
}

describe('ShippingView', () => {
  it('shows a blocking empty state when both provider keys are missing', () => {
    render(
      React.createElement(ShippingView, {
        settingsSummary: {
          naver: { configured: false, masked: {}, updatedAt: null },
          coupang: { configured: false, masked: {}, updatedAt: null },
        },
      })
    )

    expect(screen.getByText('운송장 엑셀 업로드')).toBeTruthy()
    expect(screen.getByText('API 연동 준비가 필요합니다.')).toBeTruthy()
    expect(screen.getByText(/스토어 연결에서 네이버와 쿠팡 API 키를 저장한 뒤 다시 업로드하세요/)).toBeTruthy()
    expect(screen.getByText('엑셀 업로드')).toBeTruthy()
    expect(screen.getByLabelText('운송장 엑셀 업로드')).toBeTruthy()
    expect(screen.getAllByRole('link', { name: '스토어 연결로 이동' }).length).toBeGreaterThan(0)
  })

  it('keeps the upload flow available for configured providers while surfacing partial setup gaps', () => {
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

    expect(screen.getByText('일부 연동만 완료되었습니다.')).toBeTruthy()
    expect(screen.getByText(/설정된 채널만 주문을 조회할 수 있습니다/)).toBeTruthy()
    expect(screen.getByText('엑셀 업로드')).toBeTruthy()
    expect(screen.getByText('쿠팡 API 키를 먼저 연결하세요.')).toBeTruthy()
    expect(screen.getByRole('link', { name: '쿠팡 연결하기' })).toBeTruthy()
  })

  it('handles drag-and-drop upload and renders 엑셀뷰 table from uploaded sheet', async () => {
    shippingActions.fetchNaverOrders.mockResolvedValue({
      success: true,
      orders: [],
    })
    shippingActions.fetchCoupangOrders.mockResolvedValue({
      success: true,
      orders: [],
    })

    render(
      React.createElement(ShippingView, {
        settingsSummary: {
          naver: { configured: true, masked: { clientId: 'naver-••••' }, updatedAt: '2026-04-12T09:00:00.000Z' },
          coupang: { configured: true, masked: { accessKey: 'cp-••••', vendorId: 'v-••' }, updatedAt: '2026-04-12T10:00:00.000Z' },
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
      expect(screen.getByRole('cell', { name: '서울특별시' })).toBeTruthy()
    })

    expect(screen.getByText('운송장번호')).toBeTruthy()
    expect(screen.getByText('받는분')).toBeTruthy()
    expect(screen.getByText('123456789')).toBeTruthy()
  })
})

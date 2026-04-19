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
  it('surfaces readiness state without blocking upload when both provider keys are missing', () => {
    render(
      React.createElement(ShippingView, {
        settingsSummary: {
          naver: { configured: false, masked: {}, updatedAt: null },
          coupang: { configured: false, masked: {}, updatedAt: null },
        },
      })
    )

    expect(screen.getByText('운송장 엑셀 업로드')).toBeTruthy()
    expect(screen.getByText('연동 준비 상태')).toBeTruthy()
    expect(
      screen.getByText('연결 준비와 키 관리는 스토어 연결에서만 처리합니다. 여기서는 업로드와 발송만 진행합니다.')
    ).toBeTruthy()
    expect(screen.getByText('엑셀 업로드')).toBeTruthy()
    expect(screen.getByLabelText('운송장 엑셀 업로드')).toBeTruthy()
    expect(screen.getByRole('link', { name: '스토어 연결로 이동' }).getAttribute('href')).toBe('/integrations')
    expect(screen.queryByLabelText('네이버 Client ID')).toBeNull()
    expect(screen.queryByLabelText('쿠팡 Access Key')).toBeNull()
    expect(screen.queryByText('네이버 저장')).toBeNull()
    expect(screen.queryByText('쿠팡 저장')).toBeNull()
  })

  it('keeps the upload flow execution-focused while surfacing partial setup gaps', () => {
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

    expect(screen.getByText('연동 준비 상태')).toBeTruthy()
    expect(
      screen.getByText('연결 준비와 키 관리는 스토어 연결에서만 처리합니다. 여기서는 업로드와 발송만 진행합니다.')
    ).toBeTruthy()
    expect(screen.getAllByText('네이버 연결됨').length).toBeGreaterThan(0)
    expect(screen.getAllByText('쿠팡 미연결').length).toBeGreaterThan(0)
    expect(screen.getByRole('link', { name: '스토어 연결로 이동' }).getAttribute('href')).toBe('/integrations')
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

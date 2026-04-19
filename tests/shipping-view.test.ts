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
    expect(screen.getByRole('link', { name: /네이버 연결/ }).getAttribute('href')).toBe('/settings?section=store-connections&provider=naver')
    expect(screen.getByRole('link', { name: /쿠팡 연결/ }).getAttribute('href')).toBe('/settings?section=store-connections&provider=coupang')
    expect(screen.getAllByLabelText('미연결')).toHaveLength(2)
    expect(screen.getByRole('combobox', { name: '분류 필터' }).className).not.toContain('bg-white')
  })

  it('shows provider change links for configured stores and keeps the compact status rail visible', () => {
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
    expect(screen.getByRole('link', { name: /네이버 변경/ }).getAttribute('href')).toBe('/settings?section=store-connections&provider=naver')
    expect(screen.getByRole('link', { name: /쿠팡 연결/ }).getAttribute('href')).toBe('/settings?section=store-connections&provider=coupang')
    expect(screen.getAllByLabelText('연결됨')).toHaveLength(1)
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
      expect(screen.getByRole('cell', { name: '네이버' })).toBeTruthy()
    })

    expect(screen.getByText('분류 미리보기')).toBeTruthy()
    expect(screen.getByRole('cell', { name: '홍길동' })).toBeTruthy()
    expect(screen.getByRole('cell', { name: '미분류' })).toBeTruthy()

    fireEvent.click(screen.getByRole('combobox', { name: '분류 필터' }))
    fireEvent.click(await screen.findByRole('option', { name: '미분류' }))

    expect(screen.queryByRole('cell', { name: '홍길동' })).toBeNull()
    expect(screen.getByRole('cell', { name: '김철수' })).toBeTruthy()
  })
})

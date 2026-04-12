// @vitest-environment jsdom
import React from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'

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
  fetchNaverOrders: vi.fn(),
  sendNaverTrackingNumbers: vi.fn(),
  fetchCoupangOrders: vi.fn(),
  sendCoupangTrackingNumbers: vi.fn(),
}))

import ShippingView from '@/app/(protected)/shipping/ShippingView'

afterEach(() => {
  cleanup()
})

describe('ShippingView', () => {
  it('shows a blocking empty state when both provider keys are missing', () => {
    render(
      React.createElement(ShippingView, {
        settingsSummary: {
          naver: { configured: false, updatedAt: null },
          coupang: { configured: false, masked: {}, updatedAt: null },
          naver: { configured: false, masked: {}, updatedAt: null },
        },
      })
    )

    expect(screen.getByText('API 연동 설정이 필요합니다.')).toBeTruthy()
    expect(screen.getByText(/엑셀 업로드만으로는 주문 목록을 불러올 수 없습니다/)).toBeTruthy()
    expect(screen.getAllByRole('link', { name: '설정으로 이동' }).length).toBeGreaterThan(0)
    expect(screen.queryByText('엑셀 업로드')).toBeNull()
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
    expect(screen.getByText('쿠팡 API 키를 먼저 설정하세요.')).toBeTruthy()
    expect(screen.getByRole('link', { name: '쿠팡 설정하기' })).toBeTruthy()
  })
})

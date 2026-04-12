// @vitest-environment jsdom
import React from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'

const mocks = vi.hoisted(() => ({
  getShippingSettingsSummary: vi.fn(),
  shippingView: vi.fn(),
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

vi.mock('@/lib/actions/shipping-settings', () => ({
  getShippingSettingsSummary: mocks.getShippingSettingsSummary,
}))

vi.mock('@/app/(protected)/shipping/ShippingView', () => ({
  default: (props: { settingsSummary: unknown }) => {
    mocks.shippingView(props)
    return React.createElement('div', {
      'data-testid': 'shipping-view',
      'data-summary': JSON.stringify(props.settingsSummary),
    })
  },
}))

import ShippingPage from '@/app/(protected)/shipping/page'

afterEach(() => {
  cleanup()
  mocks.getShippingSettingsSummary.mockReset()
  mocks.shippingView.mockReset()
})

describe('ShippingPage', () => {
  it('loads the summary from shipping-settings and passes it to ShippingView', async () => {
    const summary = {
      naver: {
        configured: true,
        masked: { clientId: 'nv-••••1234' },
        updatedAt: '2026-04-12T09:00:00.000Z',
      },
      coupang: {
        configured: true,
        masked: { accessKey: 'cp-••••1111', vendorId: 'V-••••22' },
        updatedAt: '2026-04-12T10:00:00.000Z',
      },
    }

    mocks.getShippingSettingsSummary.mockResolvedValue(summary)

    render(await ShippingPage())

    expect(mocks.getShippingSettingsSummary).toHaveBeenCalledTimes(1)
    expect(mocks.shippingView).toHaveBeenCalledWith(expect.objectContaining({ settingsSummary: summary }))
    expect(screen.getByRole('link', { name: '배송 연동 설정' }).getAttribute('href')).toBe('/settings')
    expect(screen.getByTestId('shipping-view').getAttribute('data-summary')).toBe(JSON.stringify(summary))
  })
})

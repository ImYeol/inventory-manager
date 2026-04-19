// @vitest-environment jsdom
import React from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'

const mocks = vi.hoisted(() => ({
  getShippingSettingsSummary: vi.fn(),
  integrationsView: vi.fn(),
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

vi.mock('@/app/(protected)/integrations/IntegrationsView', () => ({
  default: (props: { summary: unknown }) => {
    mocks.integrationsView(props)
    return React.createElement('div', {
      'data-testid': 'integrations-view',
      'data-summary': JSON.stringify(props.summary),
    })
  },
}))

import IntegrationsPage from '@/app/(protected)/integrations/page'

afterEach(() => {
  cleanup()
  mocks.getShippingSettingsSummary.mockReset()
  mocks.integrationsView.mockReset()
})

describe('IntegrationsPage', () => {
  it('loads shipping credentials summary and passes it to IntegrationsView', async () => {
    const summary = {
      naver: { configured: true, masked: { clientId: 'nv-••••1234' }, updatedAt: '2026-04-12T09:00:00.000Z' },
      coupang: {
        configured: true,
        masked: { accessKey: 'cp-••••1111', vendorId: 'V-••••22' },
        updatedAt: '2026-04-12T10:00:00.000Z',
      },
    }

    mocks.getShippingSettingsSummary.mockResolvedValue(summary)

    render(await IntegrationsPage())

    expect(mocks.getShippingSettingsSummary).toHaveBeenCalledTimes(1)
    expect(mocks.integrationsView).toHaveBeenCalledWith(expect.objectContaining({ summary }))
    expect(screen.getByRole('link', { name: '운송장 화면으로 이동' }).getAttribute('href')).toBe('/shipping')
    expect(screen.getByTestId('integrations-view')).toBeTruthy()
  })
})

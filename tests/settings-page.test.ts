// @vitest-environment jsdom
import React from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'

const mocks = vi.hoisted(() => ({
  getShippingSettingsSummary: vi.fn(),
  settingsView: vi.fn(),
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

vi.mock('@/app/(protected)/settings/SettingsView', () => ({
  default: (props: { summary: unknown }) => {
    mocks.settingsView(props)
    return React.createElement('div', {
      'data-testid': 'settings-view',
      'data-summary': JSON.stringify(props.summary),
    })
  },
}))

import SettingsPage from '@/app/(protected)/settings/page'

afterEach(() => {
  cleanup()
  mocks.getShippingSettingsSummary.mockReset()
  mocks.settingsView.mockReset()
})

describe('SettingsPage', () => {
  it('loads the summary from shipping-settings and passes the backend shape to the view', async () => {
    const summary = {
      naver: {
        configured: true,
        masked: { clientId: 'nv-••••1234' },
        updatedAt: '2026-04-12T09:00:00.000Z',
      },
      coupang: {
        configured: false,
        masked: {},
        updatedAt: null,
      },
    }

    mocks.getShippingSettingsSummary.mockResolvedValue(summary)

    render(await SettingsPage())

    expect(mocks.getShippingSettingsSummary).toHaveBeenCalledTimes(1)
    expect(mocks.settingsView).toHaveBeenCalledWith(expect.objectContaining({ summary }))
    expect(screen.getByRole('link', { name: '기준 데이터' }).getAttribute('href')).toBe('/settings/master-data')
    expect(screen.getByRole('link', { name: '운송장으로 돌아가기' }).getAttribute('href')).toBe('/shipping')
    expect(screen.getByRole('button', { name: '로그아웃' })).toBeTruthy()
    expect(screen.getByTestId('settings-view').getAttribute('data-summary')).toBe(JSON.stringify(summary))
  })
})

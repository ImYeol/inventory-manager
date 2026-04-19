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
  default: (props: unknown) => {
    mocks.settingsView(props)
    return React.createElement('div', {
      'data-testid': 'settings-view',
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
  it('renders the consolidated store-connection settings owner', async () => {
    const summary = {
      naver: { configured: false, masked: {}, updatedAt: null },
      coupang: { configured: true, masked: { accessKey: 'cp-••••', vendorId: 'V-••' }, updatedAt: '2026-04-12T10:00:00.000Z' },
    }
    mocks.getShippingSettingsSummary.mockResolvedValue(summary)

    render(await SettingsPage())

    expect(mocks.getShippingSettingsSummary).toHaveBeenCalledTimes(1)
    expect(mocks.settingsView).toHaveBeenCalledTimes(1)
    expect(mocks.settingsView).toHaveBeenCalledWith(expect.objectContaining({ summary }))
    expect(screen.queryByRole('link', { name: '기준 데이터' })).toBeNull()
    expect(screen.getByRole('heading', { name: '설정' })).toBeTruthy()
    expect(screen.getByRole('button', { name: '로그아웃' })).toBeTruthy()
    expect(screen.getByTestId('settings-view')).toBeTruthy()
  })

  it('forwards store-connection deep links to the settings view', async () => {
    const summary = {
      naver: { configured: true, masked: { clientId: 'nv-••••' }, updatedAt: '2026-04-12T10:00:00.000Z' },
      coupang: { configured: false, masked: {}, updatedAt: null },
    }
    mocks.getShippingSettingsSummary.mockResolvedValue(summary)

    render(await SettingsPage({ searchParams: Promise.resolve({ section: 'store-connections', provider: 'naver' }) }))

    expect(mocks.settingsView).toHaveBeenCalledWith(expect.objectContaining({ summary, focusProvider: 'naver' }))
  })
})

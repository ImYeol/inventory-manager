// @vitest-environment jsdom
import React from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'

const mocks = vi.hoisted(() => ({
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

vi.mock('@/app/(protected)/settings/SettingsView', () => ({
  default: () => {
    mocks.settingsView()
    return React.createElement('div', {
      'data-testid': 'settings-view',
    })
  },
}))

import SettingsPage from '@/app/(protected)/settings/page'

afterEach(() => {
  cleanup()
  mocks.settingsView.mockReset()
})

describe('SettingsPage', () => {
  it('renders the admin hub entry point and points store connections to /integrations', async () => {
    render(await SettingsPage())

    expect(mocks.settingsView).toHaveBeenCalledTimes(1)
    expect(screen.getByRole('link', { name: '기준 데이터' }).getAttribute('href')).toBe('/settings/master-data')
    expect(screen.getByText('기준 데이터와 관리자 진입점만 제공합니다. 스토어 연결은 `/integrations`에서 관리합니다.')).toBeTruthy()
    expect(screen.getByRole('button', { name: '로그아웃' })).toBeTruthy()
    expect(screen.getByTestId('settings-view')).toBeTruthy()
  })
})

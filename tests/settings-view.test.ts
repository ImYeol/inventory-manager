// @vitest-environment jsdom
import React from 'react'
import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'

import SettingsView from '@/app/(protected)/settings/SettingsView'

afterEach(() => {
  cleanup()
})

describe('SettingsView', () => {
  it('renders store connections directly inside settings as the canonical owner', () => {
    render(
      React.createElement(SettingsView, {
        summary: {
          naver: {
            configured: false,
            masked: {},
            updatedAt: null,
          },
          coupang: {
            configured: true,
            masked: { accessKey: 'cp-••••1111', vendorId: 'V-••••22' },
            updatedAt: '2026-04-11T08:30:00.000Z',
          },
        },
      }),
    )

    expect(screen.queryByText('설정은 기준 데이터와 운영 진입점만 제공합니다.')).toBeNull()
    expect(screen.getAllByRole('heading', { name: '네이버' })).toHaveLength(2)
    expect(screen.getAllByRole('heading', { name: '쿠팡' })).toHaveLength(2)
    expect(screen.getByRole('link', { name: '연결' }).getAttribute('href')).toBe('#naver-settings')
    expect(screen.getByRole('link', { name: '변경' }).getAttribute('href')).toBe('#coupang-settings')
    expect(screen.getByRole('button', { name: '네이버 저장' })).toBeTruthy()
    expect(screen.getByRole('button', { name: '쿠팡 저장' })).toBeTruthy()
    expect(screen.getByLabelText('네이버 Client ID')).toBeTruthy()
    expect(screen.getByLabelText('쿠팡 Access Key')).toBeTruthy()
  })
})

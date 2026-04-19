// @vitest-environment jsdom
import React from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'

const mocks = vi.hoisted(() => ({
  getShippingSettingsSummary: vi.fn(),
  saveNaverSettings: vi.fn(),
  saveCoupangSettings: vi.fn(),
}))

vi.mock('@/lib/actions/shipping-settings', () => mocks)

import SettingsView from '@/app/(protected)/settings/SettingsView'

afterEach(() => {
  cleanup()
  mocks.getShippingSettingsSummary.mockReset()
  mocks.saveNaverSettings.mockReset()
  mocks.saveCoupangSettings.mockReset()
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
    expect(screen.getAllByRole('heading', { name: '네이버' })).toHaveLength(1)
    expect(screen.getAllByRole('heading', { name: '쿠팡' })).toHaveLength(1)
    expect(screen.getAllByText('미연결')).toHaveLength(1)
    expect(screen.getAllByText('연결됨')).toHaveLength(1)
    const naverCard = screen.getByRole('heading', { name: '네이버' }).closest('section')
    const coupangCard = screen.getByRole('heading', { name: '쿠팡' }).closest('section')
    expect(naverCard).toBeTruthy()
    expect(coupangCard).toBeTruthy()
    expect(naverCard?.className).toContain('ui-card-strong')
    expect(coupangCard?.className).toContain('ui-card-strong')
    expect(naverCard?.className).toContain('overflow-hidden')
    expect(coupangCard?.className).toContain('overflow-hidden')
    expect(within(naverCard as HTMLElement).getByRole('button', { name: '네이버 저장' })).toBeTruthy()
    expect(within(coupangCard as HTMLElement).getByRole('button', { name: '쿠팡 저장' })).toBeTruthy()
    expect(screen.queryByRole('link', { name: '연결' })).toBeNull()
    expect(screen.queryByRole('link', { name: '변경' })).toBeNull()
    expect(screen.getByLabelText('네이버 Client ID')).toBeTruthy()
    expect(screen.getByLabelText('쿠팡 Access Key')).toBeTruthy()
    expect(screen.queryByText('네이버와 쿠팡 연결 정보를 이 화면에서 관리합니다.')).toBeNull()
  })

  it('saves from the section header and refreshes the summary status', async () => {
    mocks.saveNaverSettings.mockResolvedValue({ success: true })
    mocks.getShippingSettingsSummary.mockResolvedValue({
      naver: {
        configured: true,
        masked: { clientId: 'nv-••••1234' },
        updatedAt: '2026-04-12T11:00:00.000Z',
      },
      coupang: {
        configured: false,
        masked: {},
        updatedAt: null,
      },
    })

    render(
      React.createElement(SettingsView, {
        summary: {
          naver: { configured: false, masked: {}, updatedAt: null },
          coupang: { configured: false, masked: {}, updatedAt: null },
        },
      }),
    )

    fireEvent.change(screen.getByLabelText('네이버 Client ID'), { target: { value: 'client-id' } })
    fireEvent.change(screen.getByLabelText('네이버 Client Secret'), { target: { value: 'client-secret' } })

    const naverSection = screen.getByRole('heading', { name: '네이버' }).closest('section')
    expect(naverSection).toBeTruthy()

    expect(within(naverSection as HTMLElement).getAllByRole('button', { name: '네이버 저장' })).toHaveLength(1)
    fireEvent.click(within(naverSection as HTMLElement).getByRole('button', { name: '네이버 저장' }))

    await waitFor(() => {
      expect(mocks.saveNaverSettings).toHaveBeenCalledWith({
        clientId: 'client-id',
        clientSecret: 'client-secret',
      })
    })

    expect(await screen.findByText('네이버 API 정보를 저장했습니다.')).toBeTruthy()
    expect(screen.getByText('nv-••••1234')).toBeTruthy()
    expect(within(naverSection as HTMLElement).getByText('연결됨')).toBeTruthy()
  })
})

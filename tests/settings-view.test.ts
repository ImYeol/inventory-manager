// @vitest-environment jsdom
import React from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'

const mocks = vi.hoisted(() => ({
  saveNaverSettings: vi.fn(),
  saveCoupangSettings: vi.fn(),
  getShippingSettingsSummary: vi.fn(),
}))

vi.mock('@/lib/actions/shipping-settings', () => mocks)

import SettingsView from '@/app/(protected)/settings/SettingsView'

beforeEach(() => {
  mocks.saveNaverSettings.mockReset()
  mocks.saveCoupangSettings.mockReset()
  mocks.getShippingSettingsSummary.mockReset()
})

afterEach(() => {
  cleanup()
})

describe('SettingsView', () => {
  it('renders masked summaries without pre-filling saved secrets', () => {
    render(
      React.createElement(SettingsView, {
        summary: {
          naver: {
            configured: true,
            masked: { clientId: 'nv-••••1234' },
            updatedAt: '2026-04-12T09:00:00.000Z',
          },
          coupang: {
            configured: true,
            masked: {
              accessKey: 'cp-••••1111',
              vendorId: 'V-••••22',
            },
            updatedAt: '2026-04-11T08:30:00.000Z',
          },
        },
      })
    )

    expect(screen.getByText('저장된 값은 다시 표시되지 않습니다.')).toBeTruthy()
    expect(screen.getByText('nv-••••1234')).toBeTruthy()
    expect(screen.getByText('cp-••••1111')).toBeTruthy()
    expect((screen.getByLabelText('네이버 Client ID') as HTMLInputElement).value).toBe('')
    expect((screen.getByLabelText('네이버 Client Secret') as HTMLInputElement).value).toBe('')
  })

  it('submits replacement values and refreshes the masked summary', async () => {
    mocks.saveNaverSettings.mockResolvedValue({ success: true })
    mocks.getShippingSettingsSummary.mockResolvedValue({
      naver: {
        configured: true,
        masked: { clientId: 'nv-••••5678' },
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
      })
    )

    fireEvent.change(screen.getByLabelText('네이버 Client ID'), {
      target: { value: 'new-client-id' },
    })
    fireEvent.change(screen.getByLabelText('네이버 Client Secret'), {
      target: { value: 'new-client-secret' },
    })
    fireEvent.click(screen.getByRole('button', { name: '네이버 저장' }))

    await waitFor(() => {
      expect(mocks.saveNaverSettings).toHaveBeenCalledWith({
        clientId: 'new-client-id',
        clientSecret: 'new-client-secret',
      })
    })

    expect(await screen.findByText('네이버 API 정보를 저장했습니다.')).toBeTruthy()
    expect(screen.getByText('nv-••••5678')).toBeTruthy()
    expect((screen.getByLabelText('네이버 Client ID') as HTMLInputElement).value).toBe('')
  })
})

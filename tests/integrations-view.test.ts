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

import IntegrationsView from '@/app/(protected)/integrations/IntegrationsView'

beforeEach(() => {
  mocks.saveNaverSettings.mockReset()
  mocks.saveCoupangSettings.mockReset()
  mocks.getShippingSettingsSummary.mockReset()
})

afterEach(() => {
  cleanup()
})

describe('IntegrationsView', () => {
  it('renders masked summaries and keeps inputs empty', () => {
    render(
      React.createElement(IntegrationsView, {
        summary: {
          naver: {
            configured: true,
            masked: { clientId: 'nv-••••1234' },
            updatedAt: '2026-04-12T09:00:00.000Z',
          },
          coupang: {
            configured: true,
            masked: { accessKey: 'cp-••••1111', vendorId: 'V-••••22' },
            updatedAt: '2026-04-11T08:30:00.000Z',
          },
        },
      })
    )

    expect(screen.getByText('nv-••••1234')).toBeTruthy()
    expect(screen.getByText('cp-••••1111')).toBeTruthy()
    expect(screen.getByText('V-••••22')).toBeTruthy()
    expect((screen.getByLabelText('네이버 Client ID') as HTMLInputElement).value).toBe('')
    expect((screen.getByLabelText('쿠팡 Access Key') as HTMLInputElement).value).toBe('')
  })

  it('submits replacement values and refreshes the masked summary', async () => {
    mocks.saveNaverSettings.mockResolvedValue({ success: true })
    mocks.getShippingSettingsSummary.mockResolvedValue({
      naver: {
        configured: true,
        masked: { clientId: 'nv-••••5678' },
        updatedAt: '2026-04-12T11:00:00.000Z',
      },
      coupang: { configured: false, masked: {}, updatedAt: null },
    })

    render(
      React.createElement(IntegrationsView, {
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

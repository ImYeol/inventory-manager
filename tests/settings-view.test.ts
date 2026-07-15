// @vitest-environment jsdom
import React from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'

const mocks = vi.hoisted(() => ({
  getShippingSettingsSummary: vi.fn(),
  deleteShippingProviderCredentials: vi.fn(),
  saveNaverSettings: vi.fn(),
  saveCoupangSettings: vi.fn(),
}))

vi.mock('@/lib/actions/shipping-settings', () => mocks)

import SettingsView from '@/app/(protected)/settings/SettingsView'

afterEach(() => {
  cleanup()
  mocks.getShippingSettingsSummary.mockReset()
  mocks.deleteShippingProviderCredentials.mockReset()
  mocks.saveNaverSettings.mockReset()
  mocks.saveCoupangSettings.mockReset()
})

describe('SettingsView', () => {
  it('shows configured providers as masked summaries with one concise deletion action each', () => {
    render(
      React.createElement(SettingsView, {
        summary: {
          naver: {
            configured: true,
            masked: { clientId: 'nv-••••1234' },
            updatedAt: '2026-04-12T11:00:00.000Z',
          },
          coupang: {
            configured: true,
            masked: {
              accessKey: 'cp-••••1111',
              vendorId: 'V-••••22',
              defaultDeliveryCompanyCode: 'CJGLS',
            },
            updatedAt: '2026-04-11T08:30:00.000Z',
          },
        },
      }),
    )

    expect(screen.queryByText('설정은 기준 데이터와 운영 진입점만 제공합니다.')).toBeNull()
    expect(screen.getAllByRole('heading', { name: '네이버' })).toHaveLength(1)
    expect(screen.getAllByRole('heading', { name: '쿠팡' })).toHaveLength(1)
    expect(screen.getAllByText('연결됨')).toHaveLength(2)
    const naverCard = screen.getByRole('heading', { name: '네이버' }).closest('section')
    const coupangCard = screen.getByRole('heading', { name: '쿠팡' }).closest('section')
    expect(naverCard).toBeTruthy()
    expect(coupangCard).toBeTruthy()
    expect(naverCard?.className).toContain('ui-card-strong')
    expect(coupangCard?.className).toContain('ui-card-strong')
    expect(naverCard?.className).toContain('overflow-hidden')
    expect(coupangCard?.className).toContain('overflow-hidden')
    expect(within(naverCard as HTMLElement).getByText('nv-••••1234')).toBeTruthy()
    expect(within(coupangCard as HTMLElement).getByText('cp-••••1111')).toBeTruthy()
    const naverSummary = within(naverCard as HTMLElement).getByText('nv-••••1234').closest('dl')
    const coupangSummary = within(coupangCard as HTMLElement).getByText('cp-••••1111').closest('dl')
    expect(naverSummary?.parentElement?.className).toContain('ui-card-body')
    expect(coupangSummary?.parentElement?.className).toContain('ui-card-body')
    expect(naverSummary?.parentElement?.className).not.toContain('pt-0')
    expect(coupangSummary?.parentElement?.className).not.toContain('pt-0')
    expect(within(naverCard as HTMLElement).getAllByRole('button', { name: '삭제' })).toHaveLength(1)
    expect(within(coupangCard as HTMLElement).getAllByRole('button', { name: '삭제' })).toHaveLength(1)
    expect(screen.getAllByRole('button', { name: '삭제' })).toHaveLength(2)
    expect(screen.queryByRole('button', { name: '네이버 연결 해제' })).toBeNull()
    expect(screen.queryByRole('button', { name: '쿠팡 연결 해제' })).toBeNull()
    expect(within(naverCard as HTMLElement).queryByRole('button', { name: '네이버 저장' })).toBeNull()
    expect(within(coupangCard as HTMLElement).queryByRole('button', { name: '쿠팡 저장' })).toBeNull()
    expect(screen.queryByRole('link', { name: '연결' })).toBeNull()
    expect(screen.queryByRole('link', { name: '변경' })).toBeNull()
    expect(screen.queryByLabelText('네이버 Client ID')).toBeNull()
    expect(screen.queryByLabelText('네이버 Client Secret')).toBeNull()
    expect(screen.queryByLabelText('쿠팡 Access Key')).toBeNull()
    expect(screen.queryByLabelText('쿠팡 Secret Key')).toBeNull()
    expect(screen.queryByLabelText('쿠팡 Vendor ID')).toBeNull()
    expect(screen.queryByLabelText('쿠팡 기본 택배사 코드')).toBeNull()
    expect(screen.getByText('CJGLS')).toBeTruthy()
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

    expect(screen.getByText('nv-••••1234')).toBeTruthy()
    expect(within(naverSection as HTMLElement).getByText('연결됨')).toBeTruthy()
    expect(within(naverSection as HTMLElement).getByRole('button', { name: '삭제' })).toBeTruthy()
    expect(within(naverSection as HTMLElement).queryByLabelText('네이버 Client ID')).toBeNull()
  })

  it('shows the safe server encryption setup guidance without exposing the environment variable name', async () => {
    mocks.saveNaverSettings.mockResolvedValue({
      success: false,
      error: '저장소 보안 설정이 필요합니다. 배포 환경의 서버 전용 암호화 키를 설정한 뒤 다시 시도해주세요.',
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
    fireEvent.click(screen.getByRole('button', { name: '네이버 저장' }))

    expect(await screen.findByText('저장소 보안 설정이 필요합니다. 배포 환경의 서버 전용 암호화 키를 설정한 뒤 다시 시도해주세요.')).toBeTruthy()
    expect(screen.queryByText(/SHIPPING_CREDENTIALS_ENCRYPTION_KEY/)).toBeNull()
    expect(screen.queryByText('client-secret')).toBeNull()
  })

  it('requires confirmation before removing a configured provider and refreshes its summary', async () => {
    mocks.deleteShippingProviderCredentials.mockResolvedValue({ success: true })
    mocks.getShippingSettingsSummary.mockResolvedValue({
      naver: { configured: false, masked: {}, updatedAt: null },
      coupang: { configured: false, masked: {}, updatedAt: null },
    })

    render(
      React.createElement(SettingsView, {
        summary: {
          naver: {
            configured: true,
            masked: { clientId: 'nv-••••1234' },
            updatedAt: '2026-04-12T11:00:00.000Z',
          },
          coupang: { configured: false, masked: {}, updatedAt: null },
        },
      }),
    )

    fireEvent.click(screen.getByRole('button', { name: '삭제' }))

    expect(mocks.deleteShippingProviderCredentials).not.toHaveBeenCalled()
    const dialog = screen.getByRole('dialog')
    expect(within(dialog).getByText('네이버 연결을 해제할까요?')).toBeTruthy()

    fireEvent.click(within(dialog).getByRole('button', { name: '삭제' }))

    await waitFor(() => {
      expect(mocks.deleteShippingProviderCredentials).toHaveBeenCalledWith('naver')
    })

    expect(await screen.findByText('네이버 연결을 해제했습니다.')).toBeTruthy()
    expect(screen.queryByRole('dialog')).toBeNull()
    expect((screen.getByLabelText('네이버 Client ID') as HTMLInputElement).value).toBe('')
    expect(screen.getByRole('button', { name: '네이버 저장' })).toBeTruthy()
    const naverSection = screen.getByRole('heading', { name: '네이버' }).closest('section')
    expect(within(naverSection as HTMLElement).getByText('미연결')).toBeTruthy()
  })
})

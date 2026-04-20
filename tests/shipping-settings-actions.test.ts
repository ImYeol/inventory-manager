import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  getSupabaseWithUser: vi.fn(),
}))

vi.mock('@/lib/db', () => ({
  getSupabaseWithUser: mocks.getSupabaseWithUser,
}))

import {
  getShippingSettingsSummary,
  saveCoupangSettings,
  saveNaverSettings,
} from '@/lib/actions/shipping-settings'

type CredentialsRow = {
  provider: 'naver' | 'coupang'
  masked_summary: Record<string, string>
  updated_at: string
}

function createSupabaseMock(initialRows: CredentialsRow[] = []) {
  let rows = [...initialRows]

  const query = {
    select: vi.fn(async () => ({ data: rows, error: null })),
    upsert: vi.fn(async (payload: Record<string, unknown>) => {
      const nextRow = {
        provider: payload.provider as 'naver' | 'coupang',
        masked_summary: payload.masked_summary as Record<string, string>,
        updated_at: '2026-04-12T09:00:00.000Z',
      }

      rows = [...rows.filter((row) => row.provider !== nextRow.provider), nextRow]
      return { data: null, error: null }
    }),
  }

  return {
    from: vi.fn((table: string) => {
      expect(table).toBe('shipping_provider_credentials')
      return query
    }),
    query,
  }
}

beforeEach(() => {
  mocks.getSupabaseWithUser.mockReset()
  process.env.SHIPPING_CREDENTIALS_ENCRYPTION_KEY = 'test-shipping-key'
})

afterEach(() => {
  mocks.getSupabaseWithUser.mockReset()
  delete process.env.SHIPPING_CREDENTIALS_ENCRYPTION_KEY
})

describe('shipping settings server actions', () => {
  it('returns a summary with configured flags and masked metadata', async () => {
    const { from } = createSupabaseMock([
      {
        provider: 'naver',
        masked_summary: { clientId: 'na********34' },
        updated_at: '2026-04-12T09:00:00.000Z',
      },
    ])

    mocks.getSupabaseWithUser.mockResolvedValue({
      supabase: { from },
      user: { id: 'user-1' },
    })

    await expect(getShippingSettingsSummary()).resolves.toEqual({
      naver: {
        configured: true,
        masked: { clientId: 'na********34' },
        updatedAt: '2026-04-12T09:00:00.000Z',
      },
      coupang: {
        configured: false,
        masked: {},
        updatedAt: null,
      },
    })
  })

  it('treats missing masked values as not configured even when a credential row exists', async () => {
    const { from } = createSupabaseMock([
      {
        provider: 'naver',
        masked_summary: {},
        updated_at: '2026-04-12T09:00:00.000Z',
      },
    ])

    mocks.getSupabaseWithUser.mockResolvedValue({
      supabase: { from },
      user: { id: 'user-1' },
    })

    await expect(getShippingSettingsSummary()).resolves.toEqual({
      naver: {
        configured: false,
        masked: {},
        updatedAt: null,
      },
      coupang: {
        configured: false,
        masked: {},
        updatedAt: null,
      },
    })
  })

  it('validates, encrypts, and stores naver credentials from typed input', async () => {
    const supabase = createSupabaseMock()

    mocks.getSupabaseWithUser.mockResolvedValue({
      supabase: { from: supabase.from },
      user: { id: 'user-1' },
    })

    await expect(
      saveNaverSettings({
        clientId: 'naver-client-id-1234',
        clientSecret: 'naver-secret',
      })
    ).resolves.toEqual({
      success: true,
      summary: {
        configured: true,
        masked: { clientId: 'na****************34' },
        updatedAt: '2026-04-12T09:00:00.000Z',
      },
    })

    expect(supabase.query.upsert).toHaveBeenCalledTimes(1)
    const [payload] = supabase.query.upsert.mock.calls[0]
    expect(payload).toMatchObject({
      user_id: 'user-1',
      provider: 'naver',
      key_version: 1,
      masked_summary: { clientId: 'na****************34' },
    })
    expect(payload.encrypted_payload).toEqual(expect.any(String))
    expect(payload.iv).toEqual(expect.any(String))
    expect(payload.auth_tag).toEqual(expect.any(String))
    expect(String(payload.encrypted_payload)).not.toContain('naver-secret')
  })

  it('accepts form data and stores coupang credentials with masked metadata', async () => {
    const supabase = createSupabaseMock()
    const formData = new FormData()
    formData.set('accessKey', 'coupang-access-1234')
    formData.set('secretKey', 'coupang-secret')
    formData.set('vendorId', 'A12345678')
    formData.set('defaultDeliveryCompanyCode', 'CJGLS')

    mocks.getSupabaseWithUser.mockResolvedValue({
      supabase: { from: supabase.from },
      user: { id: 'user-1' },
    })

    await expect(saveCoupangSettings(formData)).resolves.toEqual({
      success: true,
      summary: {
        configured: true,
        masked: {
          accessKey: 'co***************34',
          vendorId: 'A1*****78',
          defaultDeliveryCompanyCode: 'CJGLS',
        },
        updatedAt: '2026-04-12T09:00:00.000Z',
      },
    })

    expect(supabase.query.upsert).toHaveBeenCalledTimes(1)
    const [payload] = supabase.query.upsert.mock.calls[0]
    expect(payload).toMatchObject({
      user_id: 'user-1',
      provider: 'coupang',
      key_version: 1,
      masked_summary: {
        accessKey: 'co***************34',
        vendorId: 'A1*****78',
        defaultDeliveryCompanyCode: 'CJGLS',
      },
    })
  })

  it('rejects invalid settings payloads with a user-facing error', async () => {
    const supabase = createSupabaseMock()

    mocks.getSupabaseWithUser.mockResolvedValue({
      supabase: { from: supabase.from },
      user: { id: 'user-1' },
    })

    await expect(
      saveCoupangSettings({
        accessKey: 'access-only',
        secretKey: '',
        vendorId: '',
        defaultDeliveryCompanyCode: '',
      })
    ).resolves.toEqual({
      success: false,
      error: '쿠팡 API 키 정보를 모두 입력해주세요.',
    })

    expect(supabase.query.upsert).not.toHaveBeenCalled()
  })
})

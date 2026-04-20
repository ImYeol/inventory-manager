import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  createSupabaseServerClient: vi.fn(),
}))

vi.mock('@/lib/supabase/server', () => ({
  createSupabaseServerClient: mocks.createSupabaseServerClient,
}))

import { GET } from '@/app/auth/callback/route'

beforeEach(() => {
  mocks.createSupabaseServerClient.mockReset()
})

describe('auth callback route', () => {
  it('keeps http for forwarded localhost callbacks', async () => {
    const exchangeCodeForSession = vi.fn().mockResolvedValue({ error: null })
    mocks.createSupabaseServerClient.mockResolvedValue({
      auth: {
        exchangeCodeForSession,
      },
    })

    const request = new Request('http://localhost:3000/auth/callback?code=test-code', {
      headers: new Headers({
        'x-forwarded-host': 'localhost:3000',
        'x-forwarded-proto': 'http',
      }),
    })

    const response = await GET(request)

    expect(exchangeCodeForSession).toHaveBeenCalledWith('test-code')
    expect(response.headers.get('location')).toBe('http://localhost:3000/')
  })

  it('falls back to the request origin when forwarded proto is missing', async () => {
    const exchangeCodeForSession = vi.fn().mockResolvedValue({ error: null })
    mocks.createSupabaseServerClient.mockResolvedValue({
      auth: {
        exchangeCodeForSession,
      },
    })

    const request = new Request('http://localhost:3000/auth/callback?code=test-code', {
      headers: new Headers({
        'x-forwarded-host': 'localhost:3000',
      }),
    })

    const response = await GET(request)

    expect(response.headers.get('location')).toBe('http://localhost:3000/')
  })
})

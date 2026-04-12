import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  cookies: vi.fn(),
  createServerClient: vi.fn(),
}))

vi.mock('next/headers', () => ({
  cookies: mocks.cookies,
}))

vi.mock('@supabase/ssr', () => ({
  createServerClient: mocks.createServerClient,
}))

import { createSupabaseServerClient } from '@/lib/supabase/server'

const originalEnv = {
  NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
  NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
}

beforeEach(() => {
  mocks.cookies.mockReset()
  mocks.createServerClient.mockReset()
  process.env.NEXT_PUBLIC_SUPABASE_URL = originalEnv.NEXT_PUBLIC_SUPABASE_URL
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = originalEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY
})

afterEach(() => {
  process.env.NEXT_PUBLIC_SUPABASE_URL = originalEnv.NEXT_PUBLIC_SUPABASE_URL
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = originalEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY
})

describe('createSupabaseServerClient', () => {
  it('throws when the public Supabase env vars are missing', async () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = ''
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = ''
    mocks.cookies.mockResolvedValue({
      getAll: vi.fn(),
      set: vi.fn(),
    })

    await expect(createSupabaseServerClient()).rejects.toThrow(
      'Missing Supabase environment variables.'
    )
  })

  it('passes the Supabase URL, anon key, and cookie bridge to createServerClient', async () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://example.supabase.co'
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'anon-key'

    const cookieStore = {
      getAll: vi.fn().mockReturnValue([
        { name: 'sb-session', value: 'cookie-value', options: { path: '/' } },
      ]),
      set: vi.fn(),
    }
    mocks.cookies.mockResolvedValue(cookieStore)
    mocks.createServerClient.mockReturnValue({ auth: {} })

    await createSupabaseServerClient()

    expect(mocks.createServerClient).toHaveBeenCalledWith(
      'https://example.supabase.co',
      'anon-key',
      expect.objectContaining({
        cookies: expect.objectContaining({
          getAll: expect.any(Function),
          setAll: expect.any(Function),
        }),
      })
    )

    const [, , options] = mocks.createServerClient.mock.calls[0]
    expect(options.cookies.getAll()).toEqual([
      { name: 'sb-session', value: 'cookie-value', options: { path: '/' } },
    ])

    options.cookies.setAll([
      { name: 'sb-session', value: 'updated', options: { path: '/' } },
    ])
    expect(cookieStore.set).toHaveBeenCalledWith('sb-session', 'updated', { path: '/' })
  })
})

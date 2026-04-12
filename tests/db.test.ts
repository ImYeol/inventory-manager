import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  createSupabaseServerClient: vi.fn(),
}))

vi.mock('@/lib/supabase/server', () => ({
  createSupabaseServerClient: mocks.createSupabaseServerClient,
}))

import { getSupabaseWithUser } from '@/lib/db'

beforeEach(() => {
  mocks.createSupabaseServerClient.mockReset()
})

afterEach(() => {
  mocks.createSupabaseServerClient.mockReset()
})

describe('getSupabaseWithUser', () => {
  it('returns the supabase client and authenticated user', async () => {
    const getUser = vi.fn().mockResolvedValue({
      data: { user: { id: 'user-1' } },
      error: null,
    })

    mocks.createSupabaseServerClient.mockResolvedValue({
      auth: { getUser },
    })

    await expect(getSupabaseWithUser()).resolves.toEqual({
      supabase: { auth: { getUser } },
      user: { id: 'user-1' },
    })
  })

  it('rejects requests without an authenticated user', async () => {
    const getUser = vi.fn().mockResolvedValue({
      data: { user: null },
      error: null,
    })

    mocks.createSupabaseServerClient.mockResolvedValue({
      auth: { getUser },
    })

    await expect(getSupabaseWithUser()).rejects.toThrow('Authentication is required.')
  })
})

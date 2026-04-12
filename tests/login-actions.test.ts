import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  redirect: vi.fn(),
  headers: vi.fn(),
  createSupabaseServerClient: vi.fn(),
}))

vi.mock('next/navigation', () => ({
  redirect: mocks.redirect,
}))

vi.mock('next/headers', () => ({
  headers: mocks.headers,
}))

vi.mock('@/lib/supabase/server', () => ({
  createSupabaseServerClient: mocks.createSupabaseServerClient,
}))

import { loginWithGoogle, logout } from '@/app/login/actions'

beforeEach(() => {
  mocks.redirect.mockReset()
  mocks.headers.mockReset()
  mocks.createSupabaseServerClient.mockReset()
  mocks.headers.mockResolvedValue({
    get: vi.fn().mockImplementation((key: string) =>
      key === 'origin' ? 'https://example.com' : null,
    ),
  })
})

afterEach(() => {
  mocks.redirect.mockReset()
  mocks.headers.mockReset()
  mocks.createSupabaseServerClient.mockReset()
})

describe('loginWithGoogle action', () => {
  it('starts the Google OAuth flow and redirects on success', async () => {
    const signInWithOAuth = vi.fn().mockResolvedValue({
      data: { url: 'https://accounts.google.com/o/oauth2/auth' },
      error: null,
    })
    mocks.createSupabaseServerClient.mockResolvedValue({
      auth: {
        signInWithOAuth,
        signOut: vi.fn(),
      },
    })

    await loginWithGoogle({})

    expect(mocks.createSupabaseServerClient).toHaveBeenCalled()
    expect(mocks.headers).toHaveBeenCalled()
    expect(signInWithOAuth).toHaveBeenCalledWith({
      provider: 'google',
      options: {
        redirectTo: 'https://example.com/auth/callback',
      },
    })
    expect(mocks.redirect).toHaveBeenCalledWith('https://accounts.google.com/o/oauth2/auth')
  })

  it('returns a friendly error when Google OAuth link creation fails', async () => {
    const signInWithOAuth = vi.fn().mockResolvedValue({
      data: null,
      error: new Error('bad oauth'),
    })
    mocks.createSupabaseServerClient.mockResolvedValue({
      auth: {
        signInWithOAuth,
        signOut: vi.fn(),
      },
    })

    await expect(loginWithGoogle({})).resolves.toEqual({
      error: 'Google 로그인 링크 생성에 실패했습니다. 잠시 후 다시 시도하세요.',
    })
    expect(mocks.redirect).not.toHaveBeenCalled()
  })

  it('returns a friendly error when Supabase does not return an OAuth URL', async () => {
    const signInWithOAuth = vi.fn().mockResolvedValue({
      data: {},
      error: null,
    })
    mocks.createSupabaseServerClient.mockResolvedValue({
      auth: {
        signInWithOAuth,
        signOut: vi.fn(),
      },
    })

    await expect(loginWithGoogle({})).resolves.toEqual({
      error: 'Google 로그인 링크를 받지 못했습니다. 브라우저 설정을 확인하세요.',
    })
    expect(mocks.redirect).not.toHaveBeenCalled()
  })
})

describe('logout action', () => {
  it('signs out and redirects to the login page', async () => {
    const signOut = vi.fn().mockResolvedValue(undefined)
    mocks.createSupabaseServerClient.mockResolvedValue({
      auth: {
        signInWithPassword: vi.fn(),
        signOut,
      },
    })

    await logout()

    expect(signOut).toHaveBeenCalled()
    expect(mocks.redirect).toHaveBeenCalledWith('/login')
  })
})

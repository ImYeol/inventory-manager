import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  redirect: vi.fn(),
  createSupabaseServerClient: vi.fn(),
}))

vi.mock('next/navigation', () => ({
  redirect: mocks.redirect,
}))

vi.mock('@/lib/supabase/server', () => ({
  createSupabaseServerClient: mocks.createSupabaseServerClient,
}))

import { login, logout } from '@/app/login/actions'

beforeEach(() => {
  mocks.redirect.mockReset()
  mocks.createSupabaseServerClient.mockReset()
})

afterEach(() => {
  mocks.redirect.mockReset()
  mocks.createSupabaseServerClient.mockReset()
})

describe('login action', () => {
  it('returns a validation error when credentials are missing', async () => {
    const result = await login({}, new FormData())

    expect(result).toEqual({ error: '이메일과 비밀번호를 모두 입력하세요.' })
    expect(mocks.createSupabaseServerClient).not.toHaveBeenCalled()
  })

  it('signs in with trimmed email and redirects on success', async () => {
    const signInWithPassword = vi.fn().mockResolvedValue({ error: null })
    mocks.createSupabaseServerClient.mockResolvedValue({
      auth: {
        signInWithPassword,
        signOut: vi.fn(),
      },
    })

    const formData = new FormData()
    formData.set('email', '  user@example.com  ')
    formData.set('password', 'secret')

    await login({}, formData)

    expect(mocks.createSupabaseServerClient).toHaveBeenCalled()
    expect(signInWithPassword).toHaveBeenCalledWith({
      email: 'user@example.com',
      password: 'secret',
    })
    expect(mocks.redirect).toHaveBeenCalledWith('/')
  })

  it('returns a friendly error when Supabase sign-in fails', async () => {
    const signInWithPassword = vi.fn().mockResolvedValue({ error: new Error('bad credentials') })
    mocks.createSupabaseServerClient.mockResolvedValue({
      auth: {
        signInWithPassword,
        signOut: vi.fn(),
      },
    })

    const formData = new FormData()
    formData.set('email', 'user@example.com')
    formData.set('password', 'wrong-password')

    await expect(login({}, formData)).resolves.toEqual({
      error: '로그인에 실패했습니다. 계정 정보를 확인하세요.',
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

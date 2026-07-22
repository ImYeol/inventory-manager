import React from 'react'
import { render, cleanup } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  user: null as null | {
    email: string | null
    user_metadata?: Record<string, string | undefined>
  },
}))

vi.mock('@/lib/supabase/server', () => ({
  createSupabaseServerClient: vi.fn(async () => ({
    auth: {
      getUser: vi.fn(async () => ({
        data: { user: mocks.user },
        error: null,
      })),
    },
  })),
}))

vi.mock('@/app/components/Nav', () => ({
  default: vi.fn(() => null),
}))

vi.mock('next/navigation', () => ({
  redirect: vi.fn(),
}))

import ProtectedLayout from '@/app/(protected)/layout'
import Nav from '@/app/components/Nav'

beforeEach(() => {
  window.matchMedia = vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })) as unknown as typeof window.matchMedia
})

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

describe('ProtectedLayout', () => {
  it('passes normalized user profile data to Nav', async () => {
    mocks.user = {
      email: 'hong@example.com',
      user_metadata: {
        full_name: '홍길동',
      },
    }

    render(await ProtectedLayout({ children: React.createElement('div', null, 'child') }))

    expect(Nav).toHaveBeenCalledWith(
      expect.objectContaining({
        user: {
          name: '홍길동',
          email: 'hong@example.com',
        },
      }),
      undefined,
    )
  })

  it('falls back to the email prefix when profile name is missing', async () => {
    mocks.user = {
      email: 'tester@example.com',
      user_metadata: {},
    }

    render(await ProtectedLayout({ children: React.createElement('div', null, 'child') }))

    expect(Nav).toHaveBeenCalledWith(
      expect.objectContaining({
        user: {
          name: 'tester',
          email: 'tester@example.com',
        },
      }),
      undefined,
    )
  })
})

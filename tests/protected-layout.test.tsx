import React from 'react'
import { render, cleanup } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  session: null as null | {
    user: {
      email: string | null
      user_metadata?: Record<string, string | undefined>
    }
  },
}))

vi.mock('@/lib/supabase/server', () => ({
  createSupabaseServerClient: vi.fn(async () => ({
    auth: {
      getSession: vi.fn(async () => ({
        data: { session: mocks.session },
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

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

describe('ProtectedLayout', () => {
  it('passes normalized user profile data to Nav', async () => {
    mocks.session = {
      user: {
        email: 'hong@example.com',
        user_metadata: {
          full_name: '홍길동',
        },
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
    )
  })

  it('falls back to the email prefix when profile name is missing', async () => {
    mocks.session = {
      user: {
        email: 'tester@example.com',
        user_metadata: {},
      },
    }

    render(await ProtectedLayout({ children: React.createElement('div', null, 'child') }))

    expect(Nav).toHaveBeenCalledWith(
      expect.objectContaining({
        user: {
          name: 'tester',
          email: 'tester@example.com',
        },
      }),
    )
  })
})

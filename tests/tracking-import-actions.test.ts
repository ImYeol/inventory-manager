import { describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  getSupabaseWithUser: vi.fn(),
}))

vi.mock('@/lib/db', () => ({
  getSupabaseWithUser: mocks.getSupabaseWithUser,
}))

vi.mock('@/lib/actions/shipping', () => ({
  sendCoupangTrackingNumbers: vi.fn(),
  sendNaverTrackingNumbers: vi.fn(),
}))

import { listTrackingPresets } from '@/lib/actions/tracking-import'

describe('tracking import preset actions', () => {
  it('falls back to built-in presets when saved-preset storage is unavailable', async () => {
    const order = vi.fn().mockResolvedValue({ data: null, error: { code: '42P01' } })
    const eq = vi.fn(() => ({ order }))
    const select = vi.fn(() => ({ eq }))
    mocks.getSupabaseWithUser.mockResolvedValue({
      user: { id: 'user-1' },
      supabase: { from: vi.fn(() => ({ select })) },
    })

    await expect(listTrackingPresets()).resolves.toEqual([])
  })
})

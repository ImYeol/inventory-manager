import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  redirect: vi.fn(() => {
    throw new Error('redirect-called')
  }),
}))

vi.mock('next/navigation', () => ({
  redirect: mocks.redirect,
}))

import IntegrationsPage from '@/app/(protected)/integrations/page'

beforeEach(() => {
  mocks.redirect.mockReset()
  mocks.redirect.mockImplementation(() => {
    throw new Error('redirect-called')
  })
})

describe('IntegrationsPage', () => {
  it('redirects integrations to the settings store-connection deep link', async () => {
    expect(() => IntegrationsPage()).toThrow('redirect-called')
    expect(mocks.redirect).toHaveBeenCalledWith('/settings?section=store-connections')
  })
})

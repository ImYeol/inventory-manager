import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  getSetupState: vi.fn(),
  redirect: vi.fn(),
}))

vi.mock('@/lib/data', () => ({
  getSetupState: mocks.getSetupState,
}))

vi.mock('next/navigation', () => ({
  redirect: mocks.redirect,
}))

import { enforceSetupComplete } from '@/lib/setup-guard'

beforeEach(() => {
  mocks.getSetupState.mockReset()
  mocks.redirect.mockReset()
})

describe('enforceSetupComplete', () => {
  it('redirects to settings master-data when setup is incomplete', async () => {
    mocks.getSetupState.mockResolvedValue({ needsSetup: true })

    await enforceSetupComplete()

    expect(mocks.getSetupState).toHaveBeenCalledTimes(1)
    expect(mocks.redirect).toHaveBeenCalledWith('/settings/master-data')
  })

  it('does not redirect when setup is complete', async () => {
    mocks.getSetupState.mockResolvedValue({ needsSetup: false })

    await enforceSetupComplete()

    expect(mocks.getSetupState).toHaveBeenCalledTimes(1)
    expect(mocks.redirect).not.toHaveBeenCalled()
  })
})

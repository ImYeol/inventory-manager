import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  redirect: vi.fn(),
}))

vi.mock('next/navigation', () => ({
  redirect: mocks.redirect,
}))

import MasterDataPage from '@/app/(protected)/master-data/page'

beforeEach(() => {
  mocks.redirect.mockReset()
})

describe('MasterDataPage', () => {
  it('redirects legacy master-data requests to settings master-data', async () => {
    await MasterDataPage()

    expect(mocks.redirect).toHaveBeenCalledWith('/settings/master-data')
  })
})

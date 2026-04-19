// @vitest-environment jsdom
import React from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'

const mocks = vi.hoisted(() => ({
  redirect: vi.fn(),
}))

vi.mock('next/navigation', () => ({
  redirect: mocks.redirect,
}))

import SettingsMasterDataPage from '@/app/(protected)/settings/master-data/page'

afterEach(() => {
  cleanup()
  mocks.redirect.mockReset()
})

describe('SettingsMasterDataPage', () => {
  it('redirects deprecated settings master-data route to products', async () => {
    render(await SettingsMasterDataPage())

    expect(mocks.redirect).toHaveBeenCalledWith('/products')
  })
})

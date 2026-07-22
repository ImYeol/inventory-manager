// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render } from '@testing-library/react'

const mocks = vi.hoisted(() => ({
  redirect: vi.fn(),
}))

vi.mock('next/navigation', () => ({
  redirect: mocks.redirect,
}))

import SettingsParseTemplatesPage from '@/app/(protected)/settings/parse-templates/page'

afterEach(() => {
  cleanup()
  mocks.redirect.mockReset()
})

describe('SettingsParseTemplatesPage', () => {
  it('redirects the dissolved settings parse-templates route to the owning supplier surface', async () => {
    await SettingsParseTemplatesPage()

    expect(mocks.redirect).toHaveBeenCalledWith('/sourcing/factories')
  })
})

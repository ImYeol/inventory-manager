// @vitest-environment jsdom
import React from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'

const mocks = vi.hoisted(() => ({
  getFactoriesData: vi.fn(),
  factoriesView: vi.fn(),
}))

vi.mock('@/lib/data', () => ({
  getFactoriesData: mocks.getFactoriesData,
}))

vi.mock('@/app/(protected)/sourcing/factories/FactoriesView', () => ({
  default: (props: { factories: unknown; schemaState: unknown; factorySourcingItems: unknown }) => {
    mocks.factoriesView(props)
    return React.createElement('div', { 'data-testid': 'factories-view' })
  },
}))

import SourcingFactoriesPage from '@/app/(protected)/sourcing/factories/page'

afterEach(() => {
  cleanup()
  mocks.getFactoriesData.mockReset()
  mocks.factoriesView.mockReset()
})

describe('SourcingFactoriesPage', () => {
  it('keeps the sourcing factories route as a compact shell around the shared view', async () => {
    const factories = [{ id: 1, name: '광주 협력사' }]
    const schemaState = { status: 'ready', message: null }
    const factorySourcingItems = { 1: [] }
    mocks.getFactoriesData.mockResolvedValue({ factories, schemaState, factorySourcingItems })

    render(await SourcingFactoriesPage())

    expect(screen.getByTestId('factories-view')).toBeTruthy()
    expect(mocks.factoriesView).toHaveBeenCalledWith(expect.objectContaining({ factories, schemaState, factorySourcingItems }))
  })
})

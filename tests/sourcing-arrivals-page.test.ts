// @vitest-environment jsdom
import React from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'

const mocks = vi.hoisted(() => ({
  getCatalogData: vi.fn(),
  getFactoriesData: vi.fn(),
  getFactoryArrivalsData: vi.fn(),
  arrivalsView: vi.fn(),
}))

vi.mock('@/lib/data', () => ({
  getCatalogData: mocks.getCatalogData,
  getFactoriesData: mocks.getFactoriesData,
  getFactoryArrivalsData: mocks.getFactoryArrivalsData,
}))

vi.mock('@/app/(protected)/sourcing/arrivals/ArrivalsView', () => ({
  default: (props: { factories: unknown; models: unknown; arrivals: unknown }) => {
    mocks.arrivalsView(props)
    return React.createElement('div', { 'data-testid': 'arrivals-view' })
  },
}))

import SourcingArrivalsPage from '@/app/(protected)/sourcing/arrivals/page'

afterEach(() => {
  cleanup()
  Object.values(mocks).forEach((mock) => mock.mockReset?.())
})

describe('SourcingArrivalsPage', () => {
  it('loads catalog, factories, and arrivals and passes normalized props to the view', async () => {
    mocks.getCatalogData.mockResolvedValue({
      models: [
        {
          id: 1,
          name: 'LP01',
          sizes: [{ id: 10, name: 'S' }],
          colors: [{ id: 20, name: '네이비', rgbCode: '#111111' }],
        },
      ],
    })
    mocks.getFactoriesData.mockResolvedValue([{ id: 1, name: '광주 협력사', isActive: true }])
    mocks.getFactoryArrivalsData.mockResolvedValue([{ id: 100, factoryName: '광주 협력사' }])

    render(await SourcingArrivalsPage())

    expect(mocks.arrivalsView).toHaveBeenCalledWith(
      expect.objectContaining({
        factories: [{ id: 1, name: '광주 협력사', isActive: true }],
        arrivals: [{ id: 100, factoryName: '광주 협력사' }],
      }),
    )
    expect(screen.getByTestId('arrivals-view')).toBeTruthy()
  })
})

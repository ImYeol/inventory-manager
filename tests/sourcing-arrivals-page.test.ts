// @vitest-environment jsdom
import React from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'

const mocks = vi.hoisted(() => ({
  getCatalogData: vi.fn(),
  getFactoriesData: vi.fn(),
  getFactoryArrivalsData: vi.fn(),
  getProductWorkspaceData: vi.fn(),
  arrivalsView: vi.fn(),
}))

vi.mock('@/lib/data', () => ({
  getCatalogData: mocks.getCatalogData,
  getFactoriesData: mocks.getFactoriesData,
  getFactoryArrivalsData: mocks.getFactoryArrivalsData,
  getProductWorkspaceData: mocks.getProductWorkspaceData,
}))

vi.mock('@/app/(protected)/sourcing/arrivals/ArrivalsView', () => ({
  default: (props: { factories: unknown; models: unknown; arrivals: unknown; schemaState: unknown }) => {
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
  it('keeps the sourcing arrivals route as a compact shell around the shared view', async () => {
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
    mocks.getFactoriesData.mockResolvedValue({
      schemaState: { status: 'ready', message: null },
      factories: [{ id: 1, name: '광주 협력사', isActive: true }],
      factorySourcingItems: { 1: [] },
    })
    mocks.getFactoryArrivalsData.mockResolvedValue({
      schemaState: { status: 'ready', message: null },
      arrivals: [{ id: 100, factoryName: '광주 협력사' }],
    })
    mocks.getProductWorkspaceData.mockResolvedValue({ variants: [], channelProductRefs: [] })

    render(await SourcingArrivalsPage())

    expect(screen.getByTestId('arrivals-view')).toBeTruthy()

    expect(mocks.arrivalsView).toHaveBeenCalledWith(
      expect.objectContaining({
        schemaState: { status: 'ready', message: null },
        factories: [{ id: 1, name: '광주 협력사', isActive: true }],
        arrivals: [{ id: 100, factoryName: '광주 협력사' }],
      }),
    )
  })

  it('uses the canonical arrival schema state when factory master data is already available', async () => {
    mocks.getCatalogData.mockResolvedValue({ models: [], warehouses: [] })
    mocks.getFactoriesData.mockResolvedValue({
      schemaState: { status: 'ready', message: null },
      factories: [],
      factorySourcingItems: {},
    })
    mocks.getFactoryArrivalsData.mockResolvedValue({
      schemaState: { status: 'missing', message: '입고 스키마 준비가 필요합니다.' },
      arrivals: [],
    })
    mocks.getProductWorkspaceData.mockResolvedValue({ variants: [], channelProductRefs: [] })

    render(await SourcingArrivalsPage())

    expect(mocks.arrivalsView).toHaveBeenCalledWith(
      expect.objectContaining({
        schemaState: { status: 'missing', message: '입고 스키마 준비가 필요합니다.' },
      }),
    )
  })
})

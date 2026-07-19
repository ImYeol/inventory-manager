// @vitest-environment jsdom
import React from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'

const mocks = vi.hoisted(() => ({
  arrivalsView: vi.fn(),
  notFound: vi.fn(() => {
    throw new Error('NEXT_NOT_FOUND')
  }),
}))

vi.mock('next/navigation', () => ({
  notFound: mocks.notFound,
}))

vi.mock('@/app/(protected)/sourcing/arrivals/ArrivalsView', () => ({
  default: (props: unknown) => {
    mocks.arrivalsView(props)
    return React.createElement('div', { 'data-testid': 'arrivals-preview' })
  },
}))

import ArrivalsPreviewPage from '@/app/dev/arrivals-preview/page'
import { arrivalsPreviewProps } from '@/app/dev/arrivals-preview/fixture'

afterEach(() => {
  cleanup()
  vi.unstubAllEnvs()
  mocks.arrivalsView.mockReset()
  mocks.notFound.mockClear()
})

describe('ArrivalsPreviewPage', () => {
  it('renders the real view contract from a static representative fixture', () => {
    vi.stubEnv('NODE_ENV', 'development')

    render(ArrivalsPreviewPage())

    expect(screen.getByTestId('arrivals-preview')).toBeTruthy()
    expect(mocks.arrivalsView).toHaveBeenCalledWith(arrivalsPreviewProps)

    const arrival = arrivalsPreviewProps.arrivals[0]
    expect(arrival.status).toBe('PARTIAL')
    expect(arrival.items.map((item) => item.externalSku)).toEqual(['CN-LP01-NV-S', 'CN-LP01-NV-S'])
    expect(arrival.items[0].allocations.map(({ warehouseName, allocatedQuantity }) => [warehouseName, allocatedQuantity])).toEqual([
      ['오금동', 20],
      ['대자동', 10],
    ])
    expect(arrival.shortageClosures).toHaveLength(1)
    expect(arrival.receiptLines.length).toBeGreaterThan(0)
  })

  it('returns not found in production', () => {
    vi.stubEnv('NODE_ENV', 'production')

    expect(() => ArrivalsPreviewPage()).toThrow('NEXT_NOT_FOUND')
    expect(mocks.notFound).toHaveBeenCalledOnce()
    expect(mocks.arrivalsView).not.toHaveBeenCalled()
  })
})

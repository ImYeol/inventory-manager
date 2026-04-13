// @vitest-environment jsdom
import React from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'

const mocks = vi.hoisted(() => ({
  getCatalogData: vi.fn(),
  inoutForm: vi.fn(),
}))

vi.mock('next/link', () => ({
  default: ({
    href,
    children,
    className,
  }: {
    href: string
    children: React.ReactNode
    className?: string
  }) => React.createElement('a', { href, className }, children),
}))

vi.mock('@/lib/data', () => ({
  getCatalogData: mocks.getCatalogData,
}))

vi.mock('@/app/(protected)/inout/InOutForm', () => ({
  default: (props: { models: unknown; warehouses: unknown }) => {
    mocks.inoutForm(props)
    return React.createElement('div', {
      'data-testid': 'inout-form',
      'data-models': JSON.stringify(props.models),
      'data-warehouses': JSON.stringify(props.warehouses),
    })
  },
}))

vi.mock('@/lib/setup-guard', () => ({
  enforceSetupComplete: vi.fn().mockResolvedValue(undefined),
}))

import InOutPage from '@/app/(protected)/inout/page'

afterEach(() => {
  cleanup()
  mocks.getCatalogData.mockReset()
  mocks.inoutForm.mockReset()
})

describe('InOutPage', () => {
  it('links back to inventory page from entry view', async () => {
    mocks.getCatalogData.mockResolvedValue({
      models: [
        {
          id: 1,
          name: 'LP01',
          sizes: [{ id: 11, name: 'S', sortOrder: 1, modelId: 1 }],
          colors: [{ id: 21, name: '블루', rgbCode: '#0000ff', textWhite: true, sortOrder: 1, modelId: 1 }],
        },
      ],
      warehouses: [{ id: 1, name: '본사 창고' }],
    })

    render(await InOutPage())

    expect(screen.getByRole('link', { name: '재고현황으로 돌아가기' }).getAttribute('href')).toBe('/inventory')
    expect(screen.getByTestId('inout-form')).toBeTruthy()
  })
})

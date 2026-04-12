// @vitest-environment jsdom
import React from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'

const mocks = vi.hoisted(() => ({
  getCatalogData: vi.fn(),
  getSetupState: vi.fn(),
  redirect: vi.fn(),
}))

vi.mock('@/lib/data', () => ({
  getCatalogData: mocks.getCatalogData,
  getSetupState: mocks.getSetupState,
}))

vi.mock('next/navigation', () => ({
  redirect: mocks.redirect,
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
}))

import SetupPage from '@/app/(protected)/setup/page'

beforeEach(() => {
  mocks.getCatalogData.mockReset()
  mocks.getSetupState.mockReset()
  mocks.redirect.mockReset()
})

describe('SetupPage', () => {
  it('redirects home when setup is already complete', async () => {
    mocks.getCatalogData.mockResolvedValue({
      models: [
        {
          id: 1,
          name: 'LP01',
          createdAt: '2026-01-01T00:00:00.000Z',
          sizes: [],
          colors: [],
          inventory: [],
        },
      ],
      warehouses: [{ id: 1, name: '오금동' }],
    })
    mocks.getSetupState.mockResolvedValue({
      needsSetup: false,
      hasWarehouse: true,
      hasModel: true,
      allModelsHaveSpec: true,
      warehouseCount: 1,
      modelCount: 1,
    })

    await SetupPage()

    expect(mocks.getCatalogData).toHaveBeenCalledTimes(1)
    expect(mocks.getSetupState).toHaveBeenCalledTimes(1)
    expect(mocks.redirect).toHaveBeenCalledWith('/')
  })

  it('renders the setup wizard when setup is incomplete', async () => {
    mocks.getCatalogData.mockResolvedValue({ models: [], warehouses: [] })
    mocks.getSetupState.mockResolvedValue({
      needsSetup: true,
      hasWarehouse: false,
      hasModel: false,
      allModelsHaveSpec: false,
      warehouseCount: 0,
      modelCount: 0,
    })

    const element = await SetupPage()
    render(element as React.ReactElement)

    expect(mocks.getCatalogData).toHaveBeenCalledTimes(1)
    expect(mocks.getSetupState).toHaveBeenCalledTimes(1)
    expect(screen.getByText('초기 설정')).toBeTruthy()
    expect(screen.getByText('1. 창고 등록')).toBeTruthy()
    expect(screen.getByText('등록된 창고가 없습니다.')).toBeTruthy()
  })
})

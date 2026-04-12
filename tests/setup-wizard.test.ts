// @vitest-environment jsdom
import React from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'

const mocks = vi.hoisted(() => ({
  push: vi.fn(),
  refresh: vi.fn(),
  createWarehouse: vi.fn(),
  createModel: vi.fn(),
  createModelSize: vi.fn(),
  createModelColor: vi.fn(),
}))

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mocks.push, refresh: mocks.refresh }),
}))

vi.mock('@/lib/actions', () => ({
  createWarehouse: mocks.createWarehouse,
  createModel: mocks.createModel,
  createModelSize: mocks.createModelSize,
  createModelColor: mocks.createModelColor,
}))

import SetupWizard from '@/app/(protected)/setup/SetupWizard'

beforeEach(() => {
  mocks.push.mockReset()
  mocks.refresh.mockReset()
  mocks.createWarehouse.mockReset()
  mocks.createModel.mockReset()
  mocks.createModelSize.mockReset()
  mocks.createModelColor.mockReset()
})

describe('SetupWizard', () => {
  it('keeps setup blocked when a model is missing size or color specs', () => {
    render(
      React.createElement(SetupWizard, {
        warehouses: [],
        models: [
          {
            id: 1,
            name: 'LP01',
            sizes: [],
            colors: [],
            inventory: [],
          },
        ],
        setupState: {
          needsSetup: true,
          hasWarehouse: false,
          hasModel: true,
          allModelsHaveSpec: false,
          warehouseCount: 0,
          modelCount: 1,
        },
      }),
    )

    expect(screen.getByRole('button', { name: '4. 완료' }).disabled).toBe(true)
    expect(screen.getByRole('button', { name: '다음: 완료 처리' }).disabled).toBe(true)
  })

  it('allows moving to completion and entering inout when setup is complete', () => {
    render(
      React.createElement(SetupWizard, {
        warehouses: [{ id: 1, name: '본사 창고' }],
        models: [
          {
            id: 1,
            name: 'LP01',
            sizes: [{ id: 10, name: 'S', sortOrder: 0, modelId: 1 }],
            colors: [{ id: 20, name: '네이비', rgbCode: '#111111', textWhite: true, sortOrder: 0, modelId: 1 }],
            inventory: [],
          },
        ],
        setupState: {
          needsSetup: true,
          hasWarehouse: true,
          hasModel: true,
          allModelsHaveSpec: true,
          warehouseCount: 1,
          modelCount: 1,
        },
      }),
    )

    expect(screen.getByRole('button', { name: '4. 완료' }).disabled).toBe(false)
    fireEvent.click(screen.getByRole('button', { name: '4. 완료' }))
    fireEvent.click(screen.getByRole('button', { name: '입출고로 이동' }))

    expect(mocks.push).toHaveBeenCalledWith('/inout')
  })
})

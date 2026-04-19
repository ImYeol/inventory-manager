// @vitest-environment jsdom
import React from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'

const mocks = vi.hoisted(() => ({
  getCatalogData: vi.fn(),
  getTransactionsWithRelations: vi.fn(),
  masterDataManager: vi.fn(),
}))

vi.mock('@/lib/data', () => ({
  getCatalogData: mocks.getCatalogData,
  getTransactionsWithRelations: mocks.getTransactionsWithRelations,
}))

vi.mock('@/app/(protected)/master-data/MasterDataManager', () => ({
  default: (props: unknown) => {
    mocks.masterDataManager(props)
    return React.createElement('div', {
      'data-testid': 'master-data-manager',
    })
  },
}))

import ProductsPage from '@/app/(protected)/products/page'

afterEach(() => {
  cleanup()
  mocks.getCatalogData.mockReset()
  mocks.getTransactionsWithRelations.mockReset()
  mocks.masterDataManager.mockReset()
})

describe('ProductsPage', () => {
  it('loads catalog and transaction data for the top-level product-management workspace', async () => {
    const models = [{ id: 10, name: 'LP01', inventory: [] }]
    const warehouses = [{ id: 1, name: '오금동' }]
    const transactions = [{ id: 1, warehouseId: 1, type: '입고', quantity: 12, date: '2026-04-12' }]

    mocks.getCatalogData.mockResolvedValue({ models, warehouses })
    mocks.getTransactionsWithRelations.mockResolvedValue({ transactions })

    render(await ProductsPage())

    expect(mocks.getCatalogData).toHaveBeenCalledTimes(1)
    expect(mocks.getTransactionsWithRelations).toHaveBeenCalledTimes(1)
    expect(mocks.masterDataManager).toHaveBeenCalledWith(
      expect.objectContaining({
        models,
        warehouses,
        warehouseStats: [
          expect.objectContaining({
            id: 1,
            name: '오금동',
            stockQty: 0,
            inboundQty: 12,
            outboundQty: 0,
            latestInbound: { quantity: 12, date: '2026-04-12' },
            latestOutbound: null,
            latestMovementDate: '2026-04-12',
          }),
        ],
      }),
    )
    expect(screen.getByTestId('master-data-manager')).toBeTruthy()
    expect(screen.getByRole('heading', { name: '상품 관리' })).toBeTruthy()
  })
})

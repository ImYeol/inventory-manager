// @vitest-environment jsdom
import React from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'

const mocks = vi.hoisted(() => ({
  getCatalogData: vi.fn(),
  getTransactionsWithRelations: vi.fn(),
  getProductWorkspaceData: vi.fn(),
  getFactoriesData: vi.fn(),
  getActiveInboundTemplates: vi.fn(),
  inventoryWorkspace: vi.fn(),
}))

vi.mock('@/lib/data', () => ({
  getCatalogData: mocks.getCatalogData,
  getTransactionsWithRelations: mocks.getTransactionsWithRelations,
  getProductWorkspaceData: mocks.getProductWorkspaceData,
  getFactoriesData: mocks.getFactoriesData,
  getActiveInboundTemplates: mocks.getActiveInboundTemplates,
}))

vi.mock('@/app/components/inventory/InventoryWorkspace', () => ({
  default: (props: unknown) => {
    mocks.inventoryWorkspace(props)
    return React.createElement('div', { 'data-testid': 'inventory-workspace' })
  },
}))

import InventoryPage from '@/app/(protected)/inventory/page'

afterEach(() => {
  cleanup()
  Object.values(mocks).forEach((mock) => mock.mockReset())
})

describe('InventoryPage', () => {
  it('passes existing internal SKU mapping workspace data to the inventory workspace', async () => {
    const models = [{ id: 1, name: 'LP01', inventory: [] }]
    const warehouses = [{ id: 1, name: '오금동' }]
    const transactions = [{ id: 1 }]
    const variants = [{ id: 501, modelId: 1, sizeId: 11, colorId: 21, sellerSku: 'LP01-S-NV' }]
    const channelProductRefs = [{ id: 1, variantId: 501, channel: 'naver', listingStatus: 'active', lastSyncError: null }]

    mocks.getCatalogData.mockResolvedValue({ models, warehouses })
    mocks.getTransactionsWithRelations.mockResolvedValue({ transactions })
    mocks.getProductWorkspaceData.mockResolvedValue({ variants, channelProductRefs })
    mocks.getFactoriesData.mockResolvedValue({ factories: [{ id: 4, name: '한빛 공장', isActive: true }] })
    mocks.getActiveInboundTemplates.mockResolvedValue([{ id: 7, name: '중국 공장 기본', versionId: 11, versionNumber: 1 }])

    render(await InventoryPage())

    expect(mocks.getProductWorkspaceData).toHaveBeenCalledTimes(1)
    expect(mocks.inventoryWorkspace).toHaveBeenCalledWith(expect.objectContaining({
      models,
      warehouses,
      transactions,
      variants,
      channelProductRefs,
      suppliers: [{ id: 4, name: '한빛 공장' }],
      inboundTemplates: [{ id: 7, name: '중국 공장 기본', versionId: 11, versionNumber: 1 }],
    }))
    expect(screen.getByTestId('inventory-workspace')).toBeTruthy()
  })
})

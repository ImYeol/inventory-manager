import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  getCatalogData: vi.fn(),
  getCurrentStockRow: vi.fn(),
  getModelLookups: vi.fn(),
  getTransactionsWithRelations: vi.fn(),
  runBulkTransaction: vi.fn(),
  runInventoryAdjustment: vi.fn(),
  revalidatePath: vi.fn(),
}))

vi.mock('@/lib/data', () => ({
  getCatalogData: mocks.getCatalogData,
  getCurrentStockRow: mocks.getCurrentStockRow,
  getModelLookups: mocks.getModelLookups,
  getTransactionsWithRelations: mocks.getTransactionsWithRelations,
  runBulkTransaction: mocks.runBulkTransaction,
  runInventoryAdjustment: mocks.runInventoryAdjustment,
}))

vi.mock('next/cache', () => ({
  revalidatePath: mocks.revalidatePath,
}))

import {
  addBatchTransactions,
  addTransaction,
  adjustInventory,
  createTransactions,
  getCurrentStock,
  getInventory,
  getModelDetails,
  getModels,
  getTransactions,
} from '@/lib/actions'

beforeEach(() => {
  for (const mock of Object.values(mocks)) {
    mock.mockReset?.()
  }
})

afterEach(() => {
  for (const mock of Object.values(mocks)) {
    mock.mockReset?.()
  }
})

describe('server action wrappers', () => {
  it('strips inventory from model listings', async () => {
    mocks.getCatalogData.mockResolvedValue({
      models: [{ id: 1, name: 'LP01', inventory: [{ id: 1 }] }],
    })

    await expect(getModels()).resolves.toEqual([{ id: 1, name: 'LP01' }])
  })

  it('groups inventory into color and warehouse buckets', async () => {
    mocks.getCatalogData.mockResolvedValue({
      models: [
        {
          id: 1,
          name: 'LP01',
          sizes: [{ id: 10, name: 'S' }],
          colors: [{ id: 20, name: '네이비', rgbCode: '#111111', textWhite: true }],
          inventory: [
            { id: 101, modelId: 1, sizeId: 10, colorId: 20, warehouseId: 1, warehouseName: '오금동', quantity: 2 },
            { id: 102, modelId: 1, sizeId: 10, colorId: 20, warehouseId: 2, warehouseName: '대자동', quantity: 3 },
          ],
        },
      ],
      warehouses: [
        { id: 1, name: '오금동' },
        { id: 2, name: '대자동' },
      ],
    })

    await expect(getInventory()).resolves.toEqual([
      {
        model: { id: 1, name: 'LP01' },
        sizes: [{ id: 10, name: 'S' }],
        colors: [
          {
            id: 20,
            name: '네이비',
            rgbCode: '#111111',
            textWhite: true,
            inventory: {
              S: {
                오금동: { id: 101, quantity: 2, name: '오금동' },
                대자동: { id: 102, quantity: 3, name: '대자동' },
              },
            },
          },
        ],
      },
    ])
  })

  it('filters transaction rows by type and warehouse', async () => {
    mocks.getTransactionsWithRelations.mockResolvedValue({
      transactions: [
        { id: 1, type: '입고', warehouseId: 1 },
        { id: 2, type: '반출', warehouseId: 1 },
        { id: 3, type: '입고', warehouseId: 2 },
      ],
    })

    await expect(getTransactions({ type: '입고', warehouseId: 1 })).resolves.toEqual([
      { id: 1, type: '입고', warehouseId: 1 },
    ])
  })

  it('delegates transaction creation through the bulk transaction helper', async () => {
    mocks.runBulkTransaction.mockResolvedValue(undefined)

    await expect(
      addTransaction({
        date: '2026-04-12',
        modelId: 1,
        sizeId: 10,
        colorId: 20,
        type: '입고',
        quantity: 3,
        warehouseId: 1,
      })
    ).resolves.toEqual({ success: true })

    expect(mocks.runBulkTransaction).toHaveBeenCalledWith([
      {
        date: '2026-04-12',
        modelId: 1,
        sizeId: 10,
        colorId: 20,
        type: '입고',
        quantity: 3,
        warehouseId: 1,
      },
    ])
    expect(mocks.revalidatePath).toHaveBeenCalledWith('/')
    expect(mocks.revalidatePath).toHaveBeenCalledWith('/history')
  })

  it('supports batch transaction creation and inventory adjustments', async () => {
    mocks.runBulkTransaction.mockResolvedValue(undefined)
    mocks.runInventoryAdjustment.mockResolvedValue(undefined)

    await expect(
      addBatchTransactions([
        {
          date: '2026-04-12',
          modelId: 1,
          sizeId: 10,
          colorId: 20,
          type: '입고',
          quantity: 3,
          warehouseId: 1,
        },
      ])
    ).resolves.toEqual({ success: true })

    await expect(adjustInventory(99, 12)).resolves.toEqual({ success: true })
    await expect(createTransactions([])).resolves.toEqual({ success: true })
    await expect(getModelDetails(1)).resolves.toBeUndefined()
    await expect(getCurrentStock(1, 10, 20, 1)).resolves.toBeUndefined()
  })
})

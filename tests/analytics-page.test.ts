// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  redirect: vi.fn(),
  getAnalyticsData: vi.fn(),
  getRawTransactions: vi.fn(),
}))

vi.mock('next/navigation', () => ({
  redirect: mocks.redirect,
}))

vi.mock('@/lib/data', () => ({
  getAnalyticsData: mocks.getAnalyticsData,
  getRawTransactions: mocks.getRawTransactions,
}))

import AnalyticsPage from '@/app/(protected)/analytics/page'
import { getInventoryHistory, getWarehouseComparison } from '@/lib/actions/analytics'

beforeEach(() => {
  mocks.redirect.mockReset()
  mocks.getAnalyticsData.mockReset()
  mocks.getRawTransactions.mockReset()
})

describe('AnalyticsPage', () => {
  it('redirects the analytics route to the dashboard', async () => {
    await AnalyticsPage()

    expect(mocks.redirect).toHaveBeenCalledWith('/')
  })
})

describe('analytics actions', () => {
  it('filters inventory history by date range before calculating the series', async () => {
    mocks.getAnalyticsData.mockResolvedValue({
      models: [{ id: 1, name: 'LP01' }],
      inventorySummary: [{ modelName: 'LP01', total: 10 }],
      warehouses: [{ id: 1, name: '오금동' }],
      catalog: [],
    })
    mocks.getRawTransactions.mockResolvedValue([
      { date: '2026-04-01', type: 'INBOUND', quantity: 3, model_id: 1, warehouse_id: 1 },
      { date: '2026-04-15', type: 'OUTBOUND', quantity: 2, model_id: 1, warehouse_id: 1 },
      { date: '2026-05-01', type: 'INBOUND', quantity: 5, model_id: 1, warehouse_id: 1 },
    ])

    const result = await getInventoryHistory('daily', 1, '2026-04-01', '2026-04-30')

    expect(result).toEqual([
      { label: '2026-04-01', quantity: 7 },
      { label: '2026-04-15', quantity: 5 },
    ])
  })

  it('filters warehouse comparison rows by the requested date range', async () => {
    mocks.getAnalyticsData.mockResolvedValue({
      models: [{ id: 1, name: 'LP01' }],
      inventorySummary: [{ modelName: 'LP01', total: 10 }],
      warehouses: [
        { id: 1, name: '오금동' },
        { id: 2, name: '대자동' },
      ],
      catalog: [
        {
          id: 1,
          name: 'LP01',
          createdAt: '2026-04-01T00:00:00.000Z',
          sizes: [],
          colors: [],
          inventory: [],
        },
      ],
    })
    mocks.getRawTransactions.mockResolvedValue([
      { date: '2026-04-01', type: 'INBOUND', quantity: 3, model_id: 1, warehouse_id: 1 },
      { date: '2026-04-15', type: 'INBOUND', quantity: 2, model_id: 1, warehouse_id: 2 },
      { date: '2026-05-01', type: 'INBOUND', quantity: 5, model_id: 1, warehouse_id: 1 },
    ])

    const result = await getWarehouseComparison(1, '2026-04-01', '2026-04-30')

    expect(result).toEqual([
      {
        modelName: 'LP01',
        warehouseTotals: [
          { id: 1, name: '오금동', quantity: 3 },
          { id: 2, name: '대자동', quantity: 2 },
        ],
      },
    ])
  })
})

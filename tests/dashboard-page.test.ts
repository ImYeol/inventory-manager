// @vitest-environment jsdom
import React from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'

const mocks = vi.hoisted(() => ({
  getAnalyticsData: vi.fn(),
  getTransactionsWithRelations: vi.fn(),
  getInventoryHistory: vi.fn(),
  getTransactionTrend: vi.fn(),
  getWarehouseComparison: vi.fn(),
}))

vi.mock('@/lib/data', () => ({
  getAnalyticsData: mocks.getAnalyticsData,
  getTransactionsWithRelations: mocks.getTransactionsWithRelations,
}))

vi.mock('@/lib/actions/analytics', () => ({
  getInventoryHistory: mocks.getInventoryHistory,
  getTransactionTrend: mocks.getTransactionTrend,
  getWarehouseComparison: mocks.getWarehouseComparison,
}))

vi.mock('@/app/(protected)/analytics/charts/InventoryTrendChart', () => ({
  default: ({ data }: { data: unknown[] }) =>
    React.createElement('div', {
      'data-testid': 'inventory-trend-chart',
      'data-count': data.length,
    }),
}))

vi.mock('@/app/(protected)/analytics/charts/TransactionBarChart', () => ({
  default: ({ data }: { data: unknown[] }) =>
    React.createElement('div', {
      'data-testid': 'transaction-bar-chart',
      'data-count': data.length,
    }),
}))

vi.mock('@/app/(protected)/analytics/charts/WarehouseCompareChart', () => ({
  default: ({ data }: { data: unknown[] }) =>
    React.createElement('div', {
      'data-testid': 'warehouse-compare-chart',
      'data-count': data.length,
    }),
}))

import DashboardPage from '@/app/(protected)/page'

async function chooseSelectOption(label: string, optionName: string) {
  fireEvent.click(screen.getByRole('combobox', { name: label }))
  fireEvent.click(await screen.findByRole('option', { name: optionName }))
}

beforeEach(() => {
  mocks.getAnalyticsData.mockReset()
  mocks.getTransactionsWithRelations.mockReset()
  mocks.getInventoryHistory.mockReset()
  mocks.getTransactionTrend.mockReset()
  mocks.getWarehouseComparison.mockReset()
})

describe('DashboardPage', () => {
  it('renders the dashboard shell, omits the old quick-start buttons, and wires three local chart strips', async () => {
    mocks.getAnalyticsData.mockResolvedValue({
      models: [
        { id: 1, name: 'LP01' },
        { id: 2, name: 'LP02' },
      ],
      inventorySummary: [
        { modelName: 'LP01', total: 12 },
        { modelName: 'LP02', total: 5 },
      ],
      warehouses: [
        { id: 1, name: '오금동' },
        { id: 2, name: '대자동' },
      ],
      catalog: [
        {
          id: 1,
          name: 'LP01',
          createdAt: '2026-04-13T00:00:00.000Z',
          sizes: [{ id: 11, name: 'M', sortOrder: 1, modelId: 1 }],
          colors: [{ id: 21, name: '네이비', rgbCode: '#111111', textWhite: true, sortOrder: 1, modelId: 1 }],
          inventory: [
            { id: 101, modelId: 1, sizeId: 11, colorId: 21, warehouseId: 1, warehouseName: '오금동', quantity: 2 },
            { id: 102, modelId: 1, sizeId: 11, colorId: 21, warehouseId: 2, warehouseName: '대자동', quantity: 10 },
          ],
        },
        {
          id: 2,
          name: 'LP02',
          createdAt: '2026-04-13T00:00:00.000Z',
          sizes: [{ id: 12, name: 'S', sortOrder: 1, modelId: 2 }],
          colors: [{ id: 22, name: '블랙', rgbCode: '#000000', textWhite: true, sortOrder: 1, modelId: 2 }],
          inventory: [{ id: 103, modelId: 2, sizeId: 12, colorId: 22, warehouseId: 1, warehouseName: '오금동', quantity: 5 }],
        },
      ],
    })
    mocks.getTransactionsWithRelations.mockResolvedValue({
      models: [{ id: 1, name: 'LP01' }],
      warehouses: [{ id: 1, name: '오금동' }],
      transactions: [
        {
          id: 1,
          date: '26.04.13',
          type: '입고',
          quantity: 3,
          warehouseId: 1,
          warehouse: '오금동',
          warehouseName: '오금동',
          createdAt: '2026-04-13T09:00:00.000Z',
          modelName: 'LP01',
          sizeName: 'M',
          colorName: '네이비',
          colorRgb: '#111111',
        },
      ],
    })
    mocks.getInventoryHistory.mockResolvedValue([{ label: '2026-04-01', quantity: 7 }])
    mocks.getTransactionTrend.mockResolvedValue([{ label: '2026-04-01', inbound: 3, outbound: 1 }])
    mocks.getWarehouseComparison.mockResolvedValue([
      {
        modelName: 'LP01',
        warehouseTotals: [
          { id: 1, name: '오금동', quantity: 3 },
          { id: 2, name: '대자동', quantity: 1 },
        ],
      },
    ])

    render((await DashboardPage()) as React.ReactElement)

    expect(screen.getByText('대시보드')).toBeTruthy()
    expect(screen.getByText('재고 현황과 최근 흐름을 바로 봅니다.')).toBeTruthy()
    expect(screen.getByTestId('inventory-trend-chart')).toBeTruthy()
    expect(screen.getByTestId('transaction-bar-chart')).toBeTruthy()
    expect(screen.getByTestId('warehouse-compare-chart')).toBeTruthy()
    expect(screen.queryByRole('link', { name: '재고 운영' })).toBeNull()
    expect(screen.queryByRole('link', { name: '상품 관리' })).toBeNull()
    expect(screen.queryByRole('link', { name: '운송장' })).toBeNull()
    expect(screen.queryByRole('link', { name: '설정' })).toBeNull()
    const totalInventoryLink = screen.getByRole('link', { name: /전체 재고/ })
    const inboundLink = screen.getByRole('link', { name: /오늘 입고/ })
    expect(totalInventoryLink.getAttribute('href')).toBe('/inventory')
    expect(inboundLink.getAttribute('href')).toBe('/history')
    expect(totalInventoryLink.className).not.toContain('ui-card')
    expect(inboundLink.className).not.toContain('ui-card')
    expect(totalInventoryLink.closest('section')?.className).toContain('ui-card')
    expect(inboundLink.closest('section')?.className).toContain('ui-card')
    expect(screen.getByText('전체 재고').closest('section')?.className).toContain('ui-card')
    expect(screen.getByRole('heading', { name: '재고 추이' }).closest('section')?.className).toContain('ui-card')
    expect(screen.getByRole('heading', { name: '입출고 현황' }).closest('section')?.className).toContain('ui-card')
    expect(screen.getByRole('heading', { name: '창고별 비교' }).closest('section')?.className).toContain('ui-card')
    expect(screen.getByRole('heading', { name: '창고별 재고' }).closest('section')?.className).toContain('ui-card')
    expect(screen.getByRole('heading', { name: '주의 품목' }).closest('section')?.className).toContain('ui-card')
    expect(screen.getByRole('heading', { name: '최근 처리 이력' }).closest('section')?.className).toContain('ui-card')
    expect(screen.getByRole('combobox', { name: '재고 추이 모델' })).toBeTruthy()
    expect(screen.getByRole('combobox', { name: '입출고 현황 모델' })).toBeTruthy()
    expect(screen.getByRole('combobox', { name: '창고별 비교 모델' })).toBeTruthy()
    expect(mocks.getAnalyticsData).toHaveBeenCalledTimes(1)
    expect(mocks.getTransactionsWithRelations).toHaveBeenCalledTimes(1)
    expect(mocks.getInventoryHistory).toHaveBeenCalledWith('monthly')
    expect(mocks.getTransactionTrend).toHaveBeenCalledWith('monthly')
    expect(mocks.getWarehouseComparison).toHaveBeenCalledWith()

    await chooseSelectOption('재고 추이 모델', 'LP01')
    fireEvent.change(screen.getByLabelText('재고 추이 시작일'), { target: { value: '2026-04-01' } })
    fireEvent.change(screen.getByLabelText('재고 추이 종료일'), { target: { value: '2026-04-30' } })

    await waitFor(() => {
      expect(mocks.getInventoryHistory).toHaveBeenLastCalledWith('monthly', 1, '2026-04-01', '2026-04-30')
    })
  })
})

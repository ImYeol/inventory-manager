// @vitest-environment jsdom
import React from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'

const mocks = vi.hoisted(() => ({
  getAnalyticsData: vi.fn(),
  getTransactionsWithRelations: vi.fn(),
  enforceSetupComplete: vi.fn(),
}))

vi.mock('@/lib/data', () => ({
  getAnalyticsData: mocks.getAnalyticsData,
  getTransactionsWithRelations: mocks.getTransactionsWithRelations,
}))

vi.mock('@/lib/setup-guard', () => ({
  enforceSetupComplete: mocks.enforceSetupComplete,
}))

import DashboardPage from '@/app/(protected)/page'

beforeEach(() => {
  mocks.getAnalyticsData.mockReset()
  mocks.getTransactionsWithRelations.mockReset()
  mocks.enforceSetupComplete.mockReset()
})

describe('DashboardPage', () => {
  it('renders the dashboard summary and recent activity from shared data sources', async () => {
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

    const element = await DashboardPage()
    render(element as React.ReactElement)

    expect(screen.getByText('대시보드')).toBeTruthy()
    expect(screen.getByText('전체 재고')).toBeTruthy()
    expect(screen.getByText('17')).toBeTruthy()
    expect(screen.getByText('최근 처리 이력')).toBeTruthy()
    expect(screen.getByText('LP01')).toBeTruthy()
    expect(screen.getByRole('link', { name: /전체 재고/ }).getAttribute('href')).toBe('/inventory')
    expect(screen.getByRole('link', { name: /오늘 입고/ }).getAttribute('href')).toBe('/history')
    expect(screen.getByRole('link', { name: '주의 품목 KPI' }).getAttribute('href')).toBe('/inventory')
    expect(screen.getByRole('link', { name: '운영 포인트: 재고현황' }).getAttribute('href')).toBe('/inventory')
    expect(screen.getByRole('link', { name: /최근 처리 이력/ }).getAttribute('href')).toBe('/history')
    expect(screen.getByRole('link', { name: '재고현황 보기' }).getAttribute('href')).toBe('/inventory')
    expect(screen.getByRole('link', { name: '기준 데이터 관리' }).getAttribute('href')).toBe('/master-data')
  })
})

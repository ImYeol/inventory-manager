// @vitest-environment jsdom
import React from 'react'
import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'

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

vi.mock('@/app/(protected)/inout/InOutForm', () => ({
  default: ({
    initialType,
    lockedWarehouseId,
    entryMode,
  }: {
    initialType?: string
    lockedWarehouseId?: number | null
    entryMode?: string
  }) =>
    React.createElement(
      'div',
      {},
      `InOutForm:${initialType ?? '입고'}:${lockedWarehouseId ?? 'all'}:${entryMode ?? 'manual'}`,
    ),
}))

vi.mock('@/app/(protected)/history/HistoryView', () => ({
  default: ({ controlledWarehouseId }: { controlledWarehouseId?: number | '' }) =>
    React.createElement('div', {}, `HistoryView:${controlledWarehouseId || 'all'}`),
}))

import InventoryWorkspace from '@/app/components/inventory/InventoryWorkspace'

describe('InventoryWorkspace', () => {
  it('switches warehouse context and opens the quick entry overlay', () => {
    render(
      React.createElement(InventoryWorkspace, {
        warehouses: [
          { id: 1, name: '오금동' },
          { id: 2, name: '대자동' },
        ],
        models: [
          {
            id: 1,
            name: 'LP01',
            sizes: [{ id: 11, name: 'S', sortOrder: 1, modelId: 1 }],
            colors: [{ id: 21, name: '네이비', rgbCode: '#111111', textWhite: true, sortOrder: 1, modelId: 1 }],
            inventory: [
              { id: 101, modelId: 1, sizeId: 11, colorId: 21, warehouseId: 1, warehouseName: '오금동', quantity: 2 },
              { id: 102, modelId: 1, sizeId: 11, colorId: 21, warehouseId: 2, warehouseName: '대자동', quantity: 8 },
            ],
          },
        ],
        transactions: [
          {
            id: 1,
            date: '26.04.19',
            type: '입고',
            quantity: 4,
            warehouseId: 1,
            warehouseName: '오금동',
            createdAt: '2026-04-19T00:00:00.000Z',
            modelName: 'LP01',
            sizeName: 'S',
            colorName: '네이비',
            colorRgb: '#111111',
          },
        ],
      }),
    )

    expect(screen.getAllByText('현재 재고').length).toBeGreaterThan(0)
    expect(screen.getByText(/선택된 창고:/)).toBeTruthy()

    fireEvent.change(screen.getByLabelText('창고 컨텍스트'), { target: { value: '2' } })

    fireEvent.click(screen.getAllByRole('button', { name: '빠른 입고' })[0])
    expect(screen.getByText('InOutForm:입고:2:manual')).toBeTruthy()
  })

  it('renders the embedded history and csv workspaces', () => {
    render(
      React.createElement(InventoryWorkspace, {
        warehouses: [{ id: 1, name: '오금동' }],
        models: [],
        transactions: [],
      }),
    )

    fireEvent.click(screen.getByRole('button', { name: /이력/ }))
    expect(screen.getByText('HistoryView:1')).toBeTruthy()

    fireEvent.click(screen.getAllByRole('button', { name: /CSV/ })[1])
    expect(screen.getByText('InOutForm:입고:1:csv')).toBeTruthy()
  })
})

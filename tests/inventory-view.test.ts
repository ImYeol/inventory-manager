// @vitest-environment jsdom
import React from 'react'
import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import InventoryView from '@/app/components/InventoryView'

afterEach(() => {
  cleanup()
})

describe('InventoryView', () => {
  it('opens the only model by default and shows aggregated totals', () => {
    render(
      React.createElement(InventoryView, {
        warehouses: [
          { id: 1, name: '오금동' },
          { id: 2, name: '대자동' },
        ],
        models: [
          {
            id: 1,
            name: 'LP01',
            sizes: [
              { id: 10, name: 'S', sortOrder: 1, modelId: 1 },
              { id: 11, name: 'M', sortOrder: 2, modelId: 1 },
            ],
            colors: [
              { id: 20, name: '네이비', rgbCode: '#111111', textWhite: true, sortOrder: 1, modelId: 1 },
            ],
            inventory: [
              { id: 101, modelId: 1, sizeId: 10, colorId: 20, warehouseId: 1, warehouseName: '오금동', quantity: 2 },
              { id: 102, modelId: 1, sizeId: 10, colorId: 20, warehouseId: 2, warehouseName: '대자동', quantity: 3 },
              { id: 103, modelId: 1, sizeId: 11, colorId: 20, warehouseId: 1, warehouseName: '오금동', quantity: 4 },
              { id: 104, modelId: 1, sizeId: 11, colorId: 20, warehouseId: 2, warehouseName: '대자동', quantity: 5 },
            ],
          },
        ],
      })
    )

    expect(screen.getByRole('button', { name: /LP01/ })).toBeTruthy()
    expect(screen.getByText('소계')).toBeTruthy()

    const row = screen.getByText('네이비').closest('tr')
    expect(row).not.toBeNull()
    expect(within(row as HTMLTableRowElement).getByText('14')).toBeTruthy()
  })

  it('updates quantities when switching warehouse filter', () => {
    render(
      React.createElement(InventoryView, {
        warehouses: [
          { id: 1, name: '오금동' },
          { id: 2, name: '대자동' },
        ],
        models: [
          {
            id: 1,
            name: 'LP01',
            sizes: [{ id: 10, name: 'S', sortOrder: 1, modelId: 1 }],
            colors: [
              { id: 20, name: '네이비', rgbCode: '#111111', textWhite: true, sortOrder: 1, modelId: 1 },
            ],
            inventory: [
              { id: 101, modelId: 1, sizeId: 10, colorId: 20, warehouseId: 1, warehouseName: '오금동', quantity: 2 },
              { id: 102, modelId: 1, sizeId: 10, colorId: 20, warehouseId: 2, warehouseName: '대자동', quantity: 7 },
            ],
          },
        ],
      })
    )

    fireEvent.change(screen.getByLabelText('창고 보기'), { target: { value: '2' } })

    const row = screen.getByText('네이비').closest('tr')
    expect(row).not.toBeNull()
    expect(within(row as HTMLTableRowElement).getAllByText('7')).toHaveLength(2)
  })
})

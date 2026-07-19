// @vitest-environment jsdom
import React from 'react'
import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, within } from '@testing-library/react'

import { InventoryDataTable, type InventoryColumnKey, type InventoryDataRow } from '@/components/ui/inventory-data-table'

const ALL_COLUMNS: Set<InventoryColumnKey> = new Set([
  'modelName',
  'skuOption',
  'warehouseName',
  'onHand',
  'committed',
  'available',
  'incoming',
  'status',
])

function makeRow(overrides: Partial<InventoryDataRow> = {}): InventoryDataRow {
  return {
    key: '1:11:21:1',
    modelName: 'LP01',
    skuOption: 'LP01-네이비-S',
    warehouseName: '오금동',
    onHand: 8,
    committed: 2,
    available: 6,
    incoming: 0,
    status: { label: '정상', variant: 'success' },
    ...overrides,
  }
}

describe('InventoryDataTable row action', () => {
  it('does not render an actions column when no row provides onAdjust', () => {
    render(React.createElement(InventoryDataTable, { rows: [makeRow()], visibleColumns: ALL_COLUMNS }))

    expect(screen.queryByRole('button', { name: '조정' })).toBeNull()
  })

  it('renders a per-row 조정 action that calls back with that row only, leaving other rows unaffected', () => {
    const onAdjustA = vi.fn()
    const onAdjustB = vi.fn()

    render(
      React.createElement(InventoryDataTable, {
        rows: [
          makeRow({ key: 'row-a', modelName: 'LP01', onAdjust: onAdjustA }),
          makeRow({ key: 'row-b', modelName: 'LP02', onAdjust: onAdjustB }),
        ],
        visibleColumns: ALL_COLUMNS,
      }),
    )

    const table = screen.getByRole('table')
    const rows = within(table).getAllByRole('row').slice(1) // drop header row
    expect(rows).toHaveLength(2)

    fireEvent.click(within(rows[0]).getByRole('button', { name: '조정' }))
    expect(onAdjustA).toHaveBeenCalledTimes(1)
    expect(onAdjustB).not.toHaveBeenCalled()
  })

  it('leaves the actions cell empty for rows without an addressable variant to adjust', () => {
    const onAdjust = vi.fn()

    render(
      React.createElement(InventoryDataTable, {
        rows: [makeRow({ key: 'row-a', onAdjust }), makeRow({ key: 'row-b', onAdjust: undefined })],
        visibleColumns: ALL_COLUMNS,
      }),
    )

    expect(screen.getAllByRole('button', { name: '조정' })).toHaveLength(1)
  })

  it('accounts for the actions column when sizing the empty-state colspan', () => {
    render(
      React.createElement(InventoryDataTable, {
        rows: [],
        visibleColumns: ALL_COLUMNS,
      }),
    )

    expect(screen.getByText('조회 조건에 맞는 재고가 없습니다.')).toBeTruthy()
  })
})

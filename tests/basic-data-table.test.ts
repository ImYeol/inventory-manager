// @vitest-environment jsdom
import React from 'react'
import { describe, expect, it } from 'vitest'
import { render, screen, within } from '@testing-library/react'

import { BasicDataTable } from '@/components/ui/basic-data-table'

describe('BasicDataTable', () => {
  it('renders headers, row cells, and the empty state consistently', () => {
    const columns = [
      { key: 'name', label: '상품' },
      { key: 'quantity', label: '수량', align: 'right' as const },
    ]

    const { rerender } = render(
      React.createElement(BasicDataTable<{ id: number; name: string; quantity: number }>, {
        columns,
        rows: [{ id: 1, name: 'LP01', quantity: 3 }],
        rowKey: (row) => row.id,
        renderCell: (row, columnKey) => (columnKey === 'name' ? row.name : row.quantity),
        emptyState: '데이터가 없습니다.',
      }),
    )

    const table = screen.getByRole('table')
    expect(within(table).getByText('상품')).toBeTruthy()
    expect(within(table).getByText('수량')).toBeTruthy()
    expect(within(table).getByText('LP01')).toBeTruthy()
    expect(within(table).getByText('3')).toBeTruthy()

    rerender(
      React.createElement(BasicDataTable<{ id: number; name: string; quantity: number }>, {
        columns,
        rows: [],
        rowKey: (row) => row.id,
        renderCell: (row, columnKey) => (columnKey === 'name' ? row.name : row.quantity),
        emptyState: '데이터가 없습니다.',
      }),
    )

    expect(screen.getByText('데이터가 없습니다.')).toBeTruthy()
  })
})

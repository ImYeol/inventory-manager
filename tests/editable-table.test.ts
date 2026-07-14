// @vitest-environment jsdom
import React from 'react'
import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, within } from '@testing-library/react'

import { EditableTable } from '@/components/ui/editable-table'

type Row = { id: string; name: string; quantity: number; error?: string }

const columns = [
  { key: 'name', header: '상품' },
  { key: 'quantity', header: '수량', align: 'right' as const },
]

const rows: Row[] = [
  { id: 'row-1', name: 'LP01', quantity: 3 },
  { id: 'row-2', name: 'LP02', quantity: 5, error: '수량을 확인해주세요.' },
]

describe('EditableTable', () => {
  it('renders columns and rows through the supplied cell renderer', () => {
    const renderCell = vi.fn((row: Row, columnKey: string) => row[columnKey as 'name' | 'quantity'])

    render(
      React.createElement(EditableTable<Row>, {
        columns,
        rows,
        getRowKey: (row) => row.id,
        renderCell,
      }),
    )

    const table = screen.getByRole('table')
    expect(within(table).getByText('상품')).toBeTruthy()
    expect(within(table).getByText('수량')).toBeTruthy()
    expect(within(table).getByText('LP01')).toBeTruthy()
    expect(within(table).getByText('5')).toBeTruthy()
    expect(renderCell).toHaveBeenCalledTimes(4)
    expect(renderCell).toHaveBeenCalledWith(rows[0], 'name', 0)
  })

  it('fires add, duplicate, and delete callbacks', () => {
    const onAddRow = vi.fn()
    const onDuplicateRow = vi.fn()
    const onDeleteRow = vi.fn()

    render(
      React.createElement(EditableTable<Row>, {
        columns,
        rows,
        getRowKey: (row) => row.id,
        renderCell: (row, columnKey) => row[columnKey as 'name' | 'quantity'],
        onAddRow,
        onDuplicateRow,
        onDeleteRow,
      }),
    )

    fireEvent.click(screen.getByRole('button', { name: '행 추가' }))
    fireEvent.click(screen.getAllByRole('button', { name: '행 복제' })[0])
    fireEvent.click(screen.getAllByRole('button', { name: '행 삭제' })[0])

    expect(onAddRow).toHaveBeenCalledOnce()
    expect(onDuplicateRow).toHaveBeenCalledWith('row-1')
    expect(onDeleteRow).toHaveBeenCalledWith('row-1')
  })

  it('disables deletion when the minimum row count is reached', () => {
    render(
      React.createElement(EditableTable<Row>, {
        columns,
        rows: [rows[0]],
        getRowKey: (row) => row.id,
        renderCell: (row, columnKey) => row[columnKey as 'name' | 'quantity'],
        onDeleteRow: vi.fn(),
        minRows: 1,
      }),
    )

    expect(screen.getByRole('button', { name: '행 삭제' }).getAttribute('disabled')).not.toBeNull()
  })

  it('renders an inline error for invalid rows', () => {
    render(
      React.createElement(EditableTable<Row>, {
        columns,
        rows,
        getRowKey: (row) => row.id,
        renderCell: (row, columnKey) => row[columnKey as 'name' | 'quantity'],
        rowError: (row) => row.error ?? null,
      }),
    )

    expect(screen.getByText('수량을 확인해주세요.')).toBeTruthy()
  })
})

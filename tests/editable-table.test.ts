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
    expect(within(table).getByRole('columnheader', { name: '상품' })).toHaveClass('px-4', 'sticky', 'top-0')
    expect(within(table).getByText('LP01').closest('td')).toHaveClass('min-h-12')
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

  it('does not render a validation summary when it is not supplied', () => {
    render(
      React.createElement(EditableTable<Row>, {
        columns,
        rows: [rows[0]],
        getRowKey: (row) => row.id,
        renderCell: (row, columnKey) => row[columnKey as 'name' | 'quantity'],
      }),
    )

    expect(screen.queryByRole('alert', { name: '입력 오류' })).toBeNull()
  })

  it('renders an accessible validation summary above the table and keeps row errors', () => {
    render(
      React.createElement(EditableTable<Row>, {
        columns,
        rows,
        getRowKey: (row) => row.id,
        renderCell: (row, columnKey) => row[columnKey as 'name' | 'quantity'],
        rowError: (row) => row.error ?? null,
        validationSummary: React.createElement(
          'span',
          null,
          '입력 오류 1건을 수정해주세요.',
        ),
      }),
    )

    const summary = screen.getByRole('alert', { name: '입력 오류' })
    const table = screen.getByRole('table')

    expect(summary).toHaveTextContent('입력 오류 1건을 수정해주세요.')
    expect(summary.compareDocumentPosition(table) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    expect(screen.getByText('수량을 확인해주세요.')).toBeTruthy()
  })

  it('keeps editable rows at the larger input density and exposes column alignment', () => {
    render(
      React.createElement(EditableTable<Row>, {
        columns,
        rows: [rows[0]],
        getRowKey: (row) => row.id,
        renderCell: (row, columnKey) => row[columnKey as 'name' | 'quantity'],
      }),
    )

    expect(screen.getByText('LP01').closest('tr')).toHaveClass('min-h-12')
    expect(screen.getByText('3').closest('td')).toHaveClass('text-right')
  })
})

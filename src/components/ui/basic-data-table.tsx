import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './table'

type BasicDataTableColumn = {
  key: string
  label: ReactNode
  align?: 'left' | 'right'
}

type BasicDataTableProps<Row> = {
  columns: BasicDataTableColumn[]
  rows: Row[]
  rowKey: (row: Row) => string | number
  renderCell: (row: Row, columnKey: string) => ReactNode
  emptyState: ReactNode
  onRowClick?: (row: Row) => void
  rowAriaLabel?: (row: Row) => string
  getRowClassName?: (row: Row) => string | undefined
  className?: string
}

export function BasicDataTable<Row>({
  columns,
  rows,
  rowKey,
  renderCell,
  emptyState,
  onRowClick,
  rowAriaLabel,
  getRowClassName,
  className,
}: BasicDataTableProps<Row>) {
  return (
    <div className={cn('ui-table-shell', className)}>
      <div className="overflow-x-auto">
        <Table>
          <TableHeader className="[&_tr:hover]:bg-transparent">
            <TableRow className="ui-table-head text-left">
              {columns.map((column) => (
                <TableHead
                  key={column.key}
                  className={cn(
                    column.align === 'right' && 'text-right',
                  )}
                >
                  {column.label}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={columns.length} className="!px-4 !py-10 text-center text-sm !text-slate-400">
                  {emptyState}
                </TableCell>
              </TableRow>
            ) : (
              rows.map((row) => (
                <TableRow
                  key={rowKey(row)}
                  tabIndex={onRowClick ? 0 : undefined}
                  aria-label={rowAriaLabel?.(row)}
                  className={cn(
                    onRowClick &&
                      'cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--focus-ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-white',
                    getRowClassName?.(row),
                  )}
                  onClick={onRowClick ? () => onRowClick(row) : undefined}
                  onKeyDown={
                    onRowClick
                      ? (event) => {
                          if (event.key !== 'Enter' && event.key !== ' ') {
                            return
                          }

                          event.preventDefault()
                          onRowClick(row)
                        }
                      : undefined
                  }
                >
                  {columns.map((column) => (
                    <TableCell
                      key={column.key}
                      className={cn(
                        column.align === 'right' && 'text-right',
                      )}
                    >
                      {renderCell(row, column.key)}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}

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
  className?: string
}

export function BasicDataTable<Row>({
  columns,
  rows,
  rowKey,
  renderCell,
  emptyState,
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
                <TableRow key={rowKey(row)}>
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

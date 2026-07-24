import { Fragment, type CSSProperties, type ReactNode } from 'react'
import { Copy, Trash2 } from 'lucide-react'

import { cn } from '@/lib/utils'
import { Button } from './button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './table'
import { TableSurface } from './table-surface'

export type EditableTableColumn = {
  key: string
  header: ReactNode
  align?: 'left' | 'center' | 'right'
  width?: string
  headerSrOnly?: boolean
}

export type EditableTableProps<Row> = {
  columns: EditableTableColumn[]
  rows: Row[]
  getRowKey: (row: Row) => string
  renderCell: (row: Row, columnKey: string, rowIndex: number) => ReactNode
  onAddRow?: () => void
  onDeleteRow?: (key: string) => void
  onDuplicateRow?: (key: string) => void
  rowError?: (row: Row) => string | null
  minRows?: number
  addLabel?: string
  validationSummary?: ReactNode
  className?: string
  disabled?: boolean
}

const alignmentClassNames = {
  left: 'text-left',
  center: 'text-center',
  right: 'text-right',
} as const

export function EditableTable<Row>({
  columns,
  rows,
  getRowKey,
  renderCell,
  onAddRow,
  onDeleteRow,
  onDuplicateRow,
  rowError,
  minRows = 1,
  addLabel = '행 추가',
  validationSummary,
  className,
  disabled = false,
}: EditableTableProps<Row>): React.JSX.Element {
  const hasRowActions = Boolean(onDuplicateRow || onDeleteRow)
  const columnCount = columns.length + (hasRowActions ? 1 : 0)

  return (
    <TableSurface className={className} footer={onAddRow ? (
      <Button type="button" variant="secondary" size="sm" disabled={disabled} onClick={onAddRow}>
        {addLabel}
      </Button>
    ) : undefined}>
      {validationSummary != null ? (
        <div
          role="alert"
          aria-label="입력 오류"
          className="mx-4 my-3 rounded-[var(--radius-control)] border border-[color:var(--border)] bg-[color:var(--surface-muted)] px-3 py-2 text-sm text-[color:var(--danger-foreground)]"
        >
          {validationSummary}
        </div>
      ) : null}
      <div className="overflow-x-auto">
        <Table aria-disabled={disabled || undefined}>
          <colgroup>
            {columns.map((column) => (
              <col key={column.key} style={column.width ? ({ width: column.width } satisfies CSSProperties) : undefined} />
            ))}
            {hasRowActions ? <col /> : null}
          </colgroup>
          <TableHeader className="[&_tr:hover]:bg-transparent">
            <TableRow className="bg-[color:var(--surface-muted)] hover:bg-[color:var(--surface-muted)]">
              {columns.map((column) => (
                <TableHead
                  key={column.key}
                  className={cn('sticky top-0 bg-[color:var(--surface-muted)]', alignmentClassNames[column.align ?? 'left'])}
                >
                  {column.headerSrOnly ? <span className="sr-only">{column.header}</span> : column.header}
                </TableHead>
              ))}
              {hasRowActions ? (
                <TableHead className="sticky top-0 bg-[color:var(--surface-muted)] text-right">
                  <span className="sr-only">행 작업</span>
                </TableHead>
              ) : null}
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row, rowIndex) => {
              const key = getRowKey(row)
              const error = rowError?.(row) ?? null
              const deleteDisabled = disabled || rows.length <= minRows

              return (
                <Fragment key={key}>
                  <TableRow className={cn('h-12 min-h-12', error ? 'bg-[color:var(--surface-muted)] hover:bg-[color:var(--surface-muted)]' : undefined)}>
                    {columns.map((column) => (
                      <TableCell key={column.key} className={cn('h-12 min-h-12', alignmentClassNames[column.align ?? 'left'])}>
                        {renderCell(row, column.key, rowIndex)}
                      </TableCell>
                    ))}
                    {hasRowActions ? (
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-[var(--space-1)]">
                          {onDuplicateRow ? (
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon-sm"
                              aria-label="행 복제"
                              disabled={disabled}
                              onClick={() => onDuplicateRow(key)}
                            >
                              <Copy aria-hidden="true" />
                            </Button>
                          ) : null}
                          {onDeleteRow ? (
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon-sm"
                              aria-label="행 삭제"
                              disabled={deleteDisabled}
                              onClick={() => onDeleteRow(key)}
                            >
                              <Trash2 aria-hidden="true" />
                            </Button>
                          ) : null}
                        </div>
                      </TableCell>
                    ) : null}
                  </TableRow>
                  {error ? (
                    <TableRow className="bg-[color:var(--surface-muted)] hover:bg-[color:var(--surface-muted)]">
                      <TableCell colSpan={columnCount} className="pt-0 text-[color:var(--danger-foreground)]">
                        <p role="alert">{error}</p>
                      </TableCell>
                    </TableRow>
                  ) : null}
                </Fragment>
              )
            })}
          </TableBody>
        </Table>
      </div>
    </TableSurface>
  )
}

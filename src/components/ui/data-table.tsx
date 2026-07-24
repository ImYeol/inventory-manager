'use client'

import React, { ReactNode, useEffect, useState, type CSSProperties } from 'react'
import {
  ColumnDef,
  PaginationState,
  RowData,
  SortingState,
  VisibilityState,
  flexRender,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from '@tanstack/react-table'
import { ArrowUp, ArrowDown, ChevronLeft, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './table'
import { TableSurface } from './table-surface'
import { ActionRow, ActionRowEnd, ActionRowStart, FilterToolbar, QueryRow, QueryRowEnd, QueryRowStart, type ActionRowAlignment } from './filter-toolbar'
import { ColumnVisibilityMenu, ColumnOption } from './column-visibility-menu'
import { Button } from './button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './select'
import { Skeleton } from './skeleton'
import { TruncatedText } from './truncated-text'

// Lets column definitions carry layout hints (width/alignment) without every
// consumer re-deriving header/cell className logic.
declare module '@tanstack/react-table' {
  interface ColumnMeta<TData extends RowData, TValue> {
    headerClassName?: string
    cellClassName?: string
    role?: 'identity' | 'numeric' | 'status' | 'action' | 'text'
    minWidth?: 'identity' | 'numeric' | 'status' | string
    align?: 'left' | 'center' | 'right'
    priority?: 'high' | 'medium' | 'low' | number
    truncate?: boolean | 'primary' | 'secondary'
  }
}

const DEFAULT_PAGE_SIZE_OPTIONS = [10, 20, 50]

export type DataTableProps<TData> = {
  columns: ColumnDef<TData, unknown>[]
  rows: TData[]
  emptyState: ReactNode
  dataEmptyState?: ReactNode
  filteredEmptyState?: ReactNode
  emptyStateKind?: 'dataset' | 'filtered'
  emptyStateAction?: ReactNode
  onResetFilters?: () => void
  onRowClick?: (row: TData) => void
  rowAriaLabel?: (row: TData) => string
  getRowClassName?: (row: TData) => string | undefined
  /** Sets a `data-state` attribute on the row (e.g. `'selected'`) for row-highlight styling. */
  getRowDataState?: (row: TData) => string | undefined
  className?: string
  tableAriaLabel?: string
  /** Render without the standalone surface chrome (toolbar/footer/border), for use inside another TableSurface. */
  bare?: boolean
  mode?: 'standalone' | 'bare'
  /** Left-aligned toolbar content, e.g. a search input. Ignored when `bare`. */
  toolbarStart?: ReactNode
  /** Right-aligned toolbar content rendered before the column-visibility menu, e.g. a primary action button. Ignored when `bare`. */
  toolbarEnd?: ReactNode
  queryRow?: ReactNode
  actionRow?: ReactNode
  queryStart?: ReactNode
  queryEnd?: ReactNode
  actionStart?: ReactNode
  actionEnd?: ReactNode
  /** Explicit alignment for action-only rows. Split remains the default when both slots are present. */
  actionAlignment?: ActionRowAlignment
  /** Page-size choices for the pagination footer. Pass an empty array to disable pagination. Ignored when `bare`. */
  pageSizeOptions?: number[]
  initialPageSize?: number
  loading?: boolean
  errorState?: ReactNode
}

export function DataTable<TData extends Record<string, unknown>>({
  columns,
  rows,
  emptyState,
  dataEmptyState,
  filteredEmptyState,
  emptyStateKind = 'dataset',
  emptyStateAction,
  onResetFilters,
  onRowClick,
  rowAriaLabel,
  getRowClassName,
  getRowDataState,
  className,
  tableAriaLabel,
  bare,
  mode,
  toolbarStart,
  toolbarEnd,
  queryRow,
  actionRow,
  queryStart,
  queryEnd,
  actionStart,
  actionEnd,
  actionAlignment = 'split',
  pageSizeOptions = DEFAULT_PAGE_SIZE_OPTIONS,
  initialPageSize = DEFAULT_PAGE_SIZE_OPTIONS[0],
  loading = false,
  errorState,
}: DataTableProps<TData>) {
  const [sorting, setSorting] = useState<SortingState>([])
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({})
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: initialPageSize,
  })

  const isBare = mode === 'bare' || bare === true
  const paginated = !isBare && pageSizeOptions.length > 0

  // The consumer re-filters `rows` externally (search, status tabs, ...);
  // land back on page 1 whenever the underlying data set changes so pagination
  // never strands the viewer on an empty trailing page.
  useEffect(() => {
    setPagination((current) => (current.pageIndex === 0 ? current : { ...current, pageIndex: 0 }))
  }, [rows])

  const table = useReactTable({
    data: rows,
    columns,
    state: {
      sorting,
      columnVisibility,
      ...(paginated ? { pagination } : {}),
    },
    onSortingChange: setSorting,
    onColumnVisibilityChange: setColumnVisibility,
    onPaginationChange: paginated ? setPagination : undefined,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    ...(paginated ? { getPaginationRowModel: getPaginationRowModel() } : {}),
  })

  // Build column options for ColumnVisibilityMenu
  const columnOptions: ColumnOption<string>[] = table
    .getAllLeafColumns()
    .filter((col) => col.getCanHide())
    .map((col) => ({
      key: col.id,
      label: typeof col.columnDef.header === 'string' ? col.columnDef.header : col.id,
    }))

  const handleColumnToggle = (columnId: string) => {
    table.getColumn(columnId)?.toggleVisibility()
  }

  const visibleColumnIds = new Set<string>(
    table
      .getVisibleLeafColumns()
      .filter((col) => col.getCanHide())
      .map((col) => col.id)
  )

  const columnMenu =
    !isBare && columnOptions.length > 0 ? (
      <ColumnVisibilityMenu columns={columnOptions} visibleColumns={visibleColumnIds} onToggle={handleColumnToggle} />
    ) : null

  const tableElement = (
    <div className="overflow-x-auto">
      <Table aria-label={tableAriaLabel}>
        <TableHeader className="[&_tr:hover]:bg-transparent">
          <TableRow className="ui-table-head text-left">
            {table.getHeaderGroups().map((headerGroup) =>
              headerGroup.headers.map((header) => {
                const enableSorting = header.column.columnDef.enableSorting !== false && header.column.getCanSort()
                const meta = header.column.columnDef.meta
                const align = columnAlignment(meta)
                const sorted = header.column.getIsSorted()
                return (
                  <TableHead
                    key={header.id}
                    className={cn(
                      'sticky top-0 whitespace-nowrap',
                      align === 'center' && 'text-center',
                      align === 'right' && 'text-right',
                      meta?.headerClassName,
                    )}
                    aria-sort={enableSorting ? (sorted === false ? 'none' : sorted === 'asc' ? 'ascending' : 'descending') : undefined}
                    data-column-priority={meta?.priority}
                    data-column-role={meta?.role}
                    style={columnStyle(meta?.minWidth, meta?.role)}
                  >
                    {enableSorting ? (
                      <button
                        type="button"
                        className={cn(
                          'inline-flex max-w-full min-w-0 items-center gap-2 text-inherit',
                          align === 'center' && 'mx-auto',
                          align === 'right' && 'ml-auto',
                        )}
                        onClick={() => header.column.toggleSorting()}
                        aria-label={`${String(header.column.columnDef.header ?? header.column.id)} 정렬`}
                      >
                        <span className="truncate">
                          {flexRender(header.column.columnDef.header, header.getContext())}
                        </span>
                        <div className="flex items-center">
                          {sorted === 'asc' && <ArrowUp data-icon="inline-end" aria-hidden="true" />}
                          {sorted === 'desc' && <ArrowDown data-icon="inline-end" aria-hidden="true" />}
                        </div>
                      </button>
                    ) : (
                      <span>{flexRender(header.column.columnDef.header, header.getContext())}</span>
                    )}
                  </TableHead>
                )
              })
            )}
          </TableRow>
        </TableHeader>
        <TableBody>
          {loading ? (
            Array.from({ length: 3 }, (_, index) => (
              <TableRow key={`loading-${index}`} data-testid="skeleton-row">
                <TableCell colSpan={table.getVisibleLeafColumns().length} className="py-3">
                  <div
                    role={index === 0 ? 'status' : undefined}
                    aria-label={index === 0 ? '표를 불러오는 중' : undefined}
                    className="flex items-center gap-3"
                  >
                    {table.getVisibleLeafColumns().map((column, cellIndex) => (
                      <Skeleton key={column.id} className={cn('h-4', cellIndex === 0 ? 'w-2/3' : 'w-1/2')} />
                    ))}
                  </div>
                </TableCell>
              </TableRow>
            ))
          ) : errorState ? (
            <TableRow>
              <TableCell colSpan={columns.length} className="py-10 text-center">
                <div role="alert">{errorState}</div>
              </TableCell>
            </TableRow>
          ) : rows.length === 0 ? (
            <TableRow>
              <TableCell
                colSpan={columns.length}
                className="!px-4 !py-10 text-center text-sm !text-[color:var(--muted-foreground)]"
              >
                <div className="flex flex-col items-center gap-3">
                  <span>{emptyStateKind === 'filtered' ? filteredEmptyState ?? emptyState : dataEmptyState ?? emptyState}</span>
                  {emptyStateKind === 'filtered' && onResetFilters ? (
                    <Button type="button" variant="outline" size="sm" onClick={onResetFilters}>
                      필터 초기화
                    </Button>
                  ) : null}
                  {emptyStateAction}
                </div>
              </TableCell>
            </TableRow>
          ) : (
            table.getRowModel().rows.map((row) => (
              <TableRow
                key={row.id}
                tabIndex={onRowClick ? 0 : undefined}
                aria-label={rowAriaLabel?.(row.original)}
                data-state={getRowDataState?.(row.original)}
                className={cn(
                  onRowClick &&
                    'cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--focus-ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-[color:var(--background)]',
                  getRowClassName?.(row.original),
                )}
                onClick={onRowClick ? () => onRowClick(row.original) : undefined}
                onKeyDown={
                  onRowClick
                    ? (event) => {
                        if (event.key !== 'Enter' && event.key !== ' ') {
                          return
                        }
                        event.preventDefault()
                        onRowClick(row.original)
                      }
                    : undefined
                }
              >
                {row.getVisibleCells().map((cell) => (
                  <TableCell
                    key={cell.id}
                    className={cn(
                      columnAlignment(cell.column.columnDef.meta) === 'left' && 'text-left',
                      columnAlignment(cell.column.columnDef.meta) === 'center' && 'text-center',
                      columnAlignment(cell.column.columnDef.meta) === 'right' && 'text-right',
                      cell.column.columnDef.meta?.cellClassName,
                    )}
                    data-column-role={cell.column.columnDef.meta?.role}
                    data-column-priority={cell.column.columnDef.meta?.priority}
                    style={columnStyle(cell.column.columnDef.meta?.minWidth, cell.column.columnDef.meta?.role)}
                  >
                    {cell.column.columnDef.meta?.truncate ? (
                      <TruncatedText
                        value={String(cell.getValue() ?? '')}
                        variant={cell.column.columnDef.meta?.truncate === 'primary' ? 'primary' : 'secondary'}
                      >
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </TruncatedText>
                    ) : (
                      flexRender(cell.column.columnDef.cell, cell.getContext())
                    )}
                  </TableCell>
                ))}
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  )

  if (isBare) {
    const bareContent = tableElement
    return <div className={className}>{bareContent}</div>
  }

  const resolvedQueryStart = queryStart ?? queryRow ?? (toolbarStart ? <div className="flex min-w-0 items-center gap-2">{toolbarStart}</div> : null)
  const resolvedQueryEnd = queryEnd ?? null
  const resolvedActionStart = actionStart ?? actionRow ?? null
  const resolvedActionEnd = actionEnd ?? (toolbarEnd ? <div className="flex items-center gap-2">{toolbarEnd}</div> : null)
  const hasToolbar = Boolean(resolvedQueryStart || resolvedQueryEnd || resolvedActionStart || resolvedActionEnd || columnMenu)

  return (
    <div className={cn('flex min-w-0 flex-col gap-3', className)}>
      {hasToolbar ? (
        <div className="ui-data-controls flex flex-col gap-2">
          {resolvedActionStart || resolvedActionEnd ? (
            <ActionRow align={actionAlignment}>
              {resolvedActionStart ? <ActionRowStart>{resolvedActionStart}</ActionRowStart> : null}
              {resolvedActionEnd ? <ActionRowEnd>{resolvedActionEnd}</ActionRowEnd> : null}
            </ActionRow>
          ) : null}
          {resolvedQueryStart || resolvedQueryEnd || columnMenu ? (
            <FilterToolbar>
              <QueryRow className="flex-1">
                {resolvedQueryStart ? <QueryRowStart>{resolvedQueryStart}</QueryRowStart> : null}
                {resolvedQueryEnd || columnMenu ? <QueryRowEnd>{resolvedQueryEnd}{columnMenu}</QueryRowEnd> : null}
              </QueryRow>
            </FilterToolbar>
          ) : null}
        </div>
      ) : null}
      <TableSurface
        footer={paginated ? <DataTablePaginationFooter table={table} pageSizeOptions={pageSizeOptions} /> : undefined}
      >
        {tableElement}
      </TableSurface>
    </div>
  )
}

function columnStyle(
  minWidth: string | undefined,
  role: 'identity' | 'numeric' | 'status' | 'action' | 'text' | undefined,
): CSSProperties | undefined {
  const semanticWidth = minWidth ?? (role === 'identity' || role === 'numeric' || role === 'status' ? role : undefined)
  if (!semanticWidth) return undefined
  const token =
    semanticWidth === 'identity'
      ? 'var(--table-col-identity-min)'
      : semanticWidth === 'numeric'
        ? 'var(--table-col-numeric-min)'
        : semanticWidth === 'status'
          ? 'var(--table-col-status-min)'
          : semanticWidth
  return { minWidth: token }
}

function columnAlignment(meta: {
  role?: 'identity' | 'numeric' | 'status' | 'action' | 'text'
  align?: 'left' | 'center' | 'right'
} | undefined): 'left' | 'center' | 'right' {
  if (meta?.align) return meta.align
  if (meta?.role === 'numeric' || meta?.role === 'action') return 'right'
  if (meta?.role === 'status') return 'center'
  return 'left'
}

function DataTablePaginationFooter<TData>({
  table,
  pageSizeOptions,
}: {
  table: ReturnType<typeof useReactTable<TData>>
  pageSizeOptions: number[]
}) {
  const { pageIndex, pageSize } = table.getState().pagination
  const totalRows = table.getFilteredRowModel().rows.length
  const pageCount = table.getPageCount()
  const start = totalRows === 0 ? 0 : pageIndex * pageSize + 1
  const end = Math.min(totalRows, (pageIndex + 1) * pageSize)

  return (
    <div className="flex w-full flex-wrap items-center justify-between gap-3">
      <span className="tabular-nums">{totalRows === 0 ? '0건' : `${start}-${end} / 전체 ${totalRows}건`}</span>

      <div className="flex items-center gap-3">
        <div className="flex items-center gap-1.5">
          <label htmlFor="data-table-page-size" className="whitespace-nowrap">
            페이지당 행
          </label>
          <Select value={String(pageSize)} onValueChange={(value) => value && table.setPageSize(Number(value))}>
            <SelectTrigger id="data-table-page-size" aria-label="페이지당 행 수" className="ui-control ui-control-sm h-8 w-[4.5rem]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {pageSizeOptions.map((size) => (
                <SelectItem key={size} value={String(size)}>
                  {size}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-1">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-8 w-8 p-0"
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
            aria-label="이전 페이지"
          >
            <ChevronLeft aria-hidden="true" />
          </Button>
          <span className="min-w-[3.5rem] text-center tabular-nums">
            {pageCount === 0 ? '0 / 0' : `${pageIndex + 1} / ${pageCount}`}
          </span>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-8 w-8 p-0"
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
            aria-label="다음 페이지"
          >
            <ChevronRight aria-hidden="true" />
          </Button>
        </div>
      </div>
    </div>
  )
}

'use client'

import React, { ReactNode, useEffect, useState } from 'react'
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
import { FilterToolbar } from './filter-toolbar'
import { ColumnVisibilityMenu, ColumnOption } from './column-visibility-menu'
import { Button } from './button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './select'

// Lets column definitions carry layout hints (width/alignment) without every
// consumer re-deriving header/cell className logic.
declare module '@tanstack/react-table' {
  interface ColumnMeta<TData extends RowData, TValue> {
    headerClassName?: string
    cellClassName?: string
  }
}

const DEFAULT_PAGE_SIZE_OPTIONS = [10, 20, 50]

export type DataTableProps<TData> = {
  columns: ColumnDef<TData, unknown>[]
  rows: TData[]
  emptyState: ReactNode
  onRowClick?: (row: TData) => void
  rowAriaLabel?: (row: TData) => string
  getRowClassName?: (row: TData) => string | undefined
  /** Sets a `data-state` attribute on the row (e.g. `'selected'`) for row-highlight styling. */
  getRowDataState?: (row: TData) => string | undefined
  className?: string
  tableAriaLabel?: string
  /** Render without the standalone surface chrome (toolbar/footer/border), for use inside another TableSurface. */
  bare?: boolean
  /** Left-aligned toolbar content, e.g. a search input. Ignored when `bare`. */
  toolbarStart?: ReactNode
  /** Right-aligned toolbar content rendered before the column-visibility menu, e.g. a primary action button. Ignored when `bare`. */
  toolbarEnd?: ReactNode
  /** Page-size choices for the pagination footer. Pass an empty array to disable pagination. Ignored when `bare`. */
  pageSizeOptions?: number[]
  initialPageSize?: number
}

export function DataTable<TData extends Record<string, unknown>>({
  columns,
  rows,
  emptyState,
  onRowClick,
  rowAriaLabel,
  getRowClassName,
  getRowDataState,
  className,
  tableAriaLabel,
  bare,
  toolbarStart,
  toolbarEnd,
  pageSizeOptions = DEFAULT_PAGE_SIZE_OPTIONS,
  initialPageSize = DEFAULT_PAGE_SIZE_OPTIONS[0],
}: DataTableProps<TData>) {
  const [sorting, setSorting] = useState<SortingState>([])
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({})
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: initialPageSize,
  })

  const paginated = !bare && pageSizeOptions.length > 0

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
    columnOptions.length > 0 ? (
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
                return (
                  <TableHead
                    key={header.id}
                    className={cn('whitespace-nowrap', header.column.columnDef.meta?.headerClassName)}
                    onClick={enableSorting ? () => header.column.toggleSorting() : undefined}
                    style={{ cursor: enableSorting ? 'pointer' : 'default' }}
                  >
                    <div className="flex items-center gap-2">
                      <span>{flexRender(header.column.columnDef.header, header.getContext())}</span>
                      {enableSorting && (
                        <div className="flex items-center">
                          {header.column.getIsSorted() === 'asc' && <ArrowUp className="h-4 w-4" />}
                          {header.column.getIsSorted() === 'desc' && <ArrowDown className="h-4 w-4" />}
                        </div>
                      )}
                    </div>
                  </TableHead>
                )
              })
            )}
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.length === 0 ? (
            <TableRow>
              <TableCell
                colSpan={columns.length}
                className="!px-4 !py-10 text-center text-sm !text-[color:var(--muted-foreground)]"
              >
                {emptyState}
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
                  <TableCell key={cell.id} className={cell.column.columnDef.meta?.cellClassName}>
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </TableCell>
                ))}
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  )

  if (bare) {
    const bareContent =
      columnOptions.length > 0 ? (
        <div className="flex flex-col gap-4">
          {columnMenu}
          {tableElement}
        </div>
      ) : (
        tableElement
      )
    return <div className={className}>{bareContent}</div>
  }

  const hasToolbar = Boolean(toolbarStart || toolbarEnd || columnMenu)

  return (
    <TableSurface
      className={className}
      toolbar={
        hasToolbar ? (
          <FilterToolbar>
            <div className="flex min-w-0 flex-1 items-center gap-2">{toolbarStart}</div>
            <div className="flex flex-nowrap items-center gap-2 overflow-x-auto">
              {toolbarEnd}
              {columnMenu}
            </div>
          </FilterToolbar>
        ) : undefined
      }
      footer={paginated ? <DataTablePaginationFooter table={table} pageSizeOptions={pageSizeOptions} /> : undefined}
    >
      {tableElement}
    </TableSurface>
  )
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
            <ChevronLeft className="h-4 w-4" />
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
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  )
}

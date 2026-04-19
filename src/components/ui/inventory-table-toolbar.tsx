"use client"

import type { ReactNode } from 'react'

import { ColumnVisibilityMenu, type ColumnOption } from './column-visibility-menu'
import { FilterToolbar } from './filter-toolbar'
import { Input } from './input'
import { Button } from './button'
import { cx, ui } from '@/app/components/ui'

type WarehouseOption = {
  id: number
  name: string
}

type InventoryTableToolbarProps<T extends string> = {
  warehouses: WarehouseOption[]
  selectedWarehouseId: number | 'all'
  onWarehouseChange: (warehouseId: number | 'all') => void
  search: string
  onSearchChange: (value: string) => void
  statusFilter: 'all' | 'normal' | 'warning' | 'danger'
  onStatusFilterChange: (value: 'all' | 'normal' | 'warning' | 'danger') => void
  columns: Array<ColumnOption<T>>
  visibleColumns: Set<T>
  onToggleColumn: (column: T) => void
  onInbound: () => void
  onOutbound: () => void
  historyAction?: ReactNode
}

export function InventoryTableToolbar<T extends string>({
  warehouses,
  selectedWarehouseId,
  onWarehouseChange,
  search,
  onSearchChange,
  statusFilter,
  onStatusFilterChange,
  columns,
  visibleColumns,
  onToggleColumn,
  onInbound,
  onOutbound,
  historyAction,
}: InventoryTableToolbarProps<T>) {
  return (
    <FilterToolbar>
      <div className="flex flex-1 flex-col gap-2.5 lg:flex-row lg:flex-wrap lg:items-center">
        <div className="min-w-[11rem]">
          <label htmlFor="inventory-warehouse" className="sr-only">
            창고 선택
          </label>
          <select
            id="inventory-warehouse"
            value={selectedWarehouseId}
            onChange={(event) => onWarehouseChange(event.target.value === 'all' ? 'all' : Number(event.target.value))}
            className={cx(ui.controlSm, 'bg-white')}
          >
            <option value="all">전체 창고</option>
            {warehouses.map((warehouse) => (
              <option key={warehouse.id} value={warehouse.id}>
                {warehouse.name}
              </option>
            ))}
          </select>
        </div>

        <div className="min-w-[15rem] flex-1">
          <label htmlFor="inventory-search" className="sr-only">
            상품명 검색
          </label>
          <Input id="inventory-search" type="search" placeholder="상품명 검색" value={search} onChange={(event) => onSearchChange(event.target.value)} />
        </div>

        <div className="min-w-[10rem]">
          <label htmlFor="inventory-status" className="sr-only">
            상태 필터
          </label>
          <select
            id="inventory-status"
            value={statusFilter}
            onChange={(event) => onStatusFilterChange(event.target.value as typeof statusFilter)}
            className={ui.controlSm}
          >
            <option value="all">전체 상태</option>
            <option value="normal">정상</option>
            <option value="warning">주의</option>
            <option value="danger">품절</option>
          </select>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {historyAction}
        <ColumnVisibilityMenu columns={columns} visibleColumns={visibleColumns} onToggle={onToggleColumn} />
        <Button type="button" onClick={onInbound} size="sm" className="h-10 gap-2 rounded-xl px-3">
          입고
        </Button>
        <Button type="button" variant="secondary" onClick={onOutbound} size="sm" className="h-10 gap-2 rounded-xl px-3">
          출고
        </Button>
      </div>
    </FilterToolbar>
  )
}

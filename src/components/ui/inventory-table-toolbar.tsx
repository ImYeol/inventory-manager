"use client"

import { ColumnVisibilityMenu, type ColumnOption } from './column-visibility-menu'
import { FilterToolbar } from './filter-toolbar'
import { Input } from './input'
import { Button } from './button'
import { ui } from '@/app/components/ui'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './select'

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
}: InventoryTableToolbarProps<T>) {
  return (
    <FilterToolbar>
      <div className="flex flex-1 flex-col gap-2.5 lg:flex-row lg:flex-wrap lg:items-center">
        <div className="min-w-[11rem]">
          <label htmlFor="inventory-warehouse" className="sr-only">
            창고 선택
          </label>
          <Select
            value={selectedWarehouseId === 'all' ? 'all' : String(selectedWarehouseId)}
            onValueChange={(value) => onWarehouseChange(value == null || value === 'all' ? 'all' : Number(value))}
          >
            <SelectTrigger id="inventory-warehouse" className={ui.controlSm}>
              <SelectValue placeholder="전체 창고" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">전체 창고</SelectItem>
              {warehouses.map((warehouse) => (
                <SelectItem key={warehouse.id} value={String(warehouse.id)}>
                  {warehouse.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
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
          <Select
            value={statusFilter}
            onValueChange={(value) => onStatusFilterChange((value ?? 'all') as typeof statusFilter)}
          >
            <SelectTrigger id="inventory-status" className={ui.controlSm}>
              <SelectValue placeholder="전체 상태" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">전체 상태</SelectItem>
              <SelectItem value="normal">정상</SelectItem>
              <SelectItem value="warning">주의</SelectItem>
              <SelectItem value="danger">품절</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <ColumnVisibilityMenu columns={columns} visibleColumns={visibleColumns} onToggle={onToggleColumn} />
        <Button
          type="button"
          onClick={onInbound}
          size="sm"
          className="h-10 gap-2 rounded-xl px-3"
          style={{
            borderColor: 'color-mix(in srgb, #16a34a 26%, var(--border))',
            backgroundColor: '#16a34a',
            color: '#ffffff',
          }}
        >
          입고
        </Button>
        <Button
          type="button"
          variant="secondary"
          onClick={onOutbound}
          size="sm"
          className="h-10 gap-2 rounded-xl px-3"
          style={{
            borderColor: 'color-mix(in srgb, #f59e0b 26%, var(--border))',
            backgroundColor: '#fffbeb',
            color: '#92400e',
          }}
        >
          출고
        </Button>
      </div>
    </FilterToolbar>
  )
}

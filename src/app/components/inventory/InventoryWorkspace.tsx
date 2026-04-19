'use client'

import type { ReactNode } from 'react'
import { useMemo, useState } from 'react'
import { Minus, Plus } from 'lucide-react'
import InOutForm from '@/app/(protected)/inout/InOutForm'
import HistoryView from '@/app/(protected)/history/HistoryView'
import { PageHeader, cx, ui } from '@/app/components/ui'
import { ColumnVisibilityMenu } from '@/components/ui/column-visibility-menu'
import { FilterToolbar } from '@/components/ui/filter-toolbar'
import { Input } from '@/components/ui/input'
import { InventoryDataTable, type InventoryColumnKey, type InventoryDataRow } from '@/components/ui/inventory-data-table'

type InventoryItem = {
  id: number
  modelId: number
  sizeId: number
  colorId: number
  warehouseId: number
  warehouseName: string
  quantity: number
}

type ColorType = {
  id: number
  name: string
  rgbCode: string
  textWhite: boolean
  sortOrder: number
  modelId: number
}

type SizeType = {
  id: number
  name: string
  sortOrder: number
  modelId: number
}

type ModelWithRelations = {
  id: number
  name: string
  sizes: SizeType[]
  colors: ColorType[]
  inventory: InventoryItem[]
}

type WarehouseLookup = {
  id: number
  name: string
}

type TransactionItem = {
  id: number
  date: string
  type: string
  quantity: number
  warehouseId: number
  warehouseName: string
  createdAt: string
  modelName: string
  sizeName: string
  colorName: string
  colorRgb: string
}

type InventoryOverviewRow = InventoryDataRow & {
  warehouseId: number
  rawStatus: 'all' | 'normal' | 'warning' | 'danger'
}

type ViewMode = 'list' | 'history'

const ALL_COLUMNS: Array<{ key: InventoryColumnKey; label: string }> = [
  { key: 'modelName', label: '상품' },
  { key: 'option', label: '옵션' },
  { key: 'warehouseName', label: '창고' },
  { key: 'quantity', label: '현재 재고' },
  { key: 'latestInbound', label: '최근 입고' },
  { key: 'latestOutbound', label: '최근 출고' },
  { key: 'status', label: '상태' },
]

function inventoryStatus(quantity: number) {
  if (quantity <= 0) return { label: '품절', tone: 'danger' as const, raw: 'danger' as const }
  if (quantity <= 5) return { label: '주의', tone: 'warning' as const, raw: 'warning' as const }
  return { label: '정상', tone: 'success' as const, raw: 'normal' as const }
}

function EntryOverlay({
  open,
  title,
  onClose,
  children,
}: {
  open: boolean
  title: string
  onClose: () => void
  children: ReactNode
}) {
  if (!open) return null

  return (
    <div className="fixed inset-0 z-50">
      <button type="button" aria-label="입력 창 닫기" onClick={onClose} className="absolute inset-0 bg-slate-950/45" />
      <div className="absolute inset-x-0 bottom-0 top-10 overflow-hidden rounded-t-[28px] border border-slate-200 bg-white shadow-2xl md:inset-x-[max(2rem,calc(50%-32rem))] md:bottom-8 md:top-8 md:rounded-[28px]">
        <div className="flex h-full flex-col">
          <div className="border-b border-slate-200 px-4 py-4 md:px-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-semibold text-slate-950">{title}</p>
                <p className="mt-1 text-sm text-slate-500">창고 컨텍스트를 유지한 채 여러 SKU를 한 번에 입력합니다.</p>
              </div>
              <button type="button" onClick={onClose} className={cx(ui.buttonGhost, 'h-11 min-w-11 px-3')}>
                닫기
              </button>
            </div>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4 md:px-6 md:py-5">{children}</div>
        </div>
      </div>
    </div>
  )
}

export default function InventoryWorkspace({
  models,
  warehouses,
  transactions,
}: {
  models: ModelWithRelations[]
  warehouses: WarehouseLookup[]
  transactions: TransactionItem[]
}) {
  const [selectedWarehouseId, setSelectedWarehouseId] = useState<number | 'all'>(warehouses[0]?.id ?? 'all')
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'normal' | 'warning' | 'danger'>('all')
  const [activeView, setActiveView] = useState<ViewMode>('list')
  const [overlayMode, setOverlayMode] = useState<'입고' | '출고' | null>(null)
  const [visibleColumns, setVisibleColumns] = useState<Set<InventoryColumnKey>>(
    () => new Set(ALL_COLUMNS.map((column) => column.key)),
  )

  const normalizedModels = useMemo(
    () =>
      models.map((model) => ({
        id: model.id,
        name: model.name,
        sizes: model.sizes,
        colors: model.colors,
      })),
    [models],
  )

  const transactionLookup = useMemo(() => {
    const map = new Map<string, { latestInbound?: string; latestOutbound?: string }>()

    for (const tx of transactions) {
      const key = `${tx.modelName}::${tx.colorName}::${tx.sizeName}::${tx.warehouseId}`
      const current = map.get(key) ?? {}
      if (tx.type === '입고' && !current.latestInbound) current.latestInbound = tx.date
      if (tx.type === '출고' && !current.latestOutbound) current.latestOutbound = tx.date
      map.set(key, current)
    }

    return map
  }, [transactions])

  const overviewRows = useMemo(() => {
    return models.flatMap((model) =>
      model.colors.flatMap((color) =>
        model.sizes.flatMap((size): InventoryOverviewRow[] => {
          return model.inventory
            .filter((item) => item.colorId === color.id && item.sizeId === size.id)
            .map((item) => {
              const movement = transactionLookup.get(`${model.name}::${color.name}::${size.name}::${item.warehouseId}`)
              const status = inventoryStatus(item.quantity)

              return {
                key: `${item.id}`,
                modelName: model.name,
                option: (
                  <div className="flex items-center gap-2 text-slate-600">
                    <span
                      className="inline-block h-3.5 w-3.5 rounded-full border border-slate-200"
                      style={{ backgroundColor: color.rgbCode }}
                    />
                    <span>
                      {color.name} / {size.name}
                    </span>
                  </div>
                ),
                warehouseName: item.warehouseName,
                warehouseId: item.warehouseId,
                quantity: item.quantity,
                latestInbound: movement?.latestInbound ?? '없음',
                latestOutbound: movement?.latestOutbound ?? '없음',
                status: {
                  label: status.label,
                  variant: status.tone,
                },
                rawStatus: status.raw,
              }
            })
        }),
      ),
    )
  }, [models, transactionLookup])

  const filteredRows = useMemo(() => {
    return overviewRows.filter((row) => {
      const warehouseMatch = selectedWarehouseId === 'all' || row.warehouseId === selectedWarehouseId
      const searchMatch = search.trim().length === 0 || row.modelName.toLowerCase().includes(search.trim().toLowerCase())
      const statusMatch = statusFilter === 'all' || row.rawStatus === statusFilter
      return warehouseMatch && searchMatch && statusMatch
    })
  }, [overviewRows, search, selectedWarehouseId, statusFilter])

  const toggleColumn = (column: InventoryColumnKey) => {
    setVisibleColumns((prev) => {
      const next = new Set(prev)
      if (next.has(column)) {
        next.delete(column)
      } else {
        next.add(column)
      }
      return next
    })
  }

  return (
    <div className={ui.shell}>
      <PageHeader title="재고 운영" description="재고를 조회하고 바로 입고/출고 처리합니다." />

      <FilterToolbar>
        <div className="flex flex-1 flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
          <div className="min-w-[11rem]">
            <label htmlFor="inventory-warehouse" className="sr-only">
              창고 선택
            </label>
            <select
              id="inventory-warehouse"
              value={selectedWarehouseId}
              onChange={(event) => setSelectedWarehouseId(event.target.value === 'all' ? 'all' : Number(event.target.value))}
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

          <div className="min-w-[14rem]">
            <label htmlFor="inventory-search" className="sr-only">
              상품 검색
            </label>
            <Input id="inventory-search" type="search" placeholder="상품 검색" value={search} onChange={(event) => setSearch(event.target.value)} />
          </div>

          <div className="min-w-[10rem]">
            <label htmlFor="inventory-status" className="sr-only">
              상태 필터
            </label>
            <select id="inventory-status" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as typeof statusFilter)} className={ui.controlSm}>
              <option value="all">전체 상태</option>
              <option value="normal">정상</option>
              <option value="warning">주의</option>
              <option value="danger">품절</option>
            </select>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button type="button" onClick={() => setActiveView('list')} className={cx(activeView === 'list' ? ui.tabActive : ui.tab, 'h-10 px-3')}>
            재고 목록
          </button>
          <button type="button" onClick={() => setActiveView('history')} className={cx(activeView === 'history' ? ui.tabActive : ui.tab, 'h-10 px-3')}>
            이력
          </button>
          <ColumnVisibilityMenu columns={ALL_COLUMNS} visibleColumns={visibleColumns} onToggle={toggleColumn} />
          <button type="button" onClick={() => setOverlayMode('입고')} className={cx(ui.buttonPrimary, 'h-10 gap-2 px-3')}>
            <Plus className="h-4 w-4" />
            입고
          </button>
          <button type="button" onClick={() => setOverlayMode('출고')} className={cx(ui.buttonSecondary, 'h-10 gap-2 px-3')}>
            <Minus className="h-4 w-4" />
            출고
          </button>
        </div>
      </FilterToolbar>

      <div className="mt-4">
        {activeView === 'list' ? (
          <InventoryDataTable rows={filteredRows} visibleColumns={visibleColumns} />
        ) : (
          <HistoryView
            transactions={transactions.map((tx) => ({ ...tx, warehouse: tx.warehouseName }))}
            models={models.map((model) => ({ id: model.id, name: model.name }))}
            warehouses={warehouses}
            controlledWarehouseId={selectedWarehouseId === 'all' ? '' : selectedWarehouseId}
            embedded
          />
        )}
      </div>

      <EntryOverlay
        open={overlayMode !== null}
        title={overlayMode === '입고' ? '빠른 입고' : '빠른 출고'}
        onClose={() => setOverlayMode(null)}
      >
        <InOutForm
          models={normalizedModels}
          warehouses={warehouses}
          initialType={overlayMode ?? '입고'}
          initialWarehouseId={typeof selectedWarehouseId === 'number' ? selectedWarehouseId : warehouses[0]?.id}
          lockedWarehouseId={typeof selectedWarehouseId === 'number' ? selectedWarehouseId : null}
          entryMode="manual"
          onSubmitted={() => setOverlayMode(null)}
        />
      </EntryOverlay>
    </div>
  )
}

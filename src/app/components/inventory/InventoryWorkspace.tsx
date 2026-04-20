'use client'

import { useMemo, useState } from 'react'
import HistoryView, { type HistoryFilterState } from '@/app/(protected)/history/HistoryView'
import InOutForm from '@/app/(protected)/inout/InOutForm'
import { PageHeader, ui } from '@/app/components/ui'
import { FixedSheet } from '@/components/ui/fixed-sheet'
import { InventoryDataTable, type InventoryColumnKey, type InventoryDataRow } from '@/components/ui/inventory-data-table'
import { InventoryTableToolbar } from '@/components/ui/inventory-table-toolbar'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

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

export default function InventoryWorkspace({
  models,
  warehouses,
  transactions,
}: {
  models: ModelWithRelations[]
  warehouses: WarehouseLookup[]
  transactions: TransactionItem[]
}) {
  const [selectedWarehouseId, setSelectedWarehouseId] = useState<number | 'all'>('all')
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'normal' | 'warning' | 'danger'>('all')
  const [activeView, setActiveView] = useState<ViewMode>('list')
  const [overlayMode, setOverlayMode] = useState<'입고' | '출고' | null>(null)
  const [historyFilters, setHistoryFilters] = useState<HistoryFilterState>({
    warehouseId: '',
    type: '',
    search: '',
    dateFrom: '',
    dateTo: '',
  })
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

      <Tabs value={activeView} onValueChange={(value) => setActiveView(value as ViewMode)} className="mt-4 space-y-4">
        <TabsList aria-label="재고 운영 보기 전환">
          <TabsTrigger value="list">목록</TabsTrigger>
          <TabsTrigger value="history">이력</TabsTrigger>
        </TabsList>

        <TabsContent value="list" className="m-0">
          <InventoryTableToolbar
            warehouses={warehouses}
            selectedWarehouseId={selectedWarehouseId}
            onWarehouseChange={setSelectedWarehouseId}
            search={search}
            onSearchChange={setSearch}
            statusFilter={statusFilter}
            onStatusFilterChange={setStatusFilter}
            columns={ALL_COLUMNS}
            visibleColumns={visibleColumns}
            onToggleColumn={toggleColumn}
            onInbound={() => setOverlayMode('입고')}
            onOutbound={() => setOverlayMode('출고')}
          />
          <InventoryDataTable rows={filteredRows} visibleColumns={visibleColumns} />
        </TabsContent>

        <TabsContent value="history" className="m-0">
          <HistoryView
            transactions={transactions.map((tx) => ({ ...tx, warehouse: tx.warehouseName }))}
            models={models.map((model) => ({ id: model.id, name: model.name }))}
            warehouses={warehouses}
            filters={historyFilters}
            onFiltersChange={setHistoryFilters}
            embedded
          />
        </TabsContent>
      </Tabs>

      <FixedSheet
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
          onSubmitted={() => setOverlayMode(null)}
        />
      </FixedSheet>
    </div>
  )
}

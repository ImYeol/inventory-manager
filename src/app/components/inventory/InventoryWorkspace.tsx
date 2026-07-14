'use client'

import { useMemo, useState } from 'react'
import HistoryView, { type HistoryFilterState } from '@/app/(protected)/history/HistoryView'
import InOutForm from '@/app/(protected)/inout/InOutForm'
import { PageHeader, ui } from '@/app/components/ui'
import { FixedSheet } from '@/components/ui/fixed-sheet'
import { InventoryDataTable, type InventoryColumnKey, type InventoryDataRow } from '@/components/ui/inventory-data-table'
import { InventoryTableToolbar } from '@/components/ui/inventory-table-toolbar'
import { Modal } from '@/components/ui/modal'
import { ProductVariantCombobox, type ProductVariantOption } from '@/components/ui/product-variant-combobox'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { TableSurface } from '@/components/ui/table-surface'
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
  { key: 'skuOption', label: 'SKU / 옵션' },
  { key: 'warehouseName', label: '창고' },
  { key: 'onHand', label: 'On hand' },
  { key: 'committed', label: 'Committed' },
  { key: 'available', label: 'Available' },
  { key: 'incoming', label: 'Incoming' },
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
  committedByVariant = {},
  incomingByVariant = {},
}: {
  models: ModelWithRelations[]
  warehouses: WarehouseLookup[]
  transactions: TransactionItem[]
  committedByVariant?: Record<string, number>
  incomingByVariant?: Record<string, number>
}) {
  const [selectedWarehouseId, setSelectedWarehouseId] = useState<number | 'all'>('all')
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'normal' | 'warning' | 'danger'>('all')
  const [activeView, setActiveView] = useState<ViewMode>('list')
  const [overlayMode, setOverlayMode] = useState<'입고' | '출고' | null>(null)
  const [addOpen, setAddOpen] = useState(false)
  const [addVariant, setAddVariant] = useState<string | null>(null)
  const [addWarehouse, setAddWarehouse] = useState<number | null>(null)
  const [initialQuantity, setInitialQuantity] = useState('0')
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

  const variants = useMemo<ProductVariantOption[]>(() => models.flatMap((model) => model.colors.flatMap((color) => model.sizes.map((size) => ({
    id: `${model.id}:${size.id}:${color.id}`, modelId: model.id, sizeId: size.id, colorId: color.id,
    modelName: model.name, sizeName: size.name, colorName: color.name, sellerSku: `${model.name}-${color.name}-${size.name}`,
    channels: { naver: 'unregistered', coupang: 'unregistered' },
  })))), [models])

  const overviewRows = useMemo(() => {
    return models.flatMap((model) =>
      model.colors.flatMap((color) =>
        model.sizes.flatMap((size): InventoryOverviewRow[] => {
          return model.inventory
            .filter((item) => item.colorId === color.id && item.sizeId === size.id)
            .map((item) => {
              const variantId = `${model.id}:${size.id}:${color.id}`
              const committed = committedByVariant[variantId] ?? 0
              const onHand = item.quantity
              const available = onHand - committed
              const status = inventoryStatus(available)

              return {
                key: `${item.id}`,
                modelName: model.name,
                skuOption: (
                  <div className="flex items-center gap-2 text-[color:var(--muted)]">
                    <span
                      className="inline-block h-3.5 w-3.5 rounded-full border border-[color:var(--border)]"
                      style={{ backgroundColor: color.rgbCode }}
                    />
                    <span>
                      {`${model.name}-${color.name}-${size.name}`} · {color.name} / {size.name}
                    </span>
                  </div>
                ),
                warehouseName: item.warehouseName,
                warehouseId: item.warehouseId,
                onHand,
                committed,
                available,
                incoming: incomingByVariant[variantId] ?? 0,
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
  }, [committedByVariant, incomingByVariant, models])

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
          <TableSurface
            toolbar={
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
                onAddInventory={() => setAddOpen(true)}
              />
            }
          >
            <InventoryDataTable rows={filteredRows} visibleColumns={visibleColumns} />
          </TableSurface>
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

      <Modal open={addOpen} title="재고 추가" description="상품 옵션과 창고를 고른 뒤 초기 수량을 입고로 처리합니다." onOpenChange={setAddOpen}
        footer={<Button type="button" disabled={!addVariant || !addWarehouse || Number(initialQuantity) < 0} onClick={() => { setAddOpen(false); setOverlayMode('입고') }}>입고로 계속</Button>}
      >
        <div className="grid gap-3">
          <ProductVariantCombobox aria-label="재고 추가 상품 옵션" variants={variants} value={addVariant} onValueChange={setAddVariant} />
          <Select value={addWarehouse ? String(addWarehouse) : undefined} onValueChange={(value) => setAddWarehouse(Number(value))}>
            <SelectTrigger aria-label="재고 추가 창고" className={ui.control}><SelectValue placeholder="창고 선택" /></SelectTrigger>
            <SelectContent>{warehouses.map((warehouse) => <SelectItem key={warehouse.id} value={String(warehouse.id)}>{warehouse.name}</SelectItem>)}</SelectContent>
          </Select>
          <Input aria-label="초기 수량" type="number" min={0} value={initialQuantity} onChange={(event) => setInitialQuantity(event.target.value)} />
          {addVariant && addWarehouse && overviewRows.some((row) => row.warehouseId === addWarehouse && row.key && variants.find((variant) => variant.id === addVariant)?.modelName === row.modelName) ? <p className="text-sm text-[color:var(--muted)]">기존 조합입니다. 신규 재고 행 대신 입고/조정으로 계속합니다.</p> : null}
        </div>
      </Modal>
    </div>
  )
}

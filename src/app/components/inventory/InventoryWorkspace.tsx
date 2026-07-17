'use client'

import { useMemo, useState } from 'react'
import HistoryView, { type HistoryFilterState } from '@/app/(protected)/history/HistoryView'
import InOutForm from '@/app/(protected)/inout/InOutForm'
import InboundRegistrationSheet, { type InboundTemplateOption } from '@/app/components/inventory/InboundRegistrationSheet'
import WarehouseTransferForm from '@/app/components/inventory/WarehouseTransferForm'
import { PageHeader, ui } from '@/app/components/ui'
import { ChannelBadge, type ChannelListingStatus } from '@/components/ui/channel-badge'
import { FixedSheet } from '@/components/ui/fixed-sheet'
import { InventoryDataTable, type InventoryColumnKey, type InventoryDataRow } from '@/components/ui/inventory-data-table'
import { InventoryTableToolbar } from '@/components/ui/inventory-table-toolbar'
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

type ProductVariantLookup = {
  id: number
  modelId?: number
  sizeId?: number
  colorId?: number
}

type ChannelProductRefSummary = {
  id: number
  variantId: number | null
  channel: 'naver' | 'coupang'
  listingStatus: ChannelListingStatus
  lastSyncError: string | null
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
  { key: 'onHand', label: '현재 재고' },
  { key: 'committed', label: '예약 재고' },
  { key: 'available', label: '출고 가능' },
  { key: 'incoming', label: '입고 예정' },
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
  variants = [],
  channelProductRefs = [],
  suppliers = [],
  inboundTemplates = [],
}: {
  models: ModelWithRelations[]
  warehouses: WarehouseLookup[]
  transactions: TransactionItem[]
  committedByVariant?: Record<string, number>
  incomingByVariant?: Record<string, number>
  variants?: ProductVariantLookup[]
  channelProductRefs?: ChannelProductRefSummary[]
  suppliers?: WarehouseLookup[]
  inboundTemplates?: InboundTemplateOption[]
}) {
  const [selectedWarehouseId, setSelectedWarehouseId] = useState<number | 'all'>('all')
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'normal' | 'warning' | 'danger'>('all')
  const [activeView, setActiveView] = useState<ViewMode>('list')
  const [overlayMode, setOverlayMode] = useState<'inbound' | 'manual-outbound' | 'count-adjustment' | 'transfer' | null>(null)
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

  const variantsByInventoryKey = useMemo(
    () => new Map(
      variants
        .filter((variant): variant is ProductVariantLookup & { modelId: number; sizeId: number; colorId: number } => (
          typeof variant.modelId === 'number' && typeof variant.sizeId === 'number' && typeof variant.colorId === 'number'
        ))
        .map((variant) => [`${variant.modelId}:${variant.sizeId}:${variant.colorId}`, variant]),
    ),
    [variants],
  )

  const channelRefsByVariantId = useMemo(() => {
    const refs = new Map<number, ChannelProductRefSummary[]>()
    for (const ref of channelProductRefs) {
      if (ref.variantId === null) continue
      refs.set(ref.variantId, [...(refs.get(ref.variantId) ?? []), ref])
    }
    return refs
  }, [channelProductRefs])

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
              const mappedVariant = variantsByInventoryKey.get(variantId)
              const channelRefs = mappedVariant ? channelRefsByVariantId.get(mappedVariant.id) ?? [] : []
              const naverCount = channelRefs.filter((ref) => ref.channel === 'naver').length
              const coupangCount = channelRefs.filter((ref) => ref.channel === 'coupang').length
              const syncErrorRefs = channelRefs.filter((ref) => ref.lastSyncError !== null || ref.listingStatus === 'sync-error')

              return {
                key: `${item.id}`,
                modelName: model.name,
                skuOption: (
                  <div className="space-y-1 text-[color:var(--muted)]">
                    <div className="flex items-center gap-2">
                    <span
                      className="inline-block h-3.5 w-3.5 rounded-full border border-[color:var(--border)]"
                      style={{ backgroundColor: color.rgbCode }}
                    />
                    <span>
                      {`${model.name}-${color.name}-${size.name}`} · {color.name} / {size.name}
                    </span>
                    </div>
                    {channelRefs.length > 0 ? (
                      <div className="flex flex-wrap items-center gap-1 text-xs text-[color:var(--muted-foreground)]">
                        <span>{`네이버 ${naverCount} · 쿠팡 ${coupangCount}`}</span>
                        {syncErrorRefs.map((ref) => (
                          <ChannelBadge key={ref.id} channel={ref.channel} listingStatus="sync-error" compact />
                        ))}
                      </div>
                    ) : (
                      <span className="text-xs text-[color:var(--muted-foreground)]">매핑 없음</span>
                    )}
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
  }, [channelRefsByVariantId, committedByVariant, incomingByVariant, models, variantsByInventoryKey])

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
                onInbound={() => setOverlayMode('inbound')}
                onOutbound={() => setOverlayMode('manual-outbound')}
                onAdjustment={() => setOverlayMode('count-adjustment')}
                onTransfer={() => setOverlayMode('transfer')}
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
        title={overlayMode === 'inbound' ? '입고 등록' : overlayMode === 'manual-outbound' ? '수동 출고' : overlayMode === 'transfer' ? '창고 이동' : '실사 수량 조정'}
        description={
          overlayMode === 'inbound'
            ? '파일 미리보기 또는 직접 입력으로 입고 초안을 만들고 SKU 검수 후 반영합니다.'
            : overlayMode === 'manual-outbound'
              ? '주문 발송과 별도로 현재 보유 재고를 차감합니다. 사유는 이력에 기록됩니다.'
              : overlayMode === 'transfer' ? '출발 재고를 차감하고 도착 창고에 같은 수량을 원자적으로 반영합니다.' : '실사 수량을 기준으로 현재 재고와의 차이를 이력에 기록합니다.'
        }
        onClose={() => setOverlayMode(null)}
      >
        {overlayMode === 'inbound' ? <InboundRegistrationSheet
          suppliers={suppliers}
          warehouses={warehouses}
          templates={inboundTemplates}
          initialWarehouseId={typeof selectedWarehouseId === 'number' ? selectedWarehouseId : undefined}
          onSaved={() => setOverlayMode(null)}
        /> : overlayMode === 'transfer' ? <WarehouseTransferForm
          models={normalizedModels}
          warehouses={warehouses}
          initialWarehouseId={typeof selectedWarehouseId === 'number' ? selectedWarehouseId : undefined}
          onSubmitted={() => setOverlayMode(null)}
        /> : <InOutForm
          models={normalizedModels}
          warehouses={warehouses}
          operation={overlayMode ?? 'inbound'}
          initialWarehouseId={typeof selectedWarehouseId === 'number' ? selectedWarehouseId : warehouses[0]?.id}
          lockedWarehouseId={typeof selectedWarehouseId === 'number' ? selectedWarehouseId : null}
          onSubmitted={() => setOverlayMode(null)}
        />}
      </FixedSheet>
    </div>
  )
}

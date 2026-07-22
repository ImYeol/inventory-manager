'use client'

import Link from 'next/link'
import { useMemo, useState, type ReactNode } from 'react'
import type { ColumnDef } from '@tanstack/react-table'
import HistoryView, { type HistoryFilterState } from '@/app/(protected)/history/HistoryView'
import type { HistoryTransaction } from '@/lib/data'
import InOutForm from '@/app/(protected)/inout/InOutForm'
import WarehouseTransferForm from '@/app/components/inventory/WarehouseTransferForm'
import { PageHeader, ui } from '@/app/components/ui'
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb'
import { StatusBadge } from '@/components/ui/badge-1'
import { Button } from '@/components/ui/button'
import { ChannelBadge, type ChannelListingStatus } from '@/components/ui/channel-badge'
import { DataTable } from '@/components/ui/data-table'
import { DropdownMenuItem } from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { SplitButton } from '@/components/ui/split-button'
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

type TransactionItem = Omit<HistoryTransaction, 'warehouse'>

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

type InventoryOverviewRow = {
  key: string
  modelName: string
  skuOption: ReactNode
  warehouseName: string
  onHand: number
  committed: number
  available: number
  incoming: number
  incomingHref?: string
  status: {
    label: string
    variant: 'success' | 'warning' | 'danger'
  }
  /**
   * Opens the mode-locked count-adjustment sheet pre-filled with this row's
   * ProductVariant (model/size/color) and warehouse (ADR-004; docs GitHub issue #17
   * Topic 1). Omitted when the row has no addressable variant to adjust.
   */
  onAdjust?: () => void
  warehouseId: number
  rawStatus: 'all' | 'normal' | 'warning' | 'danger'
}

type ViewMode = 'list' | 'history'

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
}: {
  models: ModelWithRelations[]
  warehouses: WarehouseLookup[]
  transactions: TransactionItem[]
  committedByVariant?: Record<string, number>
  incomingByVariant?: Record<string, number>
  variants?: ProductVariantLookup[]
  channelProductRefs?: ChannelProductRefSummary[]
}) {
  const [selectedWarehouseId, setSelectedWarehouseId] = useState<number | 'all'>('all')
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'normal' | 'warning' | 'danger'>('all')
  const [activeView, setActiveView] = useState<ViewMode>('list')
  const [overlayMode, setOverlayMode] = useState<'inbound' | 'manual-outbound' | 'count-adjustment' | 'transfer' | null>(null)
  const [rowQuickAction, setRowQuickAction] = useState<{
    modelId: number
    sizeId: number
    colorId: number
    warehouseId: number
  } | null>(null)
  const [historyFilters, setHistoryFilters] = useState<HistoryFilterState>({
    warehouseId: '',
    type: '',
    search: '',
    dateFrom: '',
    dateTo: '',
  })
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
          const variantId = `${model.id}:${size.id}:${color.id}`
          const mappedVariant = variantsByInventoryKey.get(variantId)
          const matchingInventory = model.inventory.filter((candidate) => candidate.colorId === color.id && candidate.sizeId === size.id)
          const rowWarehouses = mappedVariant
            ? warehouses
            : warehouses.filter((warehouse) => matchingInventory.some((item) => item.warehouseId === warehouse.id))

          return rowWarehouses.map((warehouse) => {
              const item = matchingInventory.find((candidate) => candidate.warehouseId === warehouse.id)
              const variantId = `${model.id}:${size.id}:${color.id}`
              const committed = committedByVariant[`${variantId}:${warehouse.id}`] ?? 0
              const incoming = incomingByVariant[`${variantId}:${warehouse.id}`] ?? 0
              const onHand = item?.quantity ?? 0
              const available = onHand - committed
              const status = inventoryStatus(available)
              const channelRefs = mappedVariant ? channelRefsByVariantId.get(mappedVariant.id) ?? [] : []
              const naverCount = channelRefs.filter((ref) => ref.channel === 'naver').length
              const coupangCount = channelRefs.filter((ref) => ref.channel === 'coupang').length
              const syncErrorRefs = channelRefs.filter((ref) => ref.lastSyncError !== null || ref.listingStatus === 'sync-error')

              return {
                key: `${variantId}:${warehouse.id}`,
                modelName: model.name,
                skuOption: (
                  <div className="space-y-1 text-[color:var(--muted-foreground)]">
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
                warehouseName: warehouse.name,
                warehouseId: warehouse.id,
                onHand,
                committed,
                available,
                incoming,
                incomingHref: incoming > 0 ? '/sourcing/arrivals' : undefined,
                status: {
                  label: status.label,
                  variant: status.tone,
                },
                rawStatus: status.raw,
                onAdjust: () => {
                  setRowQuickAction({ modelId: model.id, sizeId: size.id, colorId: color.id, warehouseId: warehouse.id })
                  setOverlayMode('count-adjustment')
                },
              }
            })
        }),
      ),
    )
  }, [channelRefsByVariantId, committedByVariant, incomingByVariant, models, variantsByInventoryKey, warehouses])

  const filteredRows = useMemo(() => {
    return overviewRows.filter((row) => {
      const warehouseMatch = selectedWarehouseId === 'all' || row.warehouseId === selectedWarehouseId
      const searchMatch = search.trim().length === 0 || row.modelName.toLowerCase().includes(search.trim().toLowerCase())
      const statusMatch = statusFilter === 'all' || row.rawStatus === statusFilter
      return warehouseMatch && searchMatch && statusMatch
    })
  }, [overviewRows, search, selectedWarehouseId, statusFilter])

  const inventoryColumns: ColumnDef<InventoryOverviewRow, unknown>[] = [
    {
      accessorKey: 'modelName',
      header: '상품',
      meta: {
        headerClassName: 'w-[10rem]',
        cellClassName: 'font-medium text-[color:var(--foreground)]',
      },
    },
    {
      id: 'skuOption',
      header: 'SKU / 옵션',
      enableSorting: false,
      cell: ({ row }) => row.original.skuOption,
    },
    {
      accessorKey: 'warehouseName',
      header: '창고',
      meta: { headerClassName: 'w-[8rem]' },
    },
    {
      accessorKey: 'onHand',
      header: '현재 재고',
      meta: {
        headerClassName: 'w-[6rem] text-right',
        cellClassName: 'text-right font-semibold tabular-nums text-[color:var(--foreground)]',
      },
    },
    {
      accessorKey: 'committed',
      header: '예약 재고',
      meta: { headerClassName: 'w-[6rem] text-right', cellClassName: 'text-right tabular-nums' },
    },
    {
      accessorKey: 'available',
      header: '출고 가능',
      meta: { headerClassName: 'w-[6rem] text-right', cellClassName: 'text-right tabular-nums' },
    },
    {
      accessorKey: 'incoming',
      header: '입고 예정',
      meta: { headerClassName: 'w-[6rem] text-right', cellClassName: 'text-right tabular-nums' },
      cell: ({ row }) => {
        const { incoming, incomingHref } = row.original
        return incomingHref && incoming > 0 ? (
          <Link
            href={incomingHref}
            className="font-medium text-[color:var(--primary)] underline-offset-4 hover:underline"
            aria-label={`입고 예정 ${incoming}개 보기`}
          >
            {incoming}
          </Link>
        ) : (
          incoming
        )
      },
    },
    {
      id: 'status',
      header: '상태',
      cell: ({ row }) => (
        <StatusBadge tone={row.original.status.variant}>{row.original.status.label}</StatusBadge>
      ),
    },
    {
      id: 'actions',
      header: () => <span className="sr-only">행 작업</span>,
      enableSorting: false,
      enableHiding: false,
      meta: { headerClassName: 'w-[5rem] text-right', cellClassName: 'text-right' },
      cell: ({ row }) =>
        row.original.onAdjust ? (
          <Button type="button" variant="ghost" size="sm" onClick={row.original.onAdjust}>
            조정
          </Button>
        ) : null,
    },
  ]

  // A row quick action locks the sheet to that row's own warehouse (it opened
  // the sheet for that specific row), overriding the toolbar warehouse filter.
  const activeWarehouseId = rowQuickAction?.warehouseId ?? (typeof selectedWarehouseId === 'number' ? selectedWarehouseId : undefined)

  const closeOverlay = () => {
    setOverlayMode(null)
    setRowQuickAction(null)
  }

  return (
    <div className={ui.shell}>
      <Breadcrumb className="mb-3">
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink href="/">대시보드</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>재고 운영</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <PageHeader title="재고 운영" description="재고를 조회하고 바로 입고/출고 처리합니다." />

      <Tabs value={activeView} onValueChange={(value) => setActiveView(value as ViewMode)} className="mt-4">
        <TabsList aria-label="재고 운영 보기 전환">
          <TabsTrigger value="list">목록</TabsTrigger>
          <TabsTrigger value="history">이력</TabsTrigger>
        </TabsList>

        <TabsContent value="list">
          <DataTable
            columns={inventoryColumns}
            rows={filteredRows}
            tableAriaLabel="재고 목록"
            emptyState="조회 조건에 맞는 재고가 없습니다."
            toolbarStart={
              <div className="flex min-w-0 flex-1 flex-col gap-2 lg:flex-row lg:flex-wrap lg:items-center">
                <div className="w-full sm:w-[15rem] lg:max-w-[16rem] lg:flex-1">
                  <label htmlFor="inventory-search" className="sr-only">
                    상품명 검색
                  </label>
                  <Input
                    id="inventory-search"
                    type="search"
                    placeholder="상품명 검색"
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    className="ui-control-sm"
                  />
                </div>

                <div className="w-full sm:w-[11rem]">
                  <label htmlFor="inventory-warehouse" className="sr-only">
                    창고 선택
                  </label>
                  <Select
                    value={selectedWarehouseId === 'all' ? 'all' : String(selectedWarehouseId)}
                    onValueChange={(value) => setSelectedWarehouseId(value == null || value === 'all' ? 'all' : Number(value))}
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

                <div className="w-full sm:w-[9.5rem]">
                  <label htmlFor="inventory-status" className="sr-only">
                    상태 필터
                  </label>
                  <Select
                    value={statusFilter}
                    onValueChange={(value) => setStatusFilter((value ?? 'all') as typeof statusFilter)}
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
            }
            toolbarEnd={
              <SplitButton
                label="수동 입고"
                onClick={() => {
                  setRowQuickAction(null)
                  setOverlayMode('inbound')
                }}
                menuLabel="다른 재고 운영 action 더보기"
                variant="success"
              >
                <DropdownMenuItem
                  onSelect={() => {
                    setRowQuickAction(null)
                    setOverlayMode('manual-outbound')
                  }}
                >
                  수동 출고
                </DropdownMenuItem>
                <DropdownMenuItem
                  onSelect={() => {
                    setRowQuickAction(null)
                    setOverlayMode('count-adjustment')
                  }}
                >
                  실사 조정
                </DropdownMenuItem>
                <DropdownMenuItem
                  onSelect={() => {
                    setRowQuickAction(null)
                    setOverlayMode('transfer')
                  }}
                >
                  창고 이동
                </DropdownMenuItem>
              </SplitButton>
            }
          />
        </TabsContent>

        <TabsContent value="history">
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

      <Sheet open={overlayMode !== null} onOpenChange={(open) => { if (!open) closeOverlay() }}>
        <SheetContent side="right" className="sm:max-w-xl">
          <SheetHeader>
            <SheetTitle>{overlayMode === 'inbound' ? '수동 입고' : overlayMode === 'manual-outbound' ? '수동 출고' : overlayMode === 'transfer' ? '창고 이동' : '실사 수량 조정'}</SheetTitle>
            <SheetDescription>
              {overlayMode === 'inbound'
                ? '소싱 입고 예정과 별개로 확인된 수량을 현재 재고에 직접 반영합니다.'
                : overlayMode === 'manual-outbound'
                  ? '주문 발송과 별도로 현재 보유 재고를 차감합니다. 사유는 이력에 기록됩니다.'
                  : overlayMode === 'transfer' ? '출발 재고를 차감하고 도착 창고에 같은 수량을 원자적으로 반영합니다.' : '실사 수량을 기준으로 현재 재고와의 차이를 이력에 기록합니다.'}
            </SheetDescription>
          </SheetHeader>
          <div className="min-h-0 flex-1 overflow-y-auto px-6 pb-6">
            {overlayMode === 'transfer' ? <WarehouseTransferForm
              models={normalizedModels}
              warehouses={warehouses}
              initialWarehouseId={activeWarehouseId}
              initialVariant={rowQuickAction ?? undefined}
              onSubmitted={closeOverlay}
            /> : <InOutForm
              models={normalizedModels}
              warehouses={warehouses}
              operation={overlayMode ?? 'inbound'}
              initialWarehouseId={activeWarehouseId ?? warehouses[0]?.id}
              lockedWarehouseId={activeWarehouseId ?? null}
              initialVariant={rowQuickAction ?? undefined}
              onSubmitted={closeOverlay}
            />}
          </div>
        </SheetContent>
      </Sheet>
    </div>
  )
}

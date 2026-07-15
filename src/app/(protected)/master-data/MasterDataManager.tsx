'use client'

import { useEffect, useRef, useState, useTransition, type FormEvent } from 'react'
import { useRouter } from 'next/navigation'

import { BasicDataTable } from '@/components/ui/basic-data-table'
import { StatusBadge } from '@/components/ui/badge-1'
import { Button } from '@/components/ui/button'
import { ChannelBadge } from '@/components/ui/channel-badge'
import { ProductVariantCombobox } from '@/components/ui/product-variant-combobox'
import { Input } from '@/components/ui/input'
import { Modal } from '@/components/ui/modal'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ActionToolbar } from '@/components/ui/toolbar'
import { FilterToolbar } from '@/components/ui/filter-toolbar'
import { TableSurface } from '@/components/ui/table-surface'
import { cx, ui } from '../../components/ui'
import { syncProducts } from '@/lib/actions/channel-product-sync'
import { linkVariant } from '@/lib/actions/channel-product-link'
import { createInternalProduct } from '@/lib/actions/internal-product'
import type { ProductWorkspaceChannelRef, ProductWorkspaceVariant } from '@/lib/data'
import {
  createWarehouse,
  deleteWarehouse,
} from '@/lib/actions'

type WarehouseLookup = {
  id: number
  name: string
}

type WarehouseStat = WarehouseLookup & {
  skuCount?: number
  stockQty: number
  inboundQty?: number
  outboundQty?: number
  latestInbound?: { quantity: number; date: string } | null
  latestOutbound?: { quantity: number; date: string } | null
  latestMovementDate?: string | null
}

type MasterDataManagerProps = {
  warehouses: WarehouseLookup[]
  warehouseStats?: WarehouseStat[]
  variants?: ProductWorkspaceVariant[]
  channelProductRefs?: ProductWorkspaceChannelRef[]
}

type TabKey = 'product' | 'warehouse'

type InternalProductDraft = {
  name: string
  sizeText: string
  colorText: string
  skuPrefix: string
}

type ProductView = 'all' | 'mapping-required' | 'inventory-mismatch' | 'paused'
type ChannelRow = { kind: 'variant'; variant: ProductWorkspaceVariant } | { kind: 'unlinked-ref'; ref: ProductWorkspaceChannelRef }

type WarehouseRow = {
  warehouse: WarehouseLookup
  skuCount: number
  stockQty: number
  inboundQty: number
  outboundQty: number
  latestInbound: { quantity: number; date: string } | null
  latestOutbound: { quantity: number; date: string } | null
  latestMovementDate: string | null
}

function splitList(value: string) {
  return value
    .split(/[\n,]/)
    .map((entry) => entry.trim())
    .filter(Boolean)
}

function formatDate(value?: string | null) {
  if (!value) return '없음'

  return new Intl.DateTimeFormat('ko-KR', {
    dateStyle: 'medium',
  }).format(new Date(value))
}

function createInternalProductDraft(): InternalProductDraft {
  return {
    name: '',
    sizeText: '',
    colorText: '',
    skuPrefix: '',
  }
}

export default function MasterDataManager({
  warehouses: initialWarehouses,
  warehouseStats = [],
  variants = [],
  channelProductRefs = [],
}: MasterDataManagerProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [activeTab, setActiveTab] = useState<TabKey>('product')
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const [isWarehouseModalOpen, setIsWarehouseModalOpen] = useState(false)
  const [warehouseName, setWarehouseName] = useState('')
  const warehouseNameRef = useRef<HTMLInputElement>(null)

  const [deleteWarehouseTarget, setDeleteWarehouseTarget] = useState<{ id: number; name: string } | null>(null)

  const [isInternalProductModalOpen, setIsInternalProductModalOpen] = useState(false)
  const [internalProductDraft, setInternalProductDraft] = useState<InternalProductDraft>(createInternalProductDraft())
  const [isCreatingInternalProduct, setIsCreatingInternalProduct] = useState(false)
  const [productQuery, setProductQuery] = useState('')
  const [productView, setProductView] = useState<ProductView>('all')
  const [selectedChannelRef, setSelectedChannelRef] = useState<ProductWorkspaceChannelRef | null>(null)
  const [selectedVariantId, setSelectedVariantId] = useState<string | null>(null)
  const [syncMeta, setSyncMeta] = useState<string | null>(null)

  const showToast = (next: { type: 'success' | 'error'; text: string }) => {
    setMessage(next)
    window.setTimeout(() => setMessage(null), 2500)
  }

  const clearMessage = () => {
    setMessage(null)
  }

  const runWithToast = (
    task: () => Promise<void>,
    successText: string,
    onSuccess?: () => void,
  ) => {
    startTransition(async () => {
      try {
        await task()
        onSuccess?.()
        router.refresh()
        showToast({ type: 'success', text: successText })
      } catch (error) {
        showToast({ type: 'error', text: error instanceof Error ? error.message : '처리에 실패했습니다.' })
      }
    })
  }

  useEffect(() => {
    if (!isWarehouseModalOpen) {
      return
    }

    warehouseNameRef.current?.focus()
  }, [isWarehouseModalOpen])

  const openWarehouseModal = () => {
    clearMessage()
    setWarehouseName('')
    setIsWarehouseModalOpen(true)
  }

  const closeWarehouseModal = () => {
    setIsWarehouseModalOpen(false)
  }

  const openInternalProductModal = () => {
    clearMessage()
    setInternalProductDraft(createInternalProductDraft())
    setIsInternalProductModalOpen(true)
  }

  const closeInternalProductModal = () => {
    if (isCreatingInternalProduct) {
      return
    }
    setIsInternalProductModalOpen(false)
  }

  const commitWarehouse = () => {
    if (!warehouseName.trim()) return

    clearMessage()
    runWithToast(
      async () => {
        await createWarehouse(warehouseName)
        setWarehouseName('')
      },
      '창고가 등록되었습니다.',
      closeWarehouseModal,
    )
  }

  const submitWarehouse = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    commitWarehouse()
  }

  const requestDeleteWarehouse = (warehouseId: number, warehouseName: string) => {
    setDeleteWarehouseTarget({ id: warehouseId, name: warehouseName })
  }

  const confirmDeleteWarehouse = () => {
    if (!deleteWarehouseTarget) return

    runWithToast(
      async () => {
        await deleteWarehouse(deleteWarehouseTarget.id)
      },
      `${deleteWarehouseTarget.name} 창고가 삭제되었습니다.`,
      () => setDeleteWarehouseTarget(null),
    )
  }

  const commitInternalProduct = () => {
    setIsCreatingInternalProduct(true)
    startTransition(async () => {
      try {
        const result = await createInternalProduct({ name: internalProductDraft.name, sizes: splitList(internalProductDraft.sizeText), colors: splitList(internalProductDraft.colorText), skuPrefix: internalProductDraft.skuPrefix })
        showToast({ type: 'success', text: `내부 상품과 판매 옵션 ${result.variantCount}개를 등록했습니다.` })
        setIsInternalProductModalOpen(false); router.refresh()
      } catch (error) { showToast({ type: 'error', text: error instanceof Error ? error.message : '내부 상품 등록에 실패했습니다.' })
      } finally { setIsCreatingInternalProduct(false) }
    })
  }

  const warehouseRows: WarehouseRow[] = initialWarehouses.map((warehouse) => {
    const stat = warehouseStats.find((item) => item.id === warehouse.id)

    return {
      warehouse,
      skuCount: stat?.skuCount ?? 0,
      stockQty: stat?.stockQty ?? 0,
      inboundQty: stat?.inboundQty ?? 0,
      outboundQty: stat?.outboundQty ?? 0,
      latestInbound: stat?.latestInbound ?? null,
      latestOutbound: stat?.latestOutbound ?? null,
      latestMovementDate: stat?.latestMovementDate ?? null,
    }
  })

  const warehouseCount = warehouseRows.length
  const totalWarehouseStock = warehouseRows.reduce((sum, item) => sum + item.stockQty, 0)
  const totalWarehouseSku = warehouseRows.reduce((sum, item) => sum + item.skuCount, 0)
  const refsForVariant = (variant: ProductWorkspaceVariant) => channelProductRefs.filter((ref) => ref.variantId === variant.id)
  const refForChannel = (variant: ProductWorkspaceVariant, channel: ProductWorkspaceChannelRef['channel']) =>
    refsForVariant(variant).find((ref) => ref.channel === channel) ?? null
  const channelRows: ChannelRow[] = [
    ...variants.map((variant) => ({ kind: 'variant' as const, variant })),
    ...channelProductRefs.filter((ref) => ref.variantId === null).map((ref) => ({ kind: 'unlinked-ref' as const, ref })),
  ]
  const filteredChannelRows = channelRows.filter((row) => {
    const variant = row.kind === 'variant' ? row.variant : null
    const refs = variant ? refsForVariant(variant) : [row.ref]
    const query = productQuery.trim().toLowerCase()
    const searchable = variant ? `${variant.modelName} ${variant.sizeName} ${variant.colorName} ${variant.sellerSku}` : `${row.ref.productName} ${row.ref.optionName} ${row.ref.sellerSku}`
    if (query && !searchable.toLowerCase().includes(query)) return false
    if (!variant) return productView === 'all' || productView === 'mapping-required' || productView === 'paused' && row.ref.listingStatus === 'paused'
    if (productView === 'mapping-required') return refs.some((ref) => ref.variantId === null) || refs.length < 2
    if (productView === 'inventory-mismatch') return refs.some((ref) => ref.channelReported !== null && ref.channelReported !== variant.available)
    if (productView === 'paused') return refs.some((ref) => ref.listingStatus === 'paused')
    return true
  })

  const runSync = () => {
    setSyncMeta(null)
    startTransition(async () => {
      try {
        const result = await syncProducts()
        setSyncMeta(`추가 ${result.added} · 갱신 ${result.updated} · 연결 필요 ${result.mappingRequired}${result.failed ? ` · 실패 ${result.failed}` : ''}${result.providerFailures.map((failure) => ` · ${failure.message}`).join('')}`)
        router.refresh()
      } catch (error) {
        setSyncMeta(error instanceof Error ? error.message : '동기화에 실패했습니다.')
      }
    })
  }

  const toggleSelectedRefLink = () => {
    if (!selectedChannelRef) return
    const nextVariantId = selectedChannelRef.variantId === null && selectedVariantId ? Number(selectedVariantId) : null
    if (selectedChannelRef.variantId === null && (!Number.isInteger(nextVariantId) || Number(nextVariantId) <= 0)) {
      showToast({ type: 'error', text: '연결할 내부 판매 옵션을 선택해주세요.' })
      return
    }
    runWithToast(
      async () => { await linkVariant(selectedChannelRef.id, nextVariantId) },
      nextVariantId === null ? '채널 상품 연결을 해제했습니다.' : '채널 상품을 연결했습니다.',
      () => setSelectedChannelRef(null),
    )
  }

  const openChannelRef = (ref: ProductWorkspaceChannelRef) => {
    setSelectedChannelRef(ref)
    const exact = ref.sellerSku ? variants.filter((variant) => variant.sellerSku === ref.sellerSku) : []
    setSelectedVariantId(ref.variantId === null && exact.length === 1 ? String(exact[0].id) : ref.variantId === null ? null : String(ref.variantId))
  }

  const comboboxVariants = variants.map((variant) => ({
    ...variant, id: String(variant.id), modelId: 0, sizeId: 0, colorId: 0,
    channels: { naver: refForChannel(variant, 'naver')?.listingStatus ?? 'unregistered', coupang: refForChannel(variant, 'coupang')?.listingStatus ?? 'unregistered' },
  }))
  const draftSizes = splitList(internalProductDraft.sizeText)
  const draftColors = splitList(internalProductDraft.colorText)
  const draftVariantCount = Math.max(draftSizes.length, 1) * Math.max(draftColors.length, 1)
  const draftSkuExample = [internalProductDraft.skuPrefix.trim(), draftSizes[0], draftColors[0]].filter(Boolean).join('-') || '—'

  return (
    <div className="space-y-4">
      {message ? (
        <div
          className={cx(
            ui.surfaceMuted,
            'px-4 py-3 text-sm font-medium',
            message.type === 'success'
              ? 'text-[color:var(--success-foreground)]'
              : 'text-[color:var(--danger-foreground)]',
          )}
          role="status"
          aria-live="polite"
        >
          {message.text}
        </div>
      ) : null}

      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as TabKey)} className="mt-4 space-y-4">
        <TabsList aria-label="상품 관리 보기 전환">
          <TabsTrigger value="product">상품</TabsTrigger>
          <TabsTrigger value="warehouse">창고</TabsTrigger>
        </TabsList>

        <TabsContent value="product" className="m-0">
          <TableSurface
              toolbar={
                <FilterToolbar>
                  <div className="flex min-w-0 items-center gap-2">
                    <Input
                      aria-label="상품 검색"
                      value={productQuery}
                      onChange={(event) => setProductQuery(event.target.value)}
                      placeholder="상품 또는 seller SKU 검색"
                      className="h-10 w-56"
                    />
                    <div className="inline-flex shrink-0 gap-1" aria-label="상품 고정 보기">
                      {([
                        ['all', '전체'], ['mapping-required', '연결 필요'], ['inventory-mismatch', '재고 불일치'], ['paused', '판매 중지'],
                      ] as Array<[ProductView, string]>).map(([value, label]) => (
                        <Button key={value} type="button" size="sm" variant={productView === value ? 'secondary' : 'ghost'} className="h-9 px-2" onClick={() => setProductView(value)}>
                          {label}
                        </Button>
                      ))}
                    </div>
                  </div>
                  <ActionToolbar className="shrink-0">
                    {syncMeta ? <span role="status" className="text-xs text-[color:var(--muted-foreground)]">{syncMeta}</span> : null}
                    <Button type="button" variant="secondary" size="sm" className="h-10 px-3" onClick={openInternalProductModal}>내부 상품 등록</Button>
                    <Button type="button" size="sm" className="h-10 px-3" onClick={runSync} disabled={isPending}>동기화</Button>
                  </ActionToolbar>
                </FilterToolbar>
              }
            >
              <BasicDataTable<ChannelRow>
                bare
                columns={[
                  { key: 'product', label: '상품 / 옵션' }, { key: 'sku', label: '판매자 SKU' },
                  { key: 'coupang', label: '쿠팡' }, { key: 'naver', label: '네이버' },
                  { key: 'available', label: '내부 가용', align: 'right' }, { key: 'gap', label: '재고 차이', align: 'right' },
                  { key: 'synced', label: '마지막 동기화' }, { key: 'actions', label: '작업', align: 'right' },
                ]}
                rows={filteredChannelRows}
                rowKey={(row) => row.kind === 'variant' ? `variant-${row.variant.id}` : `ref-${row.ref.id}`}
                emptyState="채널 상품이 없습니다. 동기화를 실행해 쿠팡/네이버 실제 상품정보를 가져오거나 내부 상품을 등록하세요."
                renderCell={(row, columnKey) => {
                  const variant = row.kind === 'variant' ? row.variant : null
                  const onlyRef = row.kind === 'unlinked-ref' ? row.ref : null
                  const coupang = variant ? refForChannel(variant, 'coupang') : onlyRef?.channel === 'coupang' ? onlyRef : null
                  const naver = variant ? refForChannel(variant, 'naver') : onlyRef?.channel === 'naver' ? onlyRef : null
                  const refs = [coupang, naver].filter((ref): ref is ProductWorkspaceChannelRef => Boolean(ref))
                  if (columnKey === 'product') return <span className="font-medium text-[color:var(--foreground)]">{variant ? `${variant.modelName} · ${variant.sizeName} / ${variant.colorName}` : `${onlyRef?.productName ?? '채널 상품'} · ${onlyRef?.optionName ?? '판매 옵션 미상'}`}</span>
                  if (columnKey === 'sku') return <span className="font-mono text-sm text-[color:var(--muted)]">{variant?.sellerSku ?? onlyRef?.sellerSku ?? '—'}</span>
                  if (columnKey === 'coupang' || columnKey === 'naver') {
                    const channel = columnKey as ProductWorkspaceChannelRef['channel']
                    const ref = channel === 'coupang' ? coupang : naver
                    const badgeStatus = ref?.variantId === null
                      ? 'mapping-required'
                      : ref?.lastSyncError
                        ? 'sync-error'
                        : ref?.listingStatus
                    return ref ? <Button type="button" variant="ghost" size="sm" className="h-8 px-1" onClick={() => openChannelRef(ref)}><ChannelBadge channel={channel} listingStatus={badgeStatus ?? 'unregistered'} /></Button> : <ChannelBadge channel={channel} listingStatus="unregistered" compact />
                  }
                  if (columnKey === 'available') return <span className="font-semibold tabular-nums">{variant ? variant.available.toLocaleString() : '—'}</span>
                  if (columnKey === 'gap') {
                    const gaps = variant ? refs.map((ref) => ref.channelReported === null ? null : variant.available - ref.channelReported).filter((gap): gap is number => gap !== null) : []
                    return <span className="font-mono tabular-nums text-[color:var(--muted)]">{gaps.length ? gaps.map((gap) => `${gap > 0 ? '+' : ''}${gap}`).join(' / ') : '—'}</span>
                  }
                  if (columnKey === 'synced') return <span className="text-sm text-[color:var(--muted)]">{formatDate(refs.map((ref) => ref.lastSyncedAt).filter(Boolean).sort().at(-1) ?? null)}</span>
                  if (columnKey === 'actions') return <Button type="button" variant="ghost" size="sm" className="h-8 px-2" onClick={() => refs[0] && openChannelRef(refs[0])} disabled={!refs.length}>{onlyRef ? '연결' : '상세'}</Button>
                  return null
                }}
              />
            </TableSurface>
        </TabsContent>

        <TabsContent value="warehouse" className="m-0">
          <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <ActionToolbar>
              <StatusBadge tone="neutral">{warehouseCount}개 창고</StatusBadge>
              <StatusBadge tone="neutral">SKU {totalWarehouseSku.toLocaleString()}개</StatusBadge>
              <StatusBadge tone="neutral">총 재고 {totalWarehouseStock.toLocaleString()}개</StatusBadge>
            </ActionToolbar>

            <ActionToolbar>
              <Button type="button" variant="secondary" size="sm" className="h-10 px-3" onClick={openWarehouseModal}>
                창고 등록
              </Button>
            </ActionToolbar>
          </div>

          <BasicDataTable<WarehouseRow>
            columns={[
              { key: 'warehouse', label: '창고' },
              { key: 'skuCount', label: 'SKU', align: 'right' },
              { key: 'stockQty', label: '현재 재고', align: 'right' },
              { key: 'movement', label: '최근 변동' },
              { key: 'actions', label: '작업', align: 'right' },
            ]}
            rows={warehouseRows}
            rowKey={(row) => row.warehouse.id}
            emptyState="등록된 창고가 없습니다."
            renderCell={(row, columnKey) => {
              if (columnKey === 'warehouse') {
                return <span className="font-medium text-[color:var(--foreground)]">{row.warehouse.name}</span>
              }

              if (columnKey === 'skuCount') {
                return <span className="font-mono tabular-nums text-[color:var(--muted)]">{row.skuCount.toLocaleString()}</span>
              }

              if (columnKey === 'stockQty') {
                return <span className="font-semibold text-[color:var(--foreground)]">{row.stockQty.toLocaleString()}</span>
              }

              if (columnKey === 'movement') {
                return (
                  <div className="space-y-0.5 text-sm text-[color:var(--muted)]">
                    <p>입고 {row.latestInbound ? `${row.latestInbound.quantity} / ${formatDate(row.latestInbound.date)}` : '없음'}</p>
                    <p>출고 {row.latestOutbound ? `${row.latestOutbound.quantity} / ${formatDate(row.latestOutbound.date)}` : '없음'}</p>
                    <p className="text-xs text-[color:var(--muted-foreground)]">최근 {formatDate(row.latestMovementDate)}</p>
                  </div>
                )
              }

              if (columnKey === 'actions') {
                return (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-8 px-2"
                    onClick={() => requestDeleteWarehouse(row.warehouse.id, row.warehouse.name)}
                    aria-label={`${row.warehouse.name} 삭제`}
                  >
                    삭제
                  </Button>
                )
              }

              return null
            }}
          />
        </TabsContent>
      </Tabs>

      <Modal
        open={Boolean(selectedChannelRef)}
        title={selectedChannelRef ? `${selectedChannelRef.channel === 'naver' ? '네이버' : '쿠팡'} 채널 상품` : '채널 상품'}
        onOpenChange={(open) => { if (!open) setSelectedChannelRef(null) }}
        footer={
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => setSelectedChannelRef(null)}>닫기</Button>
            <Button
              type="button"
              onClick={toggleSelectedRefLink}
              disabled={isPending || (selectedChannelRef?.variantId === null && !selectedVariantId)}
            >
              {selectedChannelRef?.variantId === null ? '연결' : '해제'}
            </Button>
          </div>
        }
      >
        {selectedChannelRef ? (
          <div className="space-y-3 text-sm">
            {selectedChannelRef.imageUrl ? (
              // Synced provider thumbnails are arbitrary remote URLs and are intentionally not routed through Next image optimization.
              // eslint-disable-next-line @next/next/no-img-element
              <img src={selectedChannelRef.imageUrl} alt="채널 상품 이미지" className="h-24 w-24 rounded-[var(--radius-md)] object-cover" />
            ) : null}
            <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2">
              <dt className="text-[color:var(--muted-foreground)]">가격</dt><dd>{selectedChannelRef.price?.toLocaleString() ?? '—'}</dd>
              <dt className="text-[color:var(--muted-foreground)]">상품 ID</dt><dd>{selectedChannelRef.externalProductId}</dd>
              <dt className="text-[color:var(--muted-foreground)]">옵션 ID</dt><dd>{selectedChannelRef.externalVariantId}</dd>
              <dt className="text-[color:var(--muted-foreground)]">판매자 SKU</dt><dd>{selectedChannelRef.sellerSku ?? '—'}</dd>
              <dt className="text-[color:var(--muted-foreground)]">채널 재고</dt><dd>{selectedChannelRef.channelReported ?? '—'}</dd>
              <dt className="text-[color:var(--muted-foreground)]">동기화 오류</dt><dd>{selectedChannelRef.lastSyncError ?? '없음'}</dd>
            </dl>
            {selectedChannelRef.variantId === null ? <div className="space-y-2 border-t border-[color:var(--border)] pt-3"><label className={ui.label}>내부 판매 옵션</label><ProductVariantCombobox aria-label="내부 판매 옵션" variants={comboboxVariants} value={selectedVariantId} onValueChange={setSelectedVariantId} /><p className={ui.helpText}>판매자 SKU가 정확히 하나 일치하면 제안값으로 선택합니다. 상품명으로는 자동 연결하지 않습니다.</p></div> : null}
          </div>
        ) : null}
      </Modal>

      <Modal
        open={isWarehouseModalOpen}
        title="창고 등록"
        description="창고명만 입력해 빠르게 추가합니다."
        onOpenChange={(open) => setIsWarehouseModalOpen(open)}
        footer={
          <div className="flex items-center justify-end gap-2">
            <Button type="button" variant="secondary" onClick={closeWarehouseModal}>
              취소
            </Button>
            <Button type="button" onClick={commitWarehouse} disabled={isPending || !warehouseName.trim()}>
              등록
            </Button>
          </div>
        }
      >
        <form id="warehouse-form" onSubmit={submitWarehouse} className="space-y-3">
          <div className="space-y-2">
            <label htmlFor="warehouse-name" className={ui.label}>
              창고명
            </label>
            <Input
              ref={warehouseNameRef}
              id="warehouse-name"
              value={warehouseName}
              onChange={(event) => setWarehouseName(event.target.value)}
              placeholder="예: 대전 2센터 A구역"
            />
          </div>
        </form>
      </Modal>

      <Modal
        open={Boolean(deleteWarehouseTarget)}
        title="창고 삭제 확인"
        description={deleteWarehouseTarget ? `${deleteWarehouseTarget.name} 창고를 삭제합니다.` : undefined}
        onOpenChange={(open) => {
          if (!open) setDeleteWarehouseTarget(null)
        }}
        footer={
          <div className="flex items-center justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => setDeleteWarehouseTarget(null)}>
              취소
            </Button>
            <Button type="button" variant="destructive" onClick={confirmDeleteWarehouse} disabled={!deleteWarehouseTarget}>
              삭제
            </Button>
          </div>
        }
      >
        <p className="text-sm leading-6 text-[color:var(--muted)]">삭제 후에는 창고 재고와 연결된 내역이 더 이상 이 표에서 보이지 않습니다.</p>
      </Modal>

      <Modal
        open={isInternalProductModalOpen}
        title="내부 상품 등록"
        description="채널에 없는 로컬 상품을 판매 옵션과 판매자 SKU로 함께 만듭니다."
        onOpenChange={(open) => {
          if (!open) closeInternalProductModal()
        }}
        className="max-w-3xl"
        footer={
          <div className="flex items-center justify-end gap-2">
            <Button type="button" variant="secondary" onClick={closeInternalProductModal} disabled={isCreatingInternalProduct}>
              취소
            </Button>
            <Button
              type="button"
              onClick={commitInternalProduct}
              disabled={isCreatingInternalProduct || !internalProductDraft.name.trim() || !internalProductDraft.skuPrefix.trim()}
            >
              {isCreatingInternalProduct ? '등록 중...' : '등록'}
            </Button>
          </div>
        }
      >
        <form id="internal-product-form" onSubmit={(event) => { event.preventDefault(); commitInternalProduct() }} className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="model-name" className={ui.label}>
              상품명
            </label>
            <Input
              id="model-name"
              value={internalProductDraft.name}
              onChange={(event) => setInternalProductDraft((prev) => ({ ...prev, name: event.target.value }))}
              placeholder="예: 블루종 A"
            />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <label htmlFor="model-size-text" className={ui.label}>
                사이즈 (선택)
              </label>
              <textarea
                id="model-size-text"
                rows={4}
                value={internalProductDraft.sizeText}
                onChange={(event) => setInternalProductDraft((prev) => ({ ...prev, sizeText: event.target.value }))}
                placeholder="예: S, M, L"
                className={ui.control}
              />
              <p className={ui.helpText}>쉼표나 줄바꿈으로 구분합니다. 옵션이 없으면 비워두세요.</p>
            </div>

            <div className="space-y-2">
              <label htmlFor="model-color-text" className={ui.label}>
                색상 (선택)
              </label>
              <textarea
                id="model-color-text"
                rows={4}
                value={internalProductDraft.colorText}
                onChange={(event) => setInternalProductDraft((prev) => ({ ...prev, colorText: event.target.value }))}
                placeholder="예: 블랙, 화이트"
                className={ui.control}
              />
              <p className={ui.helpText}>쉼표나 줄바꿈으로 구분합니다. 옵션이 없으면 비워두세요.</p>
            </div>
          </div>

          <div className="grid gap-2 md:grid-cols-[minmax(0,1fr)_auto] md:items-end">
            <div className="space-y-2">
              <label htmlFor="sku-prefix" className={ui.label}>
                SKU prefix
              </label>
              <Input id="sku-prefix" value={internalProductDraft.skuPrefix} onChange={(event) => setInternalProductDraft((prev) => ({ ...prev, skuPrefix: event.target.value }))} placeholder="예: LP01" />
            </div>
            <div className={cx(ui.surfaceMuted, 'px-3 py-2 text-sm text-[color:var(--muted)]')}>
              판매 옵션 {draftVariantCount}개 · 예시 {draftSkuExample}
            </div>
          </div>
        </form>
      </Modal>
    </div>
  )
}

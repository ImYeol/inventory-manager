'use client'

import { useEffect, useRef, useState, useTransition, type FormEvent } from 'react'
import { useRouter } from 'next/navigation'

import { BasicDataTable } from '@/components/ui/basic-data-table'
import { Button } from '@/components/ui/button'
import { ChannelBadge } from '@/components/ui/channel-badge'
import { FilterToolbar } from '@/components/ui/filter-toolbar'
import { Input } from '@/components/ui/input'
import { Modal } from '@/components/ui/modal'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { TableSurface } from '@/components/ui/table-surface'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ActionToolbar } from '@/components/ui/toolbar'
import { cx, ui } from '../../components/ui'
import { createWarehouse, deleteWarehouse } from '@/lib/actions'
import {
  createChannelProductMapping,
  unlinkChannelProductMapping,
  updateChannelProductMapping,
} from '@/lib/actions/channel-product-link'
import { createInternalProduct } from '@/lib/actions/internal-product'
import { confirmSupplierSkuMapping } from '@/lib/actions/supplier-sku-mapping'
import type { ProductWorkspaceChannelRef, ProductWorkspaceVariant } from '@/lib/data'

type WarehouseLookup = { id: number; name: string }
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
  suppliers?: WarehouseLookup[]
}
type TabKey = 'product' | 'warehouse'
type ProductChannelFilter = 'all' | 'naver' | 'coupang'
type MappingStateFilter = 'all' | 'mapped' | 'mapping-required' | 'sync-error'
type InternalProductDraft = { name: string; sizeText: string; colorText: string; skuPrefix: string }
type MappingDraft = { channel: 'naver' | 'coupang'; sellerSku: string; externalProductId: string; externalVariantId: string }
type WarehouseRow = {
  warehouse: WarehouseLookup
  skuCount: number
  stockQty: number
  latestInbound: { quantity: number; date: string } | null
  latestOutbound: { quantity: number; date: string } | null
  latestMovementDate: string | null
}

function splitList(value: string) {
  return value.split(/[\n,]/).map((entry) => entry.trim()).filter(Boolean)
}

function formatDate(value?: string | null) {
  if (!value) return '없음'
  return new Intl.DateTimeFormat('ko-KR', { dateStyle: 'medium' }).format(new Date(value))
}

function createInternalProductDraft(): InternalProductDraft {
  return { name: '', sizeText: '', colorText: '', skuPrefix: '' }
}

function createMappingDraft(variant: ProductWorkspaceVariant): MappingDraft {
  return { channel: 'naver', sellerSku: variant.sellerSku, externalProductId: '', externalVariantId: '' }
}

export default function MasterDataManager({
  warehouses: initialWarehouses,
  warehouseStats = [],
  variants = [],
  channelProductRefs = [],
  suppliers = [],
}: MasterDataManagerProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [activeTab, setActiveTab] = useState<TabKey>('product')
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [productQuery, setProductQuery] = useState('')
  const [channelFilter, setChannelFilter] = useState<ProductChannelFilter>('all')
  const [mappingStateFilter, setMappingStateFilter] = useState<MappingStateFilter>('all')
  const [selectedVariant, setSelectedVariant] = useState<ProductWorkspaceVariant | null>(null)
  const [mappingDraft, setMappingDraft] = useState<MappingDraft | null>(null)
  const [editingMappingId, setEditingMappingId] = useState<number | null>(null)
  const [isInternalProductModalOpen, setIsInternalProductModalOpen] = useState(false)
  const [internalProductDraft, setInternalProductDraft] = useState<InternalProductDraft>(createInternalProductDraft())
  const [isCreatingInternalProduct, setIsCreatingInternalProduct] = useState(false)
  const [isWarehouseModalOpen, setIsWarehouseModalOpen] = useState(false)
  const [warehouseName, setWarehouseName] = useState('')
  const warehouseNameRef = useRef<HTMLInputElement>(null)
  const [deleteWarehouseTarget, setDeleteWarehouseTarget] = useState<WarehouseLookup | null>(null)
  const [supplierMappingDraft, setSupplierMappingDraft] = useState({ supplierId: '', externalSku: '' })

  const showToast = (next: { type: 'success' | 'error'; text: string }) => {
    setMessage(next)
    window.setTimeout(() => setMessage(null), 2500)
  }
  const refsForVariant = (variantId: number) => channelProductRefs.filter((ref) => ref.variantId === variantId)
  const run = (task: () => Promise<unknown>, successText: string, after?: () => void) => {
    startTransition(async () => {
      try {
        await task()
        after?.()
        router.refresh()
        showToast({ type: 'success', text: successText })
      } catch (error) {
        showToast({ type: 'error', text: error instanceof Error ? error.message : '처리에 실패했습니다.' })
      }
    })
  }

  useEffect(() => {
    if (isWarehouseModalOpen) warehouseNameRef.current?.focus()
  }, [isWarehouseModalOpen])

  const filteredVariants = variants.filter((variant) => {
    const refs = refsForVariant(variant.id)
    const query = productQuery.trim().toLowerCase()
    if (query && ![variant.modelName, variant.sizeName, variant.colorName, variant.sellerSku].join(' ').toLowerCase().includes(query)) return false
    if (channelFilter !== 'all' && !refs.some((ref) => ref.channel === channelFilter)) return false
    if (mappingStateFilter === 'mapped') return refs.length > 0
    if (mappingStateFilter === 'mapping-required') return refs.length === 0
    if (mappingStateFilter === 'sync-error') return refs.some((ref) => Boolean(ref.lastSyncError))
    return true
  })

  const warehouseRows: WarehouseRow[] = initialWarehouses.map((warehouse) => {
    const stat = warehouseStats.find((item) => item.id === warehouse.id)
    return {
      warehouse,
      skuCount: stat?.skuCount ?? 0,
      stockQty: stat?.stockQty ?? 0,
      latestInbound: stat?.latestInbound ?? null,
      latestOutbound: stat?.latestOutbound ?? null,
      latestMovementDate: stat?.latestMovementDate ?? null,
    }
  })
  const draftSizes = splitList(internalProductDraft.sizeText)
  const draftColors = splitList(internalProductDraft.colorText)
  const draftVariantCount = Math.max(draftSizes.length, 1) * Math.max(draftColors.length, 1)
  const draftSkuExample = [internalProductDraft.skuPrefix.trim(), draftSizes[0], draftColors[0]].filter(Boolean).join('-') || '—'
  const selectedRefs = selectedVariant ? refsForVariant(selectedVariant.id) : []

  const openSkuModal = (variant: ProductWorkspaceVariant) => {
    setSelectedVariant(variant)
    setMappingDraft(null)
    setEditingMappingId(null)
  }
  const startNewMapping = () => {
    if (!selectedVariant) return
    setEditingMappingId(null)
    setMappingDraft(createMappingDraft(selectedVariant))
  }
  const startEditMapping = (ref: ProductWorkspaceChannelRef) => {
    setEditingMappingId(ref.id)
    setMappingDraft({ channel: ref.channel, sellerSku: ref.sellerSku ?? '', externalProductId: ref.externalProductId, externalVariantId: ref.externalVariantId })
  }
  const saveMapping = () => {
    if (!selectedVariant || !mappingDraft) return
    const input = { variantId: selectedVariant.id, ...mappingDraft }
    run(
      () => editingMappingId === null ? createChannelProductMapping(input) : updateChannelProductMapping(editingMappingId, input),
      editingMappingId === null ? '채널 판매 옵션을 연결했습니다.' : '채널 판매 옵션을 수정했습니다.',
      () => { setMappingDraft(null); setEditingMappingId(null) },
    )
  }
  const saveSupplierMapping = () => {
    if (!selectedVariant) return
    run(() => confirmSupplierSkuMapping({ supplierId: Number(supplierMappingDraft.supplierId), externalSku: supplierMappingDraft.externalSku, productVariantId: selectedVariant.id }), '공급자 SKU를 연결했습니다.', () => setSupplierMappingDraft({ supplierId: '', externalSku: '' }))
  }

  return (
    <div className="space-y-4">
      {message ? <div role="status" aria-live="polite" className={cx(ui.surfaceMuted, 'px-4 py-3 text-sm font-medium', message.type === 'success' ? 'text-[color:var(--success-foreground)]' : 'text-[color:var(--danger-foreground)]')}>{message.text}</div> : null}
      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as TabKey)} className="mt-4 space-y-4">
        <TabsList aria-label="상품 관리 보기 전환"><TabsTrigger value="product">상품</TabsTrigger><TabsTrigger value="warehouse">창고</TabsTrigger></TabsList>
        <TabsContent value="product" className="m-0">
          <TableSurface
            toolbar={<FilterToolbar>
              <div className="flex min-w-0 items-center gap-2">
                <Input aria-label="상품 검색" value={productQuery} onChange={(event) => setProductQuery(event.target.value)} placeholder="SKU 또는 옵션 검색" className="w-56 ui-control-sm" />
                <Select value={channelFilter} onValueChange={(value) => setChannelFilter(value as ProductChannelFilter)}><SelectTrigger aria-label="채널 필터" className="w-28 ui-control-sm"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">전체 채널</SelectItem><SelectItem value="naver">네이버</SelectItem><SelectItem value="coupang">쿠팡</SelectItem></SelectContent></Select>
                <Select value={mappingStateFilter} onValueChange={(value) => setMappingStateFilter(value as MappingStateFilter)}><SelectTrigger aria-label="매핑 상태 필터" className="w-32 ui-control-sm"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">전체 상태</SelectItem><SelectItem value="mapped">매핑됨</SelectItem><SelectItem value="mapping-required">연결 필요</SelectItem><SelectItem value="sync-error">동기화 오류</SelectItem></SelectContent></Select>
              </div>
              <ActionToolbar className="shrink-0"><span className={ui.dataMeta}>{filteredVariants.length}개 SKU</span><Button type="button" variant="secondary" size="sm" onClick={() => { setInternalProductDraft(createInternalProductDraft()); setIsInternalProductModalOpen(true) }}>내부 상품 등록</Button></ActionToolbar>
            </FilterToolbar>}
          >
            <BasicDataTable<ProductWorkspaceVariant>
              bare tableAriaLabel="내부 SKU 목록"
              columns={[{ key: 'sku', label: 'SKU / 옵션' }, { key: 'inventory', label: '재고', align: 'right' }, { key: 'mappings', label: '판매 옵션' }, { key: 'reported', label: '마지막 보고 / 오류' }, { key: 'actions', label: '작업', align: 'right' }]}
              rows={filteredVariants} rowKey={(variant) => variant.id} onRowClick={openSkuModal} rowAriaLabel={(variant) => `${variant.sellerSku} 매핑 상세`}
              emptyState="등록된 내부 판매 옵션이 없습니다. 내부 상품을 등록한 뒤 채널 판매 옵션을 연결하세요."
              renderCell={(variant, columnKey) => {
                const refs = refsForVariant(variant.id)
                if (columnKey === 'sku') return <div><p className="font-mono text-sm font-medium text-[color:var(--foreground)]">{variant.sellerSku}</p><p className="text-sm text-[color:var(--muted)]">{variant.modelName} · {variant.sizeName} / {variant.colorName}</p></div>
                if (columnKey === 'inventory') return <span className="font-mono tabular-nums text-sm text-[color:var(--foreground)]">{variant.onHand} / {variant.committed} / {variant.available} / {variant.incoming}</span>
                if (columnKey === 'mappings') return <span className="text-sm text-[color:var(--muted)]">네이버 {refs.filter((ref) => ref.channel === 'naver').length} · 쿠팡 {refs.filter((ref) => ref.channel === 'coupang').length}</span>
                if (columnKey === 'reported') return refs.length ? <div className="space-y-1">{refs.map((ref) => <div key={ref.id} className="flex items-center gap-2"><ChannelBadge channel={ref.channel} listingStatus={ref.lastSyncError ? 'sync-error' : ref.listingStatus} compact /><span className="font-mono text-xs text-[color:var(--muted)]">{ref.channelReported ?? '—'}</span>{ref.lastSyncError ? <span className="text-xs text-[color:var(--danger-foreground)]">{ref.lastSyncError}</span> : null}</div>)}</div> : <span className="text-sm text-[color:var(--muted-foreground)]">연결 필요</span>
                if (columnKey === 'actions') return <Button type="button" variant="ghost" size="sm" onClick={(event) => { event.stopPropagation(); openSkuModal(variant) }}>상세</Button>
                return null
              }}
            />
          </TableSurface>
        </TabsContent>
        <TabsContent value="warehouse" className="m-0">
          <TableSurface toolbar={<FilterToolbar><span className={ui.dataMeta}>{warehouseRows.length}개 창고</span><ActionToolbar><Button type="button" variant="secondary" size="sm" onClick={() => { setWarehouseName(''); setIsWarehouseModalOpen(true) }}>창고 등록</Button></ActionToolbar></FilterToolbar>}>
            <BasicDataTable<WarehouseRow> bare columns={[{ key: 'warehouse', label: '창고' }, { key: 'skuCount', label: 'SKU', align: 'right' }, { key: 'stockQty', label: '현재 재고', align: 'right' }, { key: 'movement', label: '최근 변동' }, { key: 'actions', label: '작업', align: 'right' }]} rows={warehouseRows} rowKey={(row) => row.warehouse.id} emptyState="등록된 창고가 없습니다." renderCell={(row, key) => {
              if (key === 'warehouse') return <span className="font-medium">{row.warehouse.name}</span>
              if (key === 'skuCount') return <span className="font-mono tabular-nums">{row.skuCount}</span>
              if (key === 'stockQty') return <span className="font-semibold tabular-nums">{row.stockQty}</span>
              if (key === 'movement') return <span className="text-sm text-[color:var(--muted)]">입고 {row.latestInbound?.quantity ?? '없음'} · 출고 {row.latestOutbound?.quantity ?? '없음'} · {formatDate(row.latestMovementDate)}</span>
              if (key === 'actions') return <Button type="button" variant="ghost" size="sm" onClick={() => setDeleteWarehouseTarget(row.warehouse)}>삭제</Button>
              return null
            }} />
          </TableSurface>
        </TabsContent>
      </Tabs>

      <Modal open={Boolean(selectedVariant)} title="SKU 매핑" description={selectedVariant ? `${selectedVariant.sellerSku} · ${selectedVariant.modelName}` : undefined} onOpenChange={(open) => { if (!open) { setSelectedVariant(null); setMappingDraft(null) } }} footer={<div className="flex justify-end gap-2"><Button type="button" variant="secondary" onClick={() => setSelectedVariant(null)}>닫기</Button>{mappingDraft ? <Button type="button" onClick={saveMapping} disabled={isPending || !mappingDraft.sellerSku.trim() || !mappingDraft.externalProductId.trim() || !mappingDraft.externalVariantId.trim()}>저장</Button> : <Button type="button" onClick={startNewMapping}>매핑 추가</Button>}</div>}>
        <div className="space-y-3 text-sm">
          {mappingDraft ? <div className="grid gap-3"><Select value={mappingDraft.channel} onValueChange={(value) => setMappingDraft((draft) => draft ? { ...draft, channel: value as MappingDraft['channel'] } : draft)}><SelectTrigger aria-label="채널 선택"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="naver">네이버</SelectItem><SelectItem value="coupang">쿠팡</SelectItem></SelectContent></Select><label className="space-y-1"><span className={ui.label}>판매자 SKU</span><Input aria-label="판매자 SKU" value={mappingDraft.sellerSku} onChange={(event) => setMappingDraft((draft) => draft ? { ...draft, sellerSku: event.target.value } : draft)} /></label><label className="space-y-1"><span className={ui.label}>채널 상품 ID</span><Input aria-label="채널 상품 ID" value={mappingDraft.externalProductId} onChange={(event) => setMappingDraft((draft) => draft ? { ...draft, externalProductId: event.target.value } : draft)} /></label><label className="space-y-1"><span className={ui.label}>채널 옵션 ID</span><Input aria-label="채널 옵션 ID" value={mappingDraft.externalVariantId} onChange={(event) => setMappingDraft((draft) => draft ? { ...draft, externalVariantId: event.target.value } : draft)} /></label></div> : <><div className="space-y-2 border-b border-[color:var(--border)] pb-3"><p className={ui.label}>공급자 SKU 사전 연결 (선택)</p><div className="flex gap-2"><Select value={supplierMappingDraft.supplierId} onValueChange={(supplierId) => setSupplierMappingDraft((draft) => ({ ...draft, supplierId }))}><SelectTrigger aria-label="공급자 선택" className="w-36"><SelectValue placeholder="공급자" /></SelectTrigger><SelectContent>{suppliers.map((supplier) => <SelectItem key={supplier.id} value={String(supplier.id)}>{supplier.name}</SelectItem>)}</SelectContent></Select><Input aria-label="외부 SKU" value={supplierMappingDraft.externalSku} onChange={(event) => setSupplierMappingDraft((draft) => ({ ...draft, externalSku: event.target.value }))} placeholder="외부 SKU" /><Button type="button" size="sm" variant="secondary" disabled={isPending || !supplierMappingDraft.supplierId || !supplierMappingDraft.externalSku} onClick={saveSupplierMapping}>연결</Button></div></div>{selectedRefs.length ? selectedRefs.map((ref) => <div key={ref.id} className="flex items-center justify-between gap-3 border-b border-[color:var(--border)] pb-3 last:border-0"><div className="min-w-0"><ChannelBadge channel={ref.channel} listingStatus={ref.lastSyncError ? 'sync-error' : ref.listingStatus} /><p className="mt-1 font-mono text-xs text-[color:var(--muted)]">{ref.externalProductId} / {ref.externalVariantId}</p>{ref.lastSyncError ? <p className="mt-1 text-xs text-[color:var(--danger-foreground)]">{ref.lastSyncError}</p> : null}</div><ActionToolbar><Button type="button" variant="ghost" size="sm" onClick={() => startEditMapping(ref)}>수정</Button><Button type="button" variant="ghost" size="sm" onClick={() => run(() => unlinkChannelProductMapping(ref.id), '채널 판매 옵션을 해제했습니다.')}>해제</Button></ActionToolbar></div>) : <p className="text-[color:var(--muted)]">연결된 채널 판매 옵션이 없습니다.</p>}</>}
        </div>
      </Modal>

      <Modal open={isWarehouseModalOpen} title="창고 등록" onOpenChange={setIsWarehouseModalOpen} footer={<div className="flex justify-end gap-2"><Button type="button" variant="secondary" onClick={() => setIsWarehouseModalOpen(false)}>취소</Button><Button type="button" disabled={isPending || !warehouseName.trim()} onClick={() => run(() => createWarehouse(warehouseName), '창고가 등록되었습니다.', () => setIsWarehouseModalOpen(false))}>등록</Button></div>}><form onSubmit={(event: FormEvent) => { event.preventDefault(); if (warehouseName.trim()) run(() => createWarehouse(warehouseName), '창고가 등록되었습니다.', () => setIsWarehouseModalOpen(false)) }}><label className="space-y-1"><span className={ui.label}>창고명</span><Input ref={warehouseNameRef} value={warehouseName} onChange={(event) => setWarehouseName(event.target.value)} /></label></form></Modal>
      <Modal open={Boolean(deleteWarehouseTarget)} title="창고 삭제 확인" onOpenChange={(open) => { if (!open) setDeleteWarehouseTarget(null) }} footer={<div className="flex justify-end gap-2"><Button type="button" variant="secondary" onClick={() => setDeleteWarehouseTarget(null)}>취소</Button><Button type="button" variant="destructive" onClick={() => deleteWarehouseTarget && run(() => deleteWarehouse(deleteWarehouseTarget.id), `${deleteWarehouseTarget.name} 창고가 삭제되었습니다.`, () => setDeleteWarehouseTarget(null))}>삭제</Button></div>}><p className="text-sm text-[color:var(--muted)]">삭제 후에는 창고 재고와 연결된 내역이 이 표에서 보이지 않습니다.</p></Modal>
      <Modal open={isInternalProductModalOpen} title="내부 상품 등록" onOpenChange={(open) => { if (!isCreatingInternalProduct) setIsInternalProductModalOpen(open) }} footer={<div className="flex justify-end gap-2"><Button type="button" variant="secondary" onClick={() => setIsInternalProductModalOpen(false)} disabled={isCreatingInternalProduct}>취소</Button><Button type="button" disabled={isCreatingInternalProduct || !internalProductDraft.name.trim() || !internalProductDraft.skuPrefix.trim()} onClick={() => { setIsCreatingInternalProduct(true); run(() => createInternalProduct({ name: internalProductDraft.name, sizes: splitList(internalProductDraft.sizeText), colors: splitList(internalProductDraft.colorText), skuPrefix: internalProductDraft.skuPrefix }), '내부 상품을 등록했습니다.', () => { setIsCreatingInternalProduct(false); setIsInternalProductModalOpen(false) }) }}>등록</Button></div>}><form className="space-y-4" onSubmit={(event) => event.preventDefault()}><label className="space-y-1"><span className={ui.label}>상품명</span><Input value={internalProductDraft.name} onChange={(event) => setInternalProductDraft((draft) => ({ ...draft, name: event.target.value }))} /></label><div className="grid gap-4 md:grid-cols-2"><label className="space-y-1"><span className={ui.label}>사이즈 (선택)</span><textarea aria-label="사이즈 (선택)" value={internalProductDraft.sizeText} onChange={(event) => setInternalProductDraft((draft) => ({ ...draft, sizeText: event.target.value }))} className={ui.control} /><span className={ui.helpText}>옵션이 없으면 비워두세요.</span></label><label className="space-y-1"><span className={ui.label}>색상 (선택)</span><textarea aria-label="색상 (선택)" value={internalProductDraft.colorText} onChange={(event) => setInternalProductDraft((draft) => ({ ...draft, colorText: event.target.value }))} className={ui.control} /><span className={ui.helpText}>옵션이 없으면 비워두세요.</span></label></div><label className="space-y-1"><span className={ui.label}>SKU prefix</span><Input aria-label="SKU prefix" value={internalProductDraft.skuPrefix} onChange={(event) => setInternalProductDraft((draft) => ({ ...draft, skuPrefix: event.target.value }))} /></label><p className={cx(ui.surfaceMuted, 'px-3 py-2 text-sm text-[color:var(--muted)]')}>판매 옵션 {draftVariantCount}개 · 예시 {draftSkuExample}</p></form></Modal>
    </div>
  )
}

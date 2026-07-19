'use client'

import { useCallback, useMemo, useRef, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { closeFactoryArrivalShortage, createFactoryArrivalBatch, moveFactoryArrivalRemaindersToWarehouse, receiveFactoryArrivalRequest, recordFactoryArrivalFollowUp, replaceFactoryArrivalAllocations, reverseFactoryReceiptLine } from '@/lib/actions'
import { koreaLocalDate } from '@/lib/factory-arrival'
import { StatusBadge } from '@/components/ui/badge-1'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { EditableTable } from '@/components/ui/editable-table'
import { FixedSheet } from '@/components/ui/fixed-sheet'
import { Input } from '@/components/ui/input'
import { ProductVariantCombobox, type ProductVariantOption } from '@/components/ui/product-variant-combobox'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { BasicDataTable } from '@/components/ui/basic-data-table'
import { FilterToolbar } from '@/components/ui/filter-toolbar'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { TableSurface } from '@/components/ui/table-surface'
import InboundRegistrationSheet, { type InboundTemplateOption } from '@/app/components/inventory/InboundRegistrationSheet'
import { PageHeader, ui } from '@/app/components/ui'

type FactoryLookup = { id: number; name: string; isActive: boolean }
type WarehouseLookup = { id: number; name: string }
type ModelLookup = { id: number; name: string; sizes: Array<{ id: number; name: string }>; colors: Array<{ id: number; name: string; rgbCode: string }> }
type ArrivalRow = { key: string; modelId: number | ''; sizeId: number | ''; colorId: number | ''; orderedQuantity: number | '' }
type ReceiptDraft = { quantity: number; overageQuantity: number; overageReason: string }
type ShortageDraft = { quantity: number; reason: string }
type FollowUpDraft = { warehouseId: number; quantity: number; reason: string; receiptBusinessDate: string }
type ArrivalRecord = { id: number; factoryName: string; expectedDate: string; status: string; sourceChannel: string; memo: string | null; totalOrderedQuantity: number; remainingQuantity: number; shortageClosures: Array<{ id: number; allocationId: number; quantity: number; reason: string; closedAt: string }>; receiptLines: Array<{ id: number; eventId: number; businessDate: string; itemId: number | null; allocationId: number | null; warehouseId: number | null; receivedQuantity: number; normalQuantity: number; overageQuantity: number; overageReason: string | null; shortageClosureId: number | null; createdAt: string; corrected: boolean }>; items: Array<{ id: number; productVariantId?: number | null; modelName: string; sizeName: string; colorName: string; colorRgb: string; orderedQuantity: number; receivedQuantity: number; remainingQuantity: number; sourceRowNumber?: number | null; externalSku?: string | null; allocations: Array<{ id: number; warehouseId: number; warehouseName: string; allocatedQuantity: number; normallyReceivedQuantity: number; shortageClosedQuantity: number; remainingQuantity: number }> }> }
type SourcingSchemaState = { status: 'ready' | 'missing'; message: string | null }
type Operation = 'overview' | 'allocation' | 'receive' | 'shortage' | 'follow-up' | 'correction'
type AddSource = 'manual' | 'import'
type Sheet = { kind: 'arrival'; arrivalId: number; operation: Operation } | { kind: 'add'; source: AddSource } | null
type OperationError = { key: string; message: string }
type OperationResult = { success: true; result?: unknown } | { success: false; error: OperationError }

const status: Record<string, { label: string; tone: 'neutral' | 'info' | 'warning' | 'success' | 'danger' }> = { DRAFT: { label: '검토 필요', tone: 'neutral' }, READY: { label: '입고 예정', tone: 'info' }, PARTIAL: { label: '부분 입고', tone: 'warning' }, RECEIVED: { label: '입고 완료', tone: 'success' }, VARIANCE_CLOSED: { label: '차이 종료', tone: 'success' }, CANCELLED: { label: '취소', tone: 'danger' } }
const createRow = (): ArrivalRow => ({ key: `${Date.now()}-${Math.random()}`, modelId: '', sizeId: '', colorId: '', orderedQuantity: '' })
const requestId = () => globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`

function FieldSelect({ label, value, options, onValueChange, disabled }: { label: string; value: number | null; options: WarehouseLookup[] | FactoryLookup[]; onValueChange: (value: number | null) => void; disabled?: boolean }) {
  return <label className="block"><span className={ui.label}>{label}</span><Select value={value ? String(value) : undefined} onValueChange={(next) => onValueChange(next ? Number(next) : null)} disabled={disabled}><SelectTrigger aria-label={label} className={ui.controlSm}><SelectValue placeholder={`${label} 선택`} /></SelectTrigger><SelectContent>{options.map((item) => <SelectItem key={item.id} value={String(item.id)}>{item.name}</SelectItem>)}</SelectContent></Select></label>
}

export default function ArrivalsView({ schemaState, factories, warehouses, models, arrivals, inboundTemplates = [], productVariants = [] }: { schemaState: SourcingSchemaState; factories: FactoryLookup[]; warehouses: WarehouseLookup[]; models: ModelLookup[]; arrivals: ArrivalRecord[]; inboundTemplates?: InboundTemplateOption[]; productVariants?: Array<{ id: number; label: string }> }) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [sheet, setSheet] = useState<Sheet>(null)
  const [arrivalQuery, setArrivalQuery] = useState('')
  const [arrivalStatus, setArrivalStatus] = useState<string | null>(null)
  const [pageMessage, setPageMessage] = useState<string | null>(null)
  const [sheetError, setSheetError] = useState<string | null>(null)
  const [operationErrors, setOperationErrors] = useState<Record<string, string>>({})
  const [warehouseId, setWarehouseId] = useState<number | null>(warehouses[0]?.id ?? null)
  const [factoryId, setFactoryId] = useState<number | null>(factories.find((factory) => factory.isActive)?.id ?? factories[0]?.id ?? null)
  const [expectedDate, setExpectedDate] = useState(koreaLocalDate)
  const [rows, setRows] = useState<ArrivalRow[]>([createRow(), createRow()])
  const [receiptDrafts, setReceiptDrafts] = useState<Record<number, ReceiptDraft>>({})
  const [receiptDates, setReceiptDates] = useState<Record<number, string>>({})
  const [allocationDrafts, setAllocationDrafts] = useState<Record<number, Record<number, number>>>(() => Object.fromEntries(arrivals.flatMap((arrival) => arrival.items.map((item) => [item.id, Object.fromEntries(item.allocations.map((allocation) => [allocation.warehouseId, allocation.allocatedQuantity]))]))))
  const [reasons, setReasons] = useState<Record<number, string>>({})
  const [shortages, setShortages] = useState<Record<number, ShortageDraft>>({})
  const [followUps, setFollowUps] = useState<Record<number, FollowUpDraft>>({})
  const [corrections, setCorrections] = useState<Record<number, string>>({})
  const receiptIds = useRef<Record<number, string>>({}); const followUpIds = useRef<Record<number, string>>({}); const correctionIds = useRef<Record<number, string>>({})
  const selected = sheet?.kind === 'arrival' ? arrivals.find((arrival) => arrival.id === sheet.arrivalId) ?? null : null
  const visibleArrivals = useMemo(() => {
    const query = arrivalQuery.trim().toLocaleLowerCase('ko-KR')
    return arrivals.filter((arrival) =>
      (!arrivalStatus || arrival.status === arrivalStatus) &&
      (!query || `${arrival.factoryName} ${arrival.expectedDate} ${arrival.status}`.toLocaleLowerCase('ko-KR').includes(query)),
    )
  }, [arrivalQuery, arrivalStatus, arrivals])
  const activeFactories = factories.filter((factory) => factory.isActive); const factoryOptions = activeFactories.length ? activeFactories : factories
  const variants = useMemo<ProductVariantOption[]>(
    () => models.flatMap((model) => model.colors.flatMap((color) => model.sizes.map((size) => ({
      id: `${model.id}:${size.id}:${color.id}`,
      modelId: model.id, sizeId: size.id, colorId: color.id,
      modelName: model.name, sizeName: size.name, colorName: color.name,
      sellerSku: `${model.name}-${color.name}-${size.name}`,
      channels: { naver: 'unregistered', coupang: 'unregistered' },
    })))),
    [models],
  )
  const closeSheet = useCallback(() => { setSheet(null); setSheetError(null); setOperationErrors({}) }, [])
  const openOperation = (operation: Operation) => { if (selected) { setSheet({ kind: 'arrival', arrivalId: selected.id, operation }); setSheetError(null) } }
  const succeed = (message: string) => { setPageMessage(message); closeSheet(); router.refresh() }
  const fail = (error: unknown, fallback: string) => setSheetError(error instanceof Error ? error.message : fallback)
  const failOperation = (error: unknown, fallback: string, defaultKey: string) => {
    const structured = error && typeof error === 'object' ? error as Partial<OperationError> : null
    const key = structured?.key && typeof structured.key === 'string' ? structured.key : defaultKey
    const message = structured?.message && typeof structured.message === 'string' ? structured.message : error instanceof Error ? error.message : fallback
    setOperationErrors((current) => ({ ...current, [key]: message }))
  }
  const acceptOperationResult = (result: OperationResult, fallback: string, defaultKey: string) => {
    if (result.success) return true
    failOperation(result.error, fallback, defaultKey)
    return false
  }
  const clearOperationError = (key: string) => setOperationErrors((current) => {
    if (!(key in current)) return current
    const next = { ...current }; delete next[key]; return next
  })

  const reconciliation = (() => {
    if (!selected) return []
    const groups = new Map<string, { key: string; label: string; normal: number; overage: number; currentIncoming: number }>()
    for (const arrival of arrivals.filter((arrival) => arrival.status === 'READY' || arrival.status === 'PARTIAL')) {
      for (const item of arrival.items) {
        for (const allocation of item.allocations) {
          const key = `${item.productVariantId ?? `${item.modelName}:${item.colorName}:${item.sizeName}`}:${allocation.warehouseId}`
          const current = groups.get(key) ?? { key, label: `${item.modelName} · ${item.colorName}/${item.sizeName} · ${allocation.warehouseName}`, normal: 0, overage: 0, currentIncoming: 0 }
          const draft = arrival.id === selected.id ? receiptDrafts[allocation.id] ?? { quantity: 0, overageQuantity: 0, overageReason: '' } : { quantity: 0, overageQuantity: 0 }
          current.normal += draft.quantity
          current.overage += draft.overageQuantity
          current.currentIncoming += allocation.remainingQuantity
          groups.set(key, current)
        }
      }
    }
    const selectedKeys = new Set(selected.items.flatMap((item) => item.allocations.map((allocation) => `${item.productVariantId ?? `${item.modelName}:${item.colorName}:${item.sizeName}`}:${allocation.warehouseId}`)))
    return [...groups.values()].filter((group) => selectedKeys.has(group.key)).map((group) => ({ ...group, resultingIncoming: Math.max(group.currentIncoming - group.normal, 0) }))
  })()

  const submitManual = () => {
    const items = rows.flatMap((row) => row.modelId && row.sizeId && row.colorId && row.orderedQuantity ? [{ modelId: row.modelId, sizeId: row.sizeId, colorId: row.colorId, orderedQuantity: row.orderedQuantity }] : [])
    if (!factoryId || !warehouseId || !items.length) return setSheetError('공장, 창고, 상품 옵션과 수량을 입력해주세요.')
    if (schemaState.status === 'missing') return setSheetError(schemaState.message)
    startTransition(async () => { try { await createFactoryArrivalBatch({ factoryId, warehouseId, expectedDate, memo: '', sourceChannel: 'manual', items }); setRows([createRow(), createRow()]); succeed(`${items.length}개 예정 입고 항목을 등록했습니다.`) } catch (error) { fail(error, '예정 입고 등록에 실패했습니다.') } })
  }
  const receive = (arrival: ArrivalRecord) => {
    const lines = arrival.items.flatMap((item) => item.allocations.map((allocation) => ({ allocationId: allocation.id, quantity: receiptDrafts[allocation.id]?.quantity ?? 0, overageQuantity: receiptDrafts[allocation.id]?.overageQuantity ?? 0, overageReason: receiptDrafts[allocation.id]?.overageReason ?? '', remaining: allocation.remainingQuantity }))).filter((line) => line.quantity || line.overageQuantity)
    if (!lines.length) return setSheetError('입고 수량을 입력해주세요.')
    const invalidQuantity = lines.find((line) => line.quantity > line.remaining)
    if (invalidQuantity) return failOperation(new Error('입고 수량은 잔여 수량 이하여야 합니다.'), '', `allocation-${invalidQuantity.allocationId}`)
    const missingReason = lines.find((line) => line.overageQuantity && !line.overageReason.trim())
    if (missingReason) return failOperation(new Error('초과 입고 사유를 입력해주세요.'), '', `allocation-${missingReason.allocationId}`)
    clearOperationError(`allocation-${lines[0].allocationId}`)
    startTransition(async () => { try { const id = receiptIds.current[arrival.id] ?? requestId(); receiptIds.current[arrival.id] = id; const result = await receiveFactoryArrivalRequest({ arrivalId: arrival.id, receiptRequestId: id, receiptBusinessDate: receiptDates[arrival.id] ?? koreaLocalDate(), lines: lines.map(({ allocationId, quantity, overageQuantity, overageReason }) => ({ allocationId, quantity, overageQuantity, overageReason })) }); if (!acceptOperationResult(result, '입고 반영에 실패했습니다.', `allocation-${lines[0].allocationId}`)) return; delete receiptIds.current[arrival.id]; succeed('입고 반영이 완료되었습니다.') } catch (error) { failOperation(error, '입고 반영에 실패했습니다.', `allocation-${lines[0].allocationId}`) } })
  }
  const saveAllocation = (arrival: ArrivalRecord, item: ArrivalRecord['items'][number]) => { const reason = reasons[item.id]?.trim() ?? ''; if (!reason) return failOperation(new Error('배정 변경 사유를 입력해주세요.'), '', `item-${item.id}`); startTransition(async () => { try { const result = await replaceFactoryArrivalAllocations({ arrivalId: arrival.id, itemId: item.id, reason, allocations: Object.entries(allocationDrafts[item.id] ?? {}).filter(([, quantity]) => quantity > 0).map(([id, quantity]) => ({ warehouseId: Number(id), quantity })) }); if (!acceptOperationResult(result, '창고 배정에 실패했습니다.', `item-${item.id}`)) return; succeed('창고 배정을 저장했습니다.') } catch (error) { failOperation(error, '창고 배정에 실패했습니다.', `item-${item.id}`) } }) }
  const moveAll = (arrival: ArrivalRecord) => { const reason = reasons[arrival.id]?.trim() ?? ''; if (!warehouseId) return failOperation(new Error('기본 창고를 선택해주세요.'), '', `arrival-${arrival.id}`); if (!reason) return failOperation(new Error('전체 이동 사유를 입력해주세요.'), '', `arrival-${arrival.id}`); startTransition(async () => { try { const result = await moveFactoryArrivalRemaindersToWarehouse({ arrivalId: arrival.id, warehouseId, reason }); if (!acceptOperationResult(result, '남은 수량 이동에 실패했습니다.', `arrival-${arrival.id}`)) return; succeed('남은 수량을 기본 창고로 이동했습니다.') } catch (error) { failOperation(error, '남은 수량 이동에 실패했습니다.', `arrival-${arrival.id}`) } }) }
  const closeShortage = (id: number) => { const draft = shortages[id] ?? { quantity: 0, reason: '' }; if (draft.quantity <= 0 || !draft.reason.trim()) return failOperation(new Error('부족 수량과 사유를 입력해주세요.'), '', `allocation-${id}`); startTransition(async () => { try { const result = await closeFactoryArrivalShortage({ allocationId: id, ...draft }); if (!acceptOperationResult(result, '부족 종료에 실패했습니다.', `allocation-${id}`)) return; succeed('부족 수량을 종료했습니다.') } catch (error) { failOperation(error, '부족 종료에 실패했습니다.', `allocation-${id}`) } }) }
  const followUp = (id: number) => { const draft = followUps[id] ?? { warehouseId: warehouses[0]?.id ?? 0, quantity: 0, reason: '', receiptBusinessDate: koreaLocalDate() }; if (!draft.warehouseId || draft.quantity <= 0 || !draft.reason.trim() || !draft.receiptBusinessDate) return failOperation(new Error('후속 업무일, 창고, 수량과 사유를 입력해주세요.'), '', `closure-${id}`); startTransition(async () => { try { const receiptRequestId = followUpIds.current[id] ?? requestId(); followUpIds.current[id] = receiptRequestId; const result = await recordFactoryArrivalFollowUp({ closureId: id, ...draft, receiptRequestId }); if (!acceptOperationResult(result, '후속 입고에 실패했습니다.', `closure-${id}`)) return; delete followUpIds.current[id]; succeed('후속 입고를 기록했습니다.') } catch (error) { failOperation(error, '후속 입고에 실패했습니다.', `closure-${id}`) } }) }
  const correct = (id: number) => { const reason = corrections[id]?.trim() ?? ''; if (!reason) return failOperation(new Error('정정 사유를 입력해주세요.'), '', `receipt-line-${id}`); startTransition(async () => { try { const correctionRequestId = correctionIds.current[id] ?? requestId(); correctionIds.current[id] = correctionRequestId; const result = await reverseFactoryReceiptLine({ receiptLineId: id, correctionRequestId, reason }); if (!acceptOperationResult(result, '입고 정정에 실패했습니다.', `receipt-line-${id}`)) return; delete correctionIds.current[id]; succeed('입고 기록을 정정했습니다.') } catch (error) { failOperation(error, '입고 정정에 실패했습니다.', `receipt-line-${id}`) } }) }

  const operationButton = (operation: Operation, label: string, hidden = false) => !hidden && <Button type="button" variant={sheet?.kind === 'arrival' && sheet.operation === operation ? 'secondary' : 'outline'} size="sm" aria-pressed={sheet?.kind === 'arrival' && sheet.operation === operation} onClick={() => openOperation(operation)}>{label}</Button>
  const renderOperation = () => {
    if (!selected || sheet?.kind !== 'arrival') return null
    const operation = sheet.operation
    return <section className="space-y-4"><div className="flex gap-2 overflow-x-auto pb-1" aria-label="입고 작업">{operationButton('overview', '개요')}{operationButton('allocation', '배정 작업 열기')}{operationButton('receive', '입고 반영 작업 열기')}{operationButton('shortage', '부족 작업 열기')}{operationButton('follow-up', '후속 입고 작업 열기', !selected.shortageClosures.length)}{operationButton('correction', '정정 작업 열기', !selected.receiptLines.length)}</div>{sheetError ? <p role="alert" aria-live="assertive" className="text-sm font-medium text-[color:var(--warning-foreground)]">{sheetError}</p> : null}
      {operation === 'overview' ? <div className="space-y-3"><p className="text-sm text-[color:var(--muted)]">예정 {selected.totalOrderedQuantity}개 · 잔여 {selected.remainingQuantity}개 · {selected.expectedDate}</p>{selected.items.map((item) => <div key={item.id} className="border-t border-[color:var(--border)] pt-3 text-sm text-[color:var(--muted)]">{item.modelName} · {item.colorName}/{item.sizeName} · 잔여 {item.remainingQuantity}개</div>)}</div> : null}
      {operation === 'allocation' ? <div className="space-y-5"><div className="grid items-end gap-2 sm:grid-cols-[minmax(10rem,auto)_1fr_auto]"><FieldSelect label="기본 창고" value={warehouseId} options={warehouses} onValueChange={setWarehouseId} /><label className="min-w-0"><span className={ui.label}>전체 이동 사유</span><Input aria-label={`입고 #${selected.id} 전체 이동 사유`} value={reasons[selected.id] ?? ''} onChange={(event) => setReasons((current) => ({ ...current, [selected.id]: event.target.value }))} /></label><Button type="button" variant="outline" size="sm" onClick={() => moveAll(selected)} disabled={isPending || !selected.remainingQuantity}>남은 수량 이동</Button></div>{operationErrors[`arrival-${selected.id}`] ? <p role="alert" aria-live="assertive" data-testid={`operation-error-arrival-${selected.id}`} className="text-sm font-medium text-[color:var(--warning-foreground)]">{operationErrors[`arrival-${selected.id}`]}</p> : null}{selected.items.map((item) => <div key={item.id} className="space-y-3 border-t border-[color:var(--border)] pt-3"><div className="flex items-center justify-between gap-3"><p className="text-sm font-semibold text-[color:var(--foreground)]">{item.modelName} · {item.colorName}/{item.sizeName}</p><Button type="button" variant="outline" size="sm" onClick={() => saveAllocation(selected, item)} disabled={isPending}>배정 저장</Button></div><div className="grid gap-2 sm:grid-cols-2">{warehouses.map((warehouse) => <label key={warehouse.id}><span className={ui.label}>{warehouse.name}</span><Input aria-label={`${item.modelName} ${warehouse.name} 배정 수량`} type="number" min={0} value={allocationDrafts[item.id]?.[warehouse.id] ?? 0} onChange={(event) => setAllocationDrafts((current) => ({ ...current, [item.id]: { ...current[item.id], [warehouse.id]: Number(event.target.value) } }))} /></label>)}</div><label><span className={ui.label}>배정 변경 사유</span><Input aria-label={`${item.modelName} 배정 변경 사유`} value={reasons[item.id] ?? ''} onChange={(event) => setReasons((current) => ({ ...current, [item.id]: event.target.value }))} /></label>{operationErrors[`item-${item.id}`] ? <p role="alert" aria-live="assertive" data-testid={`operation-error-item-${item.id}`} className="text-sm font-medium text-[color:var(--warning-foreground)]">{operationErrors[`item-${item.id}`]}</p> : null}</div>)}</div> : null}
      {operation === 'receive' ? <div className="space-y-4"><label><span className={ui.label}>입고 업무일</span><Input aria-label={`입고 #${selected.id} 업무일`} type="date" value={receiptDates[selected.id] ?? koreaLocalDate()} onChange={(event) => setReceiptDates((current) => ({ ...current, [selected.id]: event.target.value }))} /></label>{selected.items.flatMap((item) => item.allocations).map((allocation) => { const draft = receiptDrafts[allocation.id] ?? { quantity: 0, overageQuantity: 0, overageReason: '' }; return <div key={allocation.id} className="grid gap-2 border-t border-[color:var(--border)] pt-3 sm:grid-cols-3"><p className="text-sm text-[color:var(--muted)]">{allocation.warehouseName}<br />잔여 {allocation.remainingQuantity}개</p><label><span className={ui.label}>정상 입고</span><Input aria-label={`${allocation.warehouseName} 정상 입고`} type="number" min={0} value={draft.quantity} onChange={(event) => setReceiptDrafts((current) => ({ ...current, [allocation.id]: { ...draft, quantity: Number(event.target.value) } }))} /></label><label><span className={ui.label}>초과</span><Input aria-label={`${allocation.warehouseName} 초과 입고`} type="number" min={0} value={draft.overageQuantity} onChange={(event) => setReceiptDrafts((current) => ({ ...current, [allocation.id]: { ...draft, overageQuantity: Number(event.target.value) } }))} /></label><label className="sm:col-span-3"><span className={ui.label}>초과 사유</span><Input aria-label={`${allocation.warehouseName} 초과 사유`} value={draft.overageReason} onChange={(event) => setReceiptDrafts((current) => ({ ...current, [allocation.id]: { ...draft, overageReason: event.target.value } }))} /></label>{operationErrors[`allocation-${allocation.id}`] ? <p role="alert" aria-live="assertive" data-testid={`operation-error-allocation-${allocation.id}`} className="sm:col-span-3 text-sm font-medium text-[color:var(--warning-foreground)]">{operationErrors[`allocation-${allocation.id}`]}</p> : null}</div> })}<section aria-labelledby="receipt-reconciliation-title" className="space-y-2 border-t border-[color:var(--border)] pt-3"><h3 id="receipt-reconciliation-title" className="text-sm font-semibold text-[color:var(--foreground)]">반영 전 확인</h3>{reconciliation.map((group) => <div key={group.key} className="flex flex-col gap-1 text-sm sm:flex-row sm:items-center sm:justify-between"><span className="font-medium text-[color:var(--foreground)]">{group.label}</span><span className="tabular-nums text-[color:var(--muted)]">정상 {group.normal} · 초과 {group.overage} · 반영 후 입고 예정 {group.resultingIncoming}</span></div>)}</section><Button type="button" onClick={() => receive(selected)} disabled={isPending || schemaState.status === 'missing'}>입고 반영</Button></div> : null}
      {operation === 'shortage' ? <div className="space-y-3">{selected.items.flatMap((item) => item.allocations).filter((allocation) => allocation.remainingQuantity > 0).map((allocation) => { const draft = shortages[allocation.id] ?? { quantity: 0, reason: '' }; return <div key={allocation.id} className="grid gap-2 border-t border-[color:var(--border)] pt-3 sm:grid-cols-[1fr_8rem_1fr_auto]"><p className="text-sm text-[color:var(--muted)]">{allocation.warehouseName} · 잔여 {allocation.remainingQuantity}개</p><Input aria-label={`${allocation.warehouseName} 부족 수량`} type="number" min={1} value={draft.quantity} onChange={(event) => setShortages((current) => ({ ...current, [allocation.id]: { ...draft, quantity: Number(event.target.value) } }))} /><Input aria-label={`${allocation.warehouseName} 부족 사유`} value={draft.reason} onChange={(event) => setShortages((current) => ({ ...current, [allocation.id]: { ...draft, reason: event.target.value } }))} /><Button type="button" variant="outline" size="sm" onClick={() => closeShortage(allocation.id)} disabled={isPending}>부족 종료</Button>{operationErrors[`allocation-${allocation.id}`] ? <p role="alert" aria-live="assertive" data-testid={`operation-error-allocation-${allocation.id}`} className="sm:col-span-4 text-sm font-medium text-[color:var(--warning-foreground)]">{operationErrors[`allocation-${allocation.id}`]}</p> : null}</div> })}</div> : null}
      {operation === 'follow-up' ? <div className="space-y-3">{selected.shortageClosures.map((closure) => { const draft = followUps[closure.id] ?? { warehouseId: warehouses[0]?.id ?? 0, quantity: 0, reason: '', receiptBusinessDate: koreaLocalDate() }; return <div key={closure.id} className="grid gap-2 border-t border-[color:var(--border)] pt-3 md:grid-cols-2"><p className="text-sm text-[color:var(--muted)] md:col-span-2">{closure.quantity}개 · {closure.reason}</p><label><span className={ui.label}>후속 업무일</span><Input aria-label={`부족 #${closure.id} 후속 업무일`} type="date" value={draft.receiptBusinessDate} onChange={(event) => setFollowUps((current) => ({ ...current, [closure.id]: { ...draft, receiptBusinessDate: event.target.value } }))} /></label><FieldSelect label="후속 창고" value={draft.warehouseId} options={warehouses} onValueChange={(warehouseId) => setFollowUps((current) => ({ ...current, [closure.id]: { ...draft, warehouseId: warehouseId ?? 0 } }))} /><Input aria-label={`부족 #${closure.id} 후속 수량`} type="number" value={draft.quantity} onChange={(event) => setFollowUps((current) => ({ ...current, [closure.id]: { ...draft, quantity: Number(event.target.value) } }))} /><Input aria-label={`부족 #${closure.id} 후속 사유`} value={draft.reason} onChange={(event) => setFollowUps((current) => ({ ...current, [closure.id]: { ...draft, reason: event.target.value } }))} />{operationErrors[`closure-${closure.id}`] ? <p role="alert" aria-live="assertive" data-testid={`operation-error-closure-${closure.id}`} className="text-sm font-medium text-[color:var(--warning-foreground)]">{operationErrors[`closure-${closure.id}`]}</p> : <span />}<Button type="button" variant="outline" size="sm" onClick={() => followUp(closure.id)} disabled={isPending}>후속 입고</Button></div> })}</div> : null}
      {operation === 'correction' ? <div className="space-y-3">{selected.receiptLines.map((line) => <div key={line.id} className="grid gap-2 border-t border-[color:var(--border)] pt-3 sm:grid-cols-[1fr_1fr_auto]"><p className="text-sm text-[color:var(--muted)]">{line.businessDate} · 정상 {line.normalQuantity} · 초과 {line.overageQuantity}{line.corrected ? ' · 정정 완료' : ''}</p>{!line.corrected && <><Input aria-label={`입고 기록 #${line.id} 정정 사유`} value={corrections[line.id] ?? ''} onChange={(event) => setCorrections((current) => ({ ...current, [line.id]: event.target.value }))} /><Button type="button" variant="outline" size="sm" onClick={() => correct(line.id)} disabled={isPending}>전체 반전</Button>{operationErrors[`receipt-line-${line.id}`] ? <p role="alert" aria-live="assertive" data-testid={`operation-error-receipt-line-${line.id}`} className="sm:col-span-3 text-sm font-medium text-[color:var(--warning-foreground)]">{operationErrors[`receipt-line-${line.id}`]}</p> : null}</>}</div>)}</div> : null}
    </section>
  }
  const renderManual = () => <div className="space-y-4">
    {sheetError ? <p role="alert" aria-live="assertive" className="text-sm font-medium text-[color:var(--warning-foreground)]">{sheetError}</p> : null}
    <Card>
      <CardHeader><CardTitle>기본 정보</CardTitle></CardHeader>
      <CardContent>
        <div className="grid gap-3 md:grid-cols-3">
          <FieldSelect label="공장" value={factoryId} options={factoryOptions} onValueChange={setFactoryId} disabled={!factoryOptions.length} />
          <FieldSelect label="입고 예정 창고" value={warehouseId} options={warehouses} onValueChange={setWarehouseId} disabled={!warehouses.length} />
          <label><span className={ui.label}>예정 입고일</span><Input aria-label="예정 입고일" type="date" value={expectedDate} onChange={(event) => setExpectedDate(event.target.value)} /></label>
        </div>
      </CardContent>
    </Card>
    <Card>
      <CardHeader><CardTitle>등록 항목</CardTitle></CardHeader>
      <CardContent>
        <EditableTable
          columns={[{ key: 'variant', header: '상품 옵션' }, { key: 'quantity', header: '수량', width: '8rem' }]}
          rows={rows}
          getRowKey={(row) => row.key}
          minRows={1}
          onAddRow={() => setRows((current) => [...current, createRow()])}
          onDeleteRow={(key) => setRows((current) => current.filter((row) => row.key !== key))}
          renderCell={(row, columnKey, index) => columnKey === 'variant'
            ? <ProductVariantCombobox aria-label={`항목 #${index + 1} 상품 옵션`} variants={variants} value={row.modelId ? `${row.modelId}:${row.sizeId}:${row.colorId}` : null} onValueChange={(id) => { const variant = variants.find((item) => item.id === id); setRows((current) => current.map((item) => item.key === row.key ? { ...item, modelId: variant?.modelId ?? '', sizeId: variant?.sizeId ?? '', colorId: variant?.colorId ?? '' } : item)) }} />
            : <Input aria-label={`항목 #${index + 1} 수량`} placeholder="수량" type="number" min={1} value={row.orderedQuantity} onChange={(event) => setRows((current) => current.map((item) => item.key === row.key ? { ...item, orderedQuantity: event.target.value ? Number(event.target.value) : '' } : item))} />}
        />
      </CardContent>
    </Card>
    <Button type="button" onClick={submitManual} disabled={isPending || schemaState.status === 'missing'}>예정 입고 등록</Button>
  </div>
  const renderAdd = () => {
    if (sheet?.kind !== 'add') return null
    return <Tabs value={sheet.source} onValueChange={(value) => setSheet({ kind: 'add', source: value as AddSource })}>
      <TabsList aria-label="입고 예정 등록 방식">
        <TabsTrigger value="manual">직접 입력</TabsTrigger>
        <TabsTrigger value="import">엑셀에서</TabsTrigger>
      </TabsList>
      <TabsContent value="manual">{renderManual()}</TabsContent>
      <TabsContent value="import"><InboundRegistrationSheet suppliers={factories.map((factory) => ({ id: factory.id, name: factory.name }))} warehouses={warehouses} templates={inboundTemplates} productVariants={productVariants} returnTo="/sourcing/arrivals" onSaved={() => succeed('엑셀 검토를 저장했습니다.')} /></TabsContent>
    </Tabs>
  }
  const title = sheet?.kind === 'arrival' ? `${selected?.factoryName ?? ''} 입고 예정` : sheet?.kind === 'add' ? '입고 예정 추가' : ''
  const description = sheet?.kind === 'arrival' ? '한 작업씩 열어 배정, 입고, 부족과 정정을 처리합니다.' : sheet?.kind === 'add' ? (sheet.source === 'manual' ? '엑셀 없이 확인된 예정 수량을 직접 등록합니다.' : '파일 검토와 SKU 연결을 저장한 뒤 두 번째 단계에서 기본 창고를 선택합니다.') : undefined
  return <div className={ui.shell}><PageHeader title="입고 예정" description="공장 엑셀을 검토·연결하고 창고 배정과 실제 입고를 관리합니다." actions={<Button type="button" onClick={() => { setSheet({ kind: 'add', source: 'manual' }); setSheetError(null) }}>입고 예정 추가</Button>} />
    {schemaState.status === 'missing' && schemaState.message ? <p role="status" className="mb-4 text-sm font-medium text-[color:var(--warning-foreground)]">{schemaState.message}</p> : null}{pageMessage ? <p role="status" aria-live="polite" className="mb-4 text-sm text-[color:var(--muted)]">{pageMessage}</p> : null}
    <TableSurface
      toolbar={<FilterToolbar><div className={ui.toolbarDense}><Input type="search" aria-label="입고 예정 검색" value={arrivalQuery} onChange={(event) => setArrivalQuery(event.target.value)} placeholder="공장 또는 예정일 검색" className="w-52 shrink-0" /><Select value={arrivalStatus ?? 'all'} onValueChange={(value) => setArrivalStatus(value === 'all' ? null : value)}><SelectTrigger aria-label="입고 예정 상태" className={ui.controlSm}><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">전체 상태</SelectItem>{Object.entries(status).map(([value, item]) => <SelectItem key={value} value={value}>{item.label}</SelectItem>)}</SelectContent></Select></div><span className={ui.statusPillDense}>총 {visibleArrivals.length}건</span></FilterToolbar>}
    >
      <BasicDataTable
        bare
        tableAriaLabel="입고 예정 목록"
        columns={[{ key: 'factory', label: '공장' }, { key: 'expectedDate', label: '예정일' }, { key: 'quantity', label: '수량', align: 'right' }, { key: 'status', label: '상태' }, { key: 'action', label: <span className="sr-only">작업</span>, align: 'right' }]}
        rows={visibleArrivals}
        rowKey={(arrival) => arrival.id}
        rowAriaLabel={(arrival) => `${arrival.factoryName} 입고 예정 상세 보기`}
        onRowClick={(arrival) => { setSheet({ kind: 'arrival', arrivalId: arrival.id, operation: 'overview' }); setSheetError(null) }}
        emptyState={arrivals.length === 0 ? '등록된 예정 입고가 없습니다.' : '검색 조건에 맞는 예정 입고가 없습니다.'}
        renderCell={(arrival, column) => {
          if (column === 'factory') return <span className="font-medium text-[color:var(--foreground)]">{arrival.factoryName}</span>
          if (column === 'expectedDate') return <span className="text-[color:var(--muted)]">{arrival.expectedDate}</span>
          if (column === 'quantity') return <span className="font-mono tabular-nums text-[color:var(--muted)]">{arrival.remainingQuantity} / {arrival.totalOrderedQuantity}</span>
          if (column === 'status') return <StatusBadge tone={(status[arrival.status] ?? status.DRAFT).tone}>{(status[arrival.status] ?? { label: arrival.status }).label}</StatusBadge>
          return <Button type="button" variant="outline" size="sm" aria-label={`입고 #${arrival.id} 상세 보기`} onClick={(event) => { event.stopPropagation(); setSheet({ kind: 'arrival', arrivalId: arrival.id, operation: 'overview' }); setSheetError(null) }}>상세 보기</Button>
        }}
      />
    </TableSurface>
    <FixedSheet open={sheet !== null} title={title} description={description} onClose={closeSheet}>{sheet?.kind === 'arrival' ? renderOperation() : sheet?.kind === 'add' ? renderAdd() : null}</FixedSheet>
  </div>
}

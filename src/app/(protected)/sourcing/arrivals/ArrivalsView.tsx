'use client'

import { useMemo, useRef, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { closeFactoryArrivalShortage, createFactoryArrivalBatch, moveFactoryArrivalRemaindersToWarehouse, receiveFactoryArrivalRequest, recordFactoryArrivalFollowUp, replaceFactoryArrivalAllocations, reverseFactoryReceiptLine } from '@/lib/actions'
import { koreaLocalDate } from '@/lib/factory-arrival'
import { StatusBadge } from '@/components/ui/badge-1'
import { Card, CardContent } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ProductVariantCombobox, type ProductVariantOption } from '@/components/ui/product-variant-combobox'
import InboundRegistrationSheet, { type InboundTemplateOption } from '@/app/components/inventory/InboundRegistrationSheet'
import { Button } from '@/components/ui/button'
import { FixedSheet } from '@/components/ui/fixed-sheet'
import { PageHeader, cx, ui } from '@/app/components/ui'

type FactoryLookup = {
  id: number
  name: string
  isActive: boolean
}

type WarehouseLookup = {
  id: number
  name: string
}

type ModelLookup = {
  id: number
  name: string
  sizes: Array<{ id: number; name: string }>
  colors: Array<{ id: number; name: string; rgbCode: string }>
}

type ArrivalRow = {
  key: string
  modelId: number | ''
  sizeId: number | ''
  colorId: number | ''
  orderedQuantity: number | ''
  error: string | null
}

type ArrivalRecord = {
  id: number
  factoryName: string
  expectedDate: string
  status: string
  sourceChannel: string
  memo: string | null
  totalOrderedQuantity: number
  remainingQuantity: number
  shortageClosures: Array<{ id: number; allocationId: number; quantity: number; reason: string; closedAt: string }>
  receiptLines: Array<{ id: number; eventId: number; businessDate: string; itemId: number | null; allocationId: number | null; warehouseId: number | null; receivedQuantity: number; normalQuantity: number; overageQuantity: number; overageReason: string | null; shortageClosureId: number | null; createdAt: string; corrected: boolean }>
  items: Array<{
    id: number
    modelName: string
    sizeName: string
    colorName: string
    colorRgb: string
    orderedQuantity: number
    receivedQuantity: number
    remainingQuantity: number
    sourceRowNumber?: number | null
    externalSku?: string | null
    allocations: Array<{ id: number; warehouseId: number; warehouseName: string; allocatedQuantity: number; normallyReceivedQuantity: number; shortageClosedQuantity: number; remainingQuantity: number }>
  }>
}

type ReceiptDraft = { quantity: number; overageQuantity: number; overageReason: string }
type ShortageDraft = { quantity: number; reason: string }
type FollowUpDraft = { warehouseId: number; quantity: number; reason: string; receiptBusinessDate: string }

type SelectOption<Value extends string | number> = {
  value: Value
  label: string
}

type SourcingSchemaState = {
  status: 'ready' | 'missing'
  message: string | null
}

function createRow(): ArrivalRow {
  return {
    key: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    modelId: '',
    sizeId: '',
    colorId: '',
    orderedQuantity: '',
    error: null,
  }
}

function buildReceiptDrafts(arrivals: ArrivalRecord[]) {
  return Object.fromEntries(arrivals.flatMap((arrival) => arrival.items.flatMap((item) => item.allocations.map((allocation) => [allocation.id, { quantity: 0, overageQuantity: 0, overageReason: '' } satisfies ReceiptDraft]))))
}

const arrivalStatus: Record<string, { label: string; tone: 'neutral' | 'info' | 'warning' | 'success' | 'danger' }> = {
  DRAFT: { label: '검토 필요', tone: 'neutral' }, READY: { label: '입고 예정', tone: 'info' }, PARTIAL: { label: '부분 입고', tone: 'warning' }, RECEIVED: { label: '입고 완료', tone: 'success' }, VARIANCE_CLOSED: { label: '차이 종료', tone: 'success' }, CANCELLED: { label: '취소', tone: 'danger' },
}

function createRequestId() {
  return globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`
}

function SelectField<Value extends string | number>({
  label,
  value,
  placeholder,
  options,
  onValueChange,
  disabled,
}: {
  label: string
  value: Value | null
  placeholder: string
  options: Array<SelectOption<Value>>
  onValueChange: (value: Value | null) => void
  disabled?: boolean
}) {
  return (
    <div>
      <label className={ui.label}>{label}</label>
      <Select
        value={value !== null ? String(value) : undefined}
        onValueChange={(next) => onValueChange(next ? (next as Value) : null)}
        disabled={disabled}
      >
        <SelectTrigger aria-label={label} className={ui.controlSm}>
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          {options.map((option) => (
            <SelectItem key={String(option.value)} value={String(option.value)}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}

export default function ArrivalsView({
  schemaState,
  factories,
  warehouses,
  models,
  arrivals,
  inboundTemplates = [],
  productVariants = [],
}: {
  schemaState: SourcingSchemaState
  factories: FactoryLookup[]
  warehouses: WarehouseLookup[]
  models: ModelLookup[]
  arrivals: ArrivalRecord[]
  inboundTemplates?: InboundTemplateOption[]
  productVariants?: Array<{ id: number; label: string }>
}) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [message, setMessage] = useState<string | null>(null)
  const [factoryId, setFactoryId] = useState<number | null>(factories.find((factory) => factory.isActive)?.id ?? factories[0]?.id ?? null)
  const [arrivalWarehouseId, setArrivalWarehouseId] = useState<number | null>(warehouses[0]?.id ?? null)
  const [expectedDate, setExpectedDate] = useState(koreaLocalDate)
  const [memo, setMemo] = useState('')
  const [rows, setRows] = useState<ArrivalRow[]>([createRow(), createRow()])
  const [receiptDrafts, setReceiptDrafts] = useState<Record<number, ReceiptDraft>>(() => buildReceiptDrafts(arrivals))
  const [receiptBusinessDates, setReceiptBusinessDates] = useState<Record<number, string>>({})
  const [allocationDrafts, setAllocationDrafts] = useState<Record<number, Record<number, number>>>(() => Object.fromEntries(arrivals.flatMap((arrival) => arrival.items.map((item) => [item.id, Object.fromEntries(item.allocations.map((allocation) => [allocation.warehouseId, allocation.allocatedQuantity]))]))))
  const [allocationReasons, setAllocationReasons] = useState<Record<number, string>>({})
  const [shortageDrafts, setShortageDrafts] = useState<Record<number, ShortageDraft>>({})
  const [followUpDrafts, setFollowUpDrafts] = useState<Record<number, FollowUpDraft>>({})
  const [correctionReasons, setCorrectionReasons] = useState<Record<number, string>>({})
  const [importOpen, setImportOpen] = useState(false)
  const [manualOpen, setManualOpen] = useState(false)
  const receiptRequestIds = useRef<Record<number, string>>({})
  const followUpRequestIds = useRef<Record<number, string>>({})
  const correctionRequestIds = useRef<Record<number, string>>({})

  const activeFactories = factories.filter((factory) => factory.isActive)
  const factoryOptions = activeFactories.length > 0 ? activeFactories : factories

  const normalizedRows = useMemo(
    () =>
      rows.map((row) => {
        const model = models.find((entry) => entry.id === row.modelId)
        const size = model?.sizes.find((entry) => entry.id === row.sizeId)
        const color = model?.colors.find((entry) => entry.id === row.colorId)
        const valid = !!(model && size && color && row.orderedQuantity && row.orderedQuantity > 0)

        return {
          ...row,
          model,
          size,
          color,
          valid,
        }
      }),
    [models, rows],
  )

  const arrivalProductVariants = useMemo<ProductVariantOption[]>(() => models.flatMap((model) => model.colors.flatMap((color) => model.sizes.map((size) => ({
    id: `${model.id}:${size.id}:${color.id}`,
    modelId: model.id,
    sizeId: size.id,
    colorId: color.id,
    modelName: model.name,
    sizeName: size.name,
    colorName: color.name,
    sellerSku: `${model.name}-${color.name}-${size.name}`,
    channels: { naver: 'unregistered', coupang: 'unregistered' },
  })))), [models])

  const submitRows = () => {
    const selectedFactoryId = factoryId

    const validRows = normalizedRows
      .filter((row) => row.valid)
      .map((row) => ({
        modelId: row.modelId as number,
        sizeId: row.sizeId as number,
        colorId: row.colorId as number,
        orderedQuantity: row.orderedQuantity as number,
      }))

    if (!selectedFactoryId) {
      setMessage('공장을 선택해주세요.')
      return
    }

    if (!arrivalWarehouseId) {
      setMessage('입고 예정 창고를 선택해주세요.')
      return
    }

    if (schemaState.status === 'missing') {
      setMessage(schemaState.message)
      return
    }

    startTransition(async () => {
      try {
        await createFactoryArrivalBatch({
          factoryId: selectedFactoryId,
          warehouseId: arrivalWarehouseId,
          expectedDate,
          memo,
          sourceChannel: 'manual',
          items: validRows,
        })
        setRows([createRow(), createRow()])
        setMemo('')
        setMessage(`${validRows.length}개 예정 입고 항목을 등록했습니다.`)
        setManualOpen(false)
        router.refresh()
      } catch (error) {
        setMessage(error instanceof Error ? error.message : '예정 입고 등록에 실패했습니다.')
      }
    })
  }

  const submitReceive = (arrival: ArrivalRecord) => {
    const lines = arrival.items.flatMap((item) => item.allocations.map((allocation) => ({ allocationId: allocation.id, quantity: receiptDrafts[allocation.id]?.quantity ?? 0, overageQuantity: receiptDrafts[allocation.id]?.overageQuantity ?? 0, overageReason: receiptDrafts[allocation.id]?.overageReason ?? '', remainingQuantity: allocation.remainingQuantity }))).filter((line) => line.quantity > 0 || line.overageQuantity > 0)
    if (lines.length === 0) {
      setMessage('입고 수량을 입력해주세요.')
      return
    }
    if (lines.some((line) => line.quantity > line.remainingQuantity)) {
      setMessage('입고 수량은 잔여 수량 이하여야 합니다.')
      return
    }
    if (lines.some((line) => line.overageQuantity > 0 && !line.overageReason.trim())) { setMessage('초과 입고 사유를 입력해주세요.'); return }

    if (schemaState.status === 'missing') {
      setMessage(schemaState.message)
      return
    }

    startTransition(async () => {
      try {
        const receiptRequestId = receiptRequestIds.current[arrival.id] ?? createRequestId()
        receiptRequestIds.current[arrival.id] = receiptRequestId
        await receiveFactoryArrivalRequest({
          arrivalId: arrival.id,
          receiptRequestId,
          receiptBusinessDate: receiptBusinessDates[arrival.id] ?? koreaLocalDate(),
          lines: lines.map(({ allocationId, quantity, overageQuantity, overageReason }) => ({ allocationId, quantity, overageQuantity, overageReason })),
        })
        delete receiptRequestIds.current[arrival.id]
        setReceiptDrafts((current) => ({ ...current, ...Object.fromEntries(arrival.items.flatMap((item) => item.allocations.map((allocation) => [allocation.id, { quantity: 0, overageQuantity: 0, overageReason: '' } satisfies ReceiptDraft]))) }))
        setMessage('입고 반영이 완료되었습니다.')
        router.refresh()
      } catch (error) {
        setMessage(error instanceof Error ? error.message : '입고 반영에 실패했습니다.')
      }
    })
  }

  const saveAllocations = (arrivalId: number, item: ArrivalRecord['items'][number]) => startTransition(async () => {
    try {
      const targets = allocationDrafts[item.id] ?? {}
      await replaceFactoryArrivalAllocations({ arrivalId, itemId: item.id, reason: allocationReasons[item.id] ?? '', allocations: Object.entries(targets).filter(([, quantity]) => quantity > 0).map(([warehouseId, quantity]) => ({ warehouseId: Number(warehouseId), quantity })) })
      setMessage('창고 배정을 저장했습니다.'); router.refresh()
    } catch (error) { setMessage(error instanceof Error ? error.message : '창고 배정에 실패했습니다.') }
  })

  const moveAllRemaining = (arrival: ArrivalRecord) => startTransition(async () => {
    try {
      if (!arrivalWarehouseId) throw new Error('기본 창고를 선택해주세요.')
      const reason = allocationReasons[arrival.id] ?? ''
      await moveFactoryArrivalRemaindersToWarehouse({ arrivalId: arrival.id, warehouseId: arrivalWarehouseId, reason })
      setMessage('남은 수량을 기본 창고로 이동했습니다.'); router.refresh()
    } catch (error) { setMessage(error instanceof Error ? error.message : '남은 수량 이동에 실패했습니다.') }
  })

  const closeShortage = (allocationId: number) => startTransition(async () => {
    const draft = shortageDrafts[allocationId] ?? { quantity: 0, reason: '' }
    try { await closeFactoryArrivalShortage({ allocationId, quantity: draft.quantity, reason: draft.reason }); setMessage('부족 수량을 종료했습니다.'); router.refresh() } catch (error) { setMessage(error instanceof Error ? error.message : '부족 종료에 실패했습니다.') }
  })

  const recordFollowUp = (closureId: number) => startTransition(async () => {
    const draft = followUpDrafts[closureId] ?? { warehouseId: warehouses[0]?.id ?? 0, quantity: 0, reason: '', receiptBusinessDate: koreaLocalDate() }
    try { const receiptRequestId = followUpRequestIds.current[closureId] ?? createRequestId(); followUpRequestIds.current[closureId] = receiptRequestId; await recordFactoryArrivalFollowUp({ closureId, warehouseId: draft.warehouseId, quantity: draft.quantity, reason: draft.reason, receiptRequestId, receiptBusinessDate: draft.receiptBusinessDate }); delete followUpRequestIds.current[closureId]; setMessage('후속 입고를 기록했습니다.'); router.refresh() } catch (error) { setMessage(error instanceof Error ? error.message : '후속 입고에 실패했습니다.') }
  })

  const reverseLine = (lineId: number) => startTransition(async () => {
    try { const correctionRequestId = correctionRequestIds.current[lineId] ?? createRequestId(); correctionRequestIds.current[lineId] = correctionRequestId; await reverseFactoryReceiptLine({ receiptLineId: lineId, correctionRequestId, reason: correctionReasons[lineId] ?? '' }); delete correctionRequestIds.current[lineId]; setMessage('입고 기록을 정정했습니다.'); router.refresh() } catch (error) { setMessage(error instanceof Error ? error.message : '입고 정정에 실패했습니다.') }
  })

  return (
    <div className={ui.shell}>
      <PageHeader
        title="입고 예정"
        description="공장 엑셀을 검토·연결하고 창고 배정과 실제 입고를 관리합니다."
        actions={<><Button type="button" variant="outline" size="sm" onClick={() => setManualOpen(true)}>수동 추가</Button><Button type="button" size="sm" onClick={() => setImportOpen(true)}>엑셀 가져오기</Button></>}
      />

      {schemaState.status === 'missing' && schemaState.message ? (
        <Card variant="muted" className="mb-4 overflow-hidden">
          <CardContent className="px-4 py-3 text-sm font-medium text-[color:var(--muted)]">{schemaState.message}</CardContent>
        </Card>
      ) : null}

      {message ? (
        <Card variant="muted" className="mb-4 overflow-hidden" aria-live="polite">
          <CardContent className="px-4 py-3 text-sm text-[color:var(--muted)]">{message}</CardContent>
        </Card>
      ) : null}

      <section className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-base font-semibold tracking-tight text-[color:var(--foreground)]">예정 목록</h2>
          <span className={ui.pill}>총 {arrivals.length}건</span>
        </div>

        <div className={ui.tableShell}>
          <div className="divide-y divide-[color:var(--border)]">
            {arrivals.length === 0 ? (
              <div className={ui.emptyState}>등록된 예정 입고가 없습니다.</div>
            ) : (
              arrivals.map((arrival) => (
                <div key={arrival.id} className="space-y-4 px-4 py-4 md:px-5">
                  <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-base font-semibold text-[color:var(--foreground)]">{arrival.factoryName}</h3>
                        <StatusBadge tone={(arrivalStatus[arrival.status] ?? arrivalStatus.DRAFT).tone} className="px-2.5 py-1">
                          {(arrivalStatus[arrival.status] ?? { label: arrival.status }).label}
                        </StatusBadge>
                      </div>
                      <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-[color:var(--muted-foreground)]">
                        <span>{arrival.expectedDate}</span>
                        <StatusBadge tone={arrival.sourceChannel === 'csv' ? 'info' : 'neutral'} className="px-2.5 py-1">
                          {arrival.sourceChannel === 'csv' ? '엑셀 등록' : '수동 등록'}
                        </StatusBadge>
                      </div>
                      {arrival.memo ? <p className="mt-2 text-sm text-[color:var(--muted)]">{arrival.memo}</p> : null}
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <span className={ui.pillMuted}>총 수량 {arrival.totalOrderedQuantity}개</span>
                      <span className={ui.pillMuted}>잔여 수량 {arrival.remainingQuantity}개</span>
                    </div>
                  </div>

                  <div className="space-y-4 border-t border-[color:var(--border)] pt-4">
                    <div className="flex flex-wrap items-end justify-between gap-2"><div><p className="text-sm font-semibold text-[color:var(--foreground)]">창고 배정 · 입고</p><p className="mt-1 text-sm text-[color:var(--muted-foreground)]">행별 배정을 먼저 저장하고 여러 창고·행의 실제 수량을 한 번에 반영합니다.</p></div><label><span className={ui.label}>기본 창고</span><Select value={arrivalWarehouseId ? String(arrivalWarehouseId) : undefined} onValueChange={(value) => setArrivalWarehouseId(Number(value))}><SelectTrigger aria-label="기본 창고" className={ui.controlSm}><SelectValue /></SelectTrigger><SelectContent>{warehouses.map((warehouse) => <SelectItem key={warehouse.id} value={String(warehouse.id)}>{warehouse.name}</SelectItem>)}</SelectContent></Select></label><label><span className={ui.label}>전체 이동 사유</span><input aria-label={`입고 #${arrival.id} 전체 이동 사유`} value={allocationReasons[arrival.id] ?? ''} onChange={(event) => setAllocationReasons((current) => ({ ...current, [arrival.id]: event.target.value }))} className={ui.controlSm} /></label><button type="button" className={ui.buttonSecondary} onClick={() => moveAllRemaining(arrival)} disabled={isPending || !arrival.remainingQuantity}>남은 수량 이동</button></div>
                    {arrival.items.map((item) => (
                      <div key={item.id} className="space-y-3 border-t border-[color:var(--border)] pt-3 first:border-t-0 first:pt-0">
                        <div className="flex items-center justify-between gap-3"><div><p className="text-sm font-semibold text-[color:var(--foreground)]">{item.modelName}</p><p className="text-xs text-[color:var(--muted-foreground)]">{item.sourceRowNumber ? `원본 행 ${item.sourceRowNumber} · ` : ''}{item.externalSku ? `외부 SKU ${item.externalSku} · ` : ''}{item.colorName} / {item.sizeName} · 주문 {item.orderedQuantity} · 입고 예정 {item.remainingQuantity}</p></div><button type="button" className={ui.buttonSecondary} onClick={() => saveAllocations(arrival.id, item)} disabled={isPending || ['RECEIVED','VARIANCE_CLOSED','CANCELLED'].includes(arrival.status)}>배정 저장</button></div>
                        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                          {warehouses.map((warehouse) => { const fixed = item.allocations.find((allocation) => allocation.warehouseId === warehouse.id); return <label key={warehouse.id} className="space-y-1"><span className={ui.label}>{warehouse.name}{fixed && fixed.normallyReceivedQuantity + fixed.shortageClosedQuantity > 0 ? ` · 고정 ${fixed.normallyReceivedQuantity + fixed.shortageClosedQuantity}` : ''}</span><input aria-label={`${item.modelName} ${warehouse.name} 배정 수량`} type="number" min={fixed ? fixed.normallyReceivedQuantity + fixed.shortageClosedQuantity : 0} value={allocationDrafts[item.id]?.[warehouse.id] ?? 0} onChange={(event) => setAllocationDrafts((current) => ({ ...current, [item.id]: { ...current[item.id], [warehouse.id]: Number(event.target.value) } }))} className={cx(ui.controlSm, 'text-right')} /></label> })}
                        </div>
                        <label className="block max-w-md"><span className={ui.label}>배정 변경 사유</span><input aria-label={`${item.modelName} 배정 변경 사유`} value={allocationReasons[item.id] ?? ''} onChange={(event) => setAllocationReasons((current) => ({ ...current, [item.id]: event.target.value }))} className={ui.controlSm} placeholder="창고 분배 변경 사유" /></label>
                        {item.allocations.map((allocation) => { const draft = receiptDrafts[allocation.id] ?? { quantity: 0, overageQuantity: 0, overageReason: '' }; const shortage = shortageDrafts[allocation.id] ?? { quantity: 0, reason: '' }; return (
                          <div key={allocation.id} className="grid gap-2 border-t border-[color:var(--border)] pt-3 md:grid-cols-[minmax(8rem,1fr)_7rem_7rem_minmax(10rem,1fr)] md:items-end">
                            <div><p className="text-sm font-medium text-[color:var(--foreground)]">{allocation.warehouseName}</p><p className="text-xs text-[color:var(--muted-foreground)]">배정 {allocation.allocatedQuantity} · 정상 {allocation.normallyReceivedQuantity} · 부족 종료 {allocation.shortageClosedQuantity} · 잔여 {allocation.remainingQuantity}</p></div>
                            <label><span className={ui.label}>정상 입고</span><input aria-label={`${allocation.warehouseName} 정상 입고`} type="number" min={0} max={allocation.remainingQuantity} value={draft.quantity} onChange={(event) => setReceiptDrafts((current) => ({ ...current, [allocation.id]: { ...draft, quantity: Number(event.target.value) } }))} className={cx(ui.controlSm, 'text-right')} /></label>
                            <label><span className={ui.label}>초과</span><input aria-label={`${allocation.warehouseName} 초과 입고`} type="number" min={0} value={draft.overageQuantity} onChange={(event) => setReceiptDrafts((current) => ({ ...current, [allocation.id]: { ...draft, overageQuantity: Number(event.target.value) } }))} className={cx(ui.controlSm, 'text-right')} /></label>
                            <label><span className={ui.label}>초과 사유</span><input aria-label={`${allocation.warehouseName} 초과 사유`} value={draft.overageReason} onChange={(event) => setReceiptDrafts((current) => ({ ...current, [allocation.id]: { ...draft, overageReason: event.target.value } }))} className={ui.controlSm} placeholder="공장 오발송 등" /></label>
                            {allocation.remainingQuantity > 0 ? <div className="md:col-span-4 flex items-end gap-2"><label className="w-24"><span className={ui.label}>부족 수량</span><input aria-label={`${allocation.warehouseName} 부족 수량`} type="number" min={1} max={allocation.remainingQuantity} value={shortage.quantity} onChange={(event) => setShortageDrafts((current) => ({ ...current, [allocation.id]: { ...shortage, quantity: Number(event.target.value) } }))} className={cx(ui.controlSm, 'text-right')} /></label><label className="min-w-0 flex-1"><span className={ui.label}>부족 사유</span><input aria-label={`${allocation.warehouseName} 부족 사유`} value={shortage.reason} onChange={(event) => setShortageDrafts((current) => ({ ...current, [allocation.id]: { ...shortage, reason: event.target.value } }))} className={ui.controlSm} /></label><button type="button" className={ui.buttonSecondary} onClick={() => closeShortage(allocation.id)} disabled={isPending}>부족 종료</button></div> : null}
                          </div>
                        )})}
                      </div>
                    ))}
                    <div className="flex items-end justify-between gap-3 border-t border-[color:var(--border)] pt-3"><div><label><span className={ui.label}>입고 업무일</span><input aria-label={`입고 #${arrival.id} 업무일`} type="date" value={receiptBusinessDates[arrival.id] ?? koreaLocalDate()} onChange={(event) => setReceiptBusinessDates((current) => ({ ...current, [arrival.id]: event.target.value }))} className={ui.controlSm} /></label><p className="mt-1 text-sm text-[color:var(--muted)]">정상 {arrival.items.flatMap((item) => item.allocations).reduce((sum, allocation) => sum + (receiptDrafts[allocation.id]?.quantity ?? 0), 0)} · 초과 {arrival.items.flatMap((item) => item.allocations).reduce((sum, allocation) => sum + (receiptDrafts[allocation.id]?.overageQuantity ?? 0), 0)} · 반영 후 예정 {Math.max(arrival.remainingQuantity - arrival.items.flatMap((item) => item.allocations).reduce((sum, allocation) => sum + (receiptDrafts[allocation.id]?.quantity ?? 0), 0), 0)}</p></div><button type="button" onClick={() => submitReceive(arrival)} disabled={schemaState.status === 'missing' || isPending || arrival.remainingQuantity === 0} className={ui.buttonPrimary}>입고 반영</button></div>
                    {arrival.shortageClosures.length > 0 ? <div className="space-y-2 border-t border-[color:var(--border)] pt-3"><p className="text-sm font-semibold text-[color:var(--foreground)]">종료한 부족 · 후속 입고</p>{arrival.shortageClosures.map((closure) => { const draft = followUpDrafts[closure.id] ?? { warehouseId: warehouses[0]?.id ?? 0, quantity: 0, reason: '', receiptBusinessDate: koreaLocalDate() }; return <div key={closure.id} className="grid gap-2 md:grid-cols-[minmax(8rem,1fr)_10rem_7rem_9rem_minmax(10rem,1fr)_auto] md:items-end"><p className="text-sm text-[color:var(--muted)]">{closure.quantity}개 · {closure.reason}</p><SelectField label="후속 창고" value={draft.warehouseId} placeholder="창고" options={warehouses.map((warehouse) => ({ value: warehouse.id, label: warehouse.name }))} onValueChange={(value) => setFollowUpDrafts((current) => ({ ...current, [closure.id]: { ...draft, warehouseId: Number(value ?? 0) } }))} /><label><span className={ui.label}>수량</span><input aria-label={`부족 #${closure.id} 후속 수량`} type="number" min={1} value={draft.quantity} onChange={(event) => setFollowUpDrafts((current) => ({ ...current, [closure.id]: { ...draft, quantity: Number(event.target.value) } }))} className={cx(ui.controlSm, 'text-right')} /></label><label><span className={ui.label}>업무일</span><input aria-label={`부족 #${closure.id} 후속 업무일`} type="date" value={draft.receiptBusinessDate} onChange={(event) => setFollowUpDrafts((current) => ({ ...current, [closure.id]: { ...draft, receiptBusinessDate: event.target.value } }))} className={ui.controlSm} /></label><label><span className={ui.label}>사유</span><input aria-label={`부족 #${closure.id} 후속 사유`} value={draft.reason} onChange={(event) => setFollowUpDrafts((current) => ({ ...current, [closure.id]: { ...draft, reason: event.target.value } }))} className={ui.controlSm} /></label><button type="button" className={ui.buttonSecondary} onClick={() => recordFollowUp(closure.id)} disabled={isPending}>후속 입고</button></div> })}</div> : null}
                    {arrival.receiptLines.length > 0 ? <div className="space-y-2 border-t border-[color:var(--border)] pt-3"><p className="text-sm font-semibold text-[color:var(--foreground)]">입고 기록</p>{arrival.receiptLines.map((line) => <div key={line.id} className="flex flex-col gap-2 sm:flex-row sm:items-end"><p className="min-w-0 flex-1 text-sm text-[color:var(--muted)]">{line.businessDate} · 정상 {line.normalQuantity} · 초과 {line.overageQuantity}{line.corrected ? ' · 정정 완료' : ''}</p>{!line.corrected ? <><label className="min-w-0 flex-1"><span className={ui.label}>정정 사유</span><input aria-label={`입고 기록 #${line.id} 정정 사유`} value={correctionReasons[line.id] ?? ''} onChange={(event) => setCorrectionReasons((current) => ({ ...current, [line.id]: event.target.value }))} className={ui.controlSm} /></label><button type="button" className={ui.buttonSecondary} onClick={() => reverseLine(line.id)} disabled={isPending}>전체 반전</button></> : null}</div>)}</div> : null}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </section>

      <FixedSheet open={manualOpen} title="수동 입고 예정 추가" description="엑셀 없이 확인된 예정 수량을 직접 등록합니다." onOpenChange={setManualOpen}>
        <section className="space-y-4">
          <div className="grid gap-3 md:grid-cols-2">
            <div>
              <SelectField
                label="공장"
                value={factoryId}
                placeholder={factoryOptions.length > 0 ? '공장 선택' : '등록된 공장이 없습니다'}
                options={factoryOptions.map((factory) => ({ value: factory.id, label: factory.name }))}
                onValueChange={(next) => setFactoryId(next === null ? null : Number(next))}
                disabled={factoryOptions.length === 0}
              />
            </div>
            <div>
              <label className={ui.label}>예정 입고일</label>
              <input type="date" value={expectedDate} onChange={(event) => setExpectedDate(event.target.value)} className={ui.controlSm} />
            </div>
            <div>
              <SelectField
                label="입고 예정 창고"
                value={arrivalWarehouseId}
                placeholder={warehouses.length > 0 ? '창고 선택' : '등록된 창고가 없습니다'}
                options={warehouses.map((warehouse) => ({ value: warehouse.id, label: warehouse.name }))}
                onValueChange={(next) => setArrivalWarehouseId(next === null ? null : Number(next))}
                disabled={warehouses.length === 0}
              />
            </div>
            <div className="md:col-span-2">
              <label className={ui.label}>메모</label>
              <textarea value={memo} onChange={(event) => setMemo(event.target.value)} className={cx(ui.control, 'min-h-24 resize-y')} />
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-[color:var(--foreground)]">등록 항목</h2>
              <button type="button" onClick={() => setRows((current) => [...current, createRow()])} className={ui.buttonSecondary}>
                행 추가
              </button>
            </div>

            <div className="space-y-3">
              {normalizedRows.map((row, index) => (
                <Card key={row.key} variant="default" className={cx('overflow-hidden', row.error && 'border-[color:var(--hue-warning)]')}>
                  <CardContent className="space-y-3 px-3 py-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-semibold text-[color:var(--muted)]">항목 #{index + 1}</span>
                      <button
                        type="button"
                        onClick={() =>
                          setRows((current) => {
                            const next = current.filter((item) => item.key !== row.key)
                            return next.length === 0 ? [createRow()] : next
                          })
                        }
                        className="text-sm text-[color:var(--muted-foreground)] hover:text-[color:var(--foreground)]"
                      >
                        삭제
                      </button>
                    </div>

                    <div className="grid gap-3 md:grid-cols-[minmax(0,1.2fr)_minmax(0,0.9fr)_minmax(0,0.9fr)_8rem]">
                      <div className="md:col-span-3">
                        <label className={ui.label}>항목 #{index + 1} 상품 옵션</label>
                        <ProductVariantCombobox
                          aria-label={`항목 #${index + 1} 상품 옵션`}
                          variants={arrivalProductVariants}
                          value={row.modelId === '' || row.sizeId === '' || row.colorId === '' ? null : `${row.modelId}:${row.sizeId}:${row.colorId}`}
                          onValueChange={(next) => {
                            const variant = arrivalProductVariants.find((item) => item.id === next)
                            setRows((current) => current.map((item) => item.key === row.key ? {
                              ...item,
                              modelId: variant?.modelId ?? '', sizeId: variant?.sizeId ?? '', colorId: variant?.colorId ?? '', error: null,
                            } : item))
                          }}
                        />
                      </div>

                      <input
                        type="number"
                        min={1}
                        value={row.orderedQuantity}
                        onChange={(event) =>
                          setRows((current) =>
                            current.map((item) =>
                              item.key === row.key
                                ? { ...item, orderedQuantity: event.target.value ? Number(event.target.value) : '', error: null }
                                : item,
                            ),
                          )
                        }
                        placeholder="수량"
                        className={cx(ui.controlSm, 'text-right')}
                      />
                    </div>

                    {row.error ? <p className="text-xs font-medium text-[color:var(--warning-foreground)]">{row.error}</p> : null}
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          <Card variant="default" className="overflow-hidden">
            <CardContent className="flex flex-col gap-3 px-4 py-3 md:flex-row md:items-center md:justify-between">
              <div className="text-sm text-[color:var(--muted)]">
                유효 항목 <span className="font-semibold text-[color:var(--foreground)]">{normalizedRows.filter((row) => row.valid).length}</span>건
              </div>
                <button
                  type="button"
                  onClick={submitRows}
                  disabled={schemaState.status === 'missing' || isPending || normalizedRows.filter((row) => row.valid).length === 0}
                  className={ui.buttonPrimary}
                >
                  예정 입고 등록
              </button>
            </CardContent>
          </Card>
        </section>
      </FixedSheet>
      <FixedSheet open={importOpen} title="입고 엑셀 가져오기" description="파일 검토와 SKU 연결을 저장한 뒤 두 번째 단계에서 기본 창고를 선택합니다." onOpenChange={setImportOpen}>
        <InboundRegistrationSheet suppliers={factories.map((factory) => ({ id: factory.id, name: factory.name }))} warehouses={warehouses} templates={inboundTemplates} productVariants={productVariants} returnTo="/sourcing/arrivals" onSaved={() => { setImportOpen(false); router.refresh() }} />
      </FixedSheet>
    </div>
  )
}

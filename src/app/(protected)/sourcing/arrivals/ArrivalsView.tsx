'use client'

import { useEffect, useMemo, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { createFactoryArrivalBatch, receiveFactoryArrival } from '@/lib/actions'
import { StatusBadge } from '@/components/ui/badge-1'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
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
  items: Array<{
    id: number
    modelName: string
    sizeName: string
    colorName: string
    colorRgb: string
    orderedQuantity: number
    receivedQuantity: number
    remainingQuantity: number
  }>
}

type ReceiveDraft = {
  warehouseId: number
  quantities: Record<number, number>
}

type SelectOption<Value extends string | number> = {
  value: Value
  label: string
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

function parseDelimitedText(text: string) {
  return text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => line.split(line.includes('\t') ? '\t' : ',').map((cell) => cell.trim()))
}

function buildReceiveDrafts(arrivals: ArrivalRecord[], warehouses: WarehouseLookup[]) {
  const defaultWarehouseId = warehouses[0]?.id ?? 0

  return arrivals.reduce<Record<number, ReceiveDraft>>((drafts, arrival) => {
    drafts[arrival.id] = {
      warehouseId: defaultWarehouseId,
      quantities: arrival.items.reduce<Record<number, number>>((items, item) => {
        items[item.id] = item.remainingQuantity
        return items
      }, {}),
    }
    return drafts
  }, {})
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
  factories,
  warehouses,
  models,
  arrivals,
}: {
  factories: FactoryLookup[]
  warehouses: WarehouseLookup[]
  models: ModelLookup[]
  arrivals: ArrivalRecord[]
}) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [entryMode, setEntryMode] = useState<'manual' | 'csv'>('manual')
  const [message, setMessage] = useState<string | null>(null)
  const [factoryId, setFactoryId] = useState<number | null>(factories.find((factory) => factory.isActive)?.id ?? factories[0]?.id ?? null)
  const [expectedDate, setExpectedDate] = useState(new Date().toISOString().slice(0, 10))
  const [memo, setMemo] = useState('')
  const [rows, setRows] = useState<ArrivalRow[]>([createRow(), createRow()])
  const [csvText, setCsvText] = useState('')
  const [receiveDrafts, setReceiveDrafts] = useState<Record<number, ReceiveDraft>>(() => buildReceiveDrafts(arrivals, warehouses))

  const activeFactories = factories.filter((factory) => factory.isActive)
  const factoryOptions = activeFactories.length > 0 ? activeFactories : factories

  useEffect(() => {
    setReceiveDrafts(buildReceiveDrafts(arrivals, warehouses))
  }, [arrivals, warehouses])

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

  const importCsvRows = () => {
    const nextRows = parseDelimitedText(csvText).map((cells) => {
      const [modelName = '', sizeName = '', colorName = '', quantityText = ''] = cells
      const isHeader =
        (modelName.toLowerCase() === '모델' || modelName.toLowerCase() === 'model') &&
        (sizeName.toLowerCase() === '사이즈' || sizeName.toLowerCase() === 'size')

      if (isHeader) return null

      const model = models.find((entry) => entry.name === modelName)
      const size = model?.sizes.find((entry) => entry.name === sizeName)
      const color = model?.colors.find((entry) => entry.name === colorName)
      const orderedQuantity = Number(quantityText)

      const issues: string[] = []
      if (!model) issues.push(`모델 "${modelName}"`)
      if (!size) issues.push(`사이즈 "${sizeName}"`)
      if (!color) issues.push(`색상 "${colorName}"`)
      if (!Number.isFinite(orderedQuantity) || orderedQuantity <= 0) issues.push(`수량 "${quantityText}"`)

      return {
        key: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        modelId: model?.id ?? '',
        sizeId: size?.id ?? '',
        colorId: color?.id ?? '',
        orderedQuantity: Number.isFinite(orderedQuantity) && orderedQuantity > 0 ? orderedQuantity : '',
        error: issues.length > 0 ? issues.join(', ') : null,
      } satisfies ArrivalRow
    })

    const filtered = nextRows.filter((row): row is ArrivalRow => row !== null)
    if (filtered.length === 0) {
      setMessage('가져올 CSV 행이 없습니다.')
      return
    }

    setRows(filtered)
    setMessage(`${filtered.length}개 행을 가져왔습니다.`)
    setCsvText('')
  }

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

    startTransition(async () => {
      try {
        await createFactoryArrivalBatch({
          factoryId: selectedFactoryId,
          expectedDate,
          memo,
          sourceChannel: entryMode,
          items: validRows,
        })
        setRows([createRow(), createRow()])
        setMemo('')
        setCsvText('')
        setMessage(`${validRows.length}개 예정 입고 항목을 등록했습니다.`)
        router.refresh()
      } catch (error) {
        setMessage(error instanceof Error ? error.message : '예정 입고 등록에 실패했습니다.')
      }
    })
  }

  const updateReceiveDraft = (arrivalId: number, updater: (draft: ReceiveDraft) => ReceiveDraft) => {
    setReceiveDrafts((current) => {
      const fallback = buildReceiveDrafts(arrivals, warehouses)[arrivalId]
      const draft = current[arrivalId] ?? fallback
      return {
        ...current,
        [arrivalId]: updater(draft),
      }
    })
  }

  const submitReceive = (arrival: ArrivalRecord) => {
    const draft = receiveDrafts[arrival.id] ?? buildReceiveDrafts([arrival], warehouses)[arrival.id]
    const items = arrival.items
      .map((item) => {
        const quantity = draft.quantities[item.id] ?? item.remainingQuantity
        return {
          arrivalItemId: item.id,
          quantity,
          remainingQuantity: item.remainingQuantity,
        }
      })
      .filter((item) => item.quantity > 0)

    if (!draft.warehouseId) {
      setMessage('입고할 창고를 선택해주세요.')
      return
    }

    if (items.length === 0) {
      setMessage('입고 수량을 입력해주세요.')
      return
    }

    if (items.some((item) => item.quantity > item.remainingQuantity)) {
      setMessage('입고 수량은 잔여 수량 이하여야 합니다.')
      return
    }

    startTransition(async () => {
      try {
        await receiveFactoryArrival({
          arrivalId: arrival.id,
          warehouseId: draft.warehouseId,
          items: items.map(({ arrivalItemId, quantity }) => ({ arrivalItemId, quantity })),
        })
        setMessage('입고 반영이 완료되었습니다.')
        router.refresh()
      } catch (error) {
        setMessage(error instanceof Error ? error.message : '입고 반영에 실패했습니다.')
      }
    })
  }

  return (
    <div className={ui.shell}>
      <PageHeader
        title="입고 예정"
        description="공장 예정 입고를 수동 또는 CSV로 등록하고 잔여 수량만 반영합니다."
      />

      {message ? (
        <Card variant="muted" className="mb-4 overflow-hidden">
          <CardContent className="px-4 py-3 text-sm text-slate-700">{message}</CardContent>
        </Card>
      ) : null}

      <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
        <section className="space-y-4">
          <div className="flex items-center gap-2">
            <button type="button" onClick={() => setEntryMode('manual')} className={entryMode === 'manual' ? ui.tabActive : ui.tab}>
              수동 등록
            </button>
            <button type="button" onClick={() => setEntryMode('csv')} className={entryMode === 'csv' ? ui.tabActive : ui.tab}>
              CSV 등록
            </button>
          </div>

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
            <div className="md:col-span-2">
              <label className={ui.label}>메모</label>
              <textarea value={memo} onChange={(event) => setMemo(event.target.value)} className={cx(ui.control, 'min-h-24 resize-y')} />
            </div>
          </div>

          {entryMode === 'csv' ? (
            <Card variant="default" className="overflow-hidden">
              <CardHeader className="px-4 py-3">
                <CardTitle className="text-sm">CSV 붙여넣기</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 px-4 py-4">
                <textarea
                  id="arrival-csv"
                  value={csvText}
                  onChange={(event) => setCsvText(event.target.value)}
                  placeholder={'모델,사이즈,색상,수량\nLP01,S,네이비,24'}
                  className={cx(ui.control, 'min-h-28 resize-y font-mono text-sm')}
                />
                <button type="button" onClick={importCsvRows} className={ui.buttonSecondary} disabled={csvText.trim().length === 0}>
                  CSV 행 가져오기
                </button>
              </CardContent>
            </Card>
          ) : null}

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-slate-900">등록 항목</h2>
              <button type="button" onClick={() => setRows((current) => [...current, createRow()])} className={ui.buttonSecondary}>
                행 추가
              </button>
            </div>

            <div className="space-y-3">
              {normalizedRows.map((row, index) => (
                <Card key={row.key} variant="default" className={cx('overflow-hidden', row.error && 'border-amber-200')}>
                  <CardContent className="space-y-3 px-3 py-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-semibold text-slate-700">항목 #{index + 1}</span>
                      <button
                        type="button"
                        onClick={() =>
                          setRows((current) => {
                            const next = current.filter((item) => item.key !== row.key)
                            return next.length === 0 ? [createRow()] : next
                          })
                        }
                        className="text-sm text-slate-400 hover:text-slate-950"
                      >
                        삭제
                      </button>
                    </div>

                    <div className="grid gap-3 md:grid-cols-[minmax(0,1.2fr)_minmax(0,0.9fr)_minmax(0,0.9fr)_8rem]">
                      <SelectField
                        label={`항목 #${index + 1} 모델`}
                        value={row.modelId === '' ? null : row.modelId}
                        placeholder="모델 선택"
                        options={models.map((model) => ({ value: model.id, label: model.name }))}
                        onValueChange={(next) =>
                          setRows((current) =>
                            current.map((item) =>
                              item.key === row.key
                                ? {
                                    ...item,
                                    modelId: next === null ? '' : Number(next),
                                    sizeId: '',
                                    colorId: '',
                                    error: null,
                                  }
                                : item,
                            ),
                          )
                        }
                      />

                      <SelectField
                        label={`항목 #${index + 1} 사이즈`}
                        value={row.sizeId === '' ? null : row.sizeId}
                        placeholder="사이즈"
                        options={(row.model?.sizes ?? []).map((size) => ({ value: size.id, label: size.name }))}
                        onValueChange={(next) =>
                          setRows((current) =>
                            current.map((item) =>
                              item.key === row.key ? { ...item, sizeId: next === null ? '' : Number(next), error: null } : item,
                            ),
                          )
                        }
                        disabled={!row.model}
                      />

                      <SelectField
                        label={`항목 #${index + 1} 색상`}
                        value={row.colorId === '' ? null : row.colorId}
                        placeholder="색상"
                        options={(row.model?.colors ?? []).map((color) => ({ value: color.id, label: color.name }))}
                        onValueChange={(next) =>
                          setRows((current) =>
                            current.map((item) =>
                              item.key === row.key ? { ...item, colorId: next === null ? '' : Number(next), error: null } : item,
                            ),
                          )
                        }
                        disabled={!row.model}
                      />

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

                    {row.error ? <p className="text-xs font-medium text-amber-700">{row.error}</p> : null}
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          <Card variant="default" className="overflow-hidden">
            <CardContent className="flex flex-col gap-3 px-4 py-3 md:flex-row md:items-center md:justify-between">
              <div className="text-sm text-slate-600">
                유효 항목 <span className="font-semibold text-slate-950">{normalizedRows.filter((row) => row.valid).length}</span>건
              </div>
              <button
                type="button"
                onClick={submitRows}
                disabled={isPending || normalizedRows.filter((row) => row.valid).length === 0}
                className={ui.buttonPrimary}
              >
                예정 입고 등록
              </button>
            </CardContent>
          </Card>
        </section>

        <section className="space-y-3">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-semibold tracking-tight text-slate-950">예정 목록</h2>
            </div>
            <span className={ui.pill}>총 {arrivals.length}건</span>
          </div>

          <div className={ui.tableShell}>
            <div className="divide-y divide-slate-100">
              {arrivals.length === 0 ? (
                <div className={ui.emptyState}>등록된 예정 입고가 없습니다.</div>
              ) : (
                arrivals.map((arrival) => (
                  <div key={arrival.id} className="space-y-4 px-4 py-4 md:px-5">
                    <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="text-base font-semibold text-slate-950">{arrival.factoryName}</h3>
                          <StatusBadge
                            tone={
                              arrival.status === '예정'
                                ? 'info'
                                : arrival.status === '부분입고'
                                  ? 'warning'
                                  : arrival.status === '입고완료'
                                    ? 'success'
                                    : 'neutral'
                            }
                            className="px-2.5 py-1"
                          >
                            {arrival.status}
                          </StatusBadge>
                        </div>
                        <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-slate-500">
                          <span>{arrival.expectedDate}</span>
                          <StatusBadge tone={arrival.sourceChannel === 'csv' ? 'info' : 'neutral'} className="px-2.5 py-1">
                            {arrival.sourceChannel === 'csv' ? 'CSV 등록' : '수동 등록'}
                          </StatusBadge>
                        </div>
                        {arrival.memo ? <p className="mt-2 text-sm text-slate-600">{arrival.memo}</p> : null}
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <span className={ui.pillMuted}>총 수량 {arrival.totalOrderedQuantity}개</span>
                        <span className={ui.pillMuted}>잔여 수량 {arrival.remainingQuantity}개</span>
                      </div>
                    </div>

                    <div className="space-y-3 border-t border-[color:var(--border)] pt-4">
                      <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
                        <div>
                          <p className="text-sm font-semibold text-slate-950">입고 반영</p>
                          <p className="mt-1 text-sm text-slate-500">창고를 선택하고 항목별 수량을 조정한 뒤 한 번에 반영합니다.</p>
                        </div>
                        <div className="min-w-0 md:w-64">
                          <SelectField
                            label="입고 창고"
                            value={receiveDrafts[arrival.id]?.warehouseId ?? warehouses[0]?.id ?? null}
                            placeholder={warehouses.length === 0 ? '등록된 창고가 없습니다' : '창고 선택'}
                            options={
                              warehouses.length === 0
                                ? [{ value: 0, label: '등록된 창고가 없습니다' }]
                                : warehouses.map((warehouse) => ({ value: warehouse.id, label: warehouse.name }))
                            }
                            onValueChange={(next) =>
                              updateReceiveDraft(arrival.id, (draft) => ({
                                ...draft,
                                warehouseId: next === null ? 0 : Number(next),
                              }))
                            }
                            disabled={warehouses.length === 0}
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        {arrival.items.map((item) => {
                          const quantity = receiveDrafts[arrival.id]?.quantities[item.id] ?? item.remainingQuantity

                          return (
                            <div
                              key={item.id}
                              className="grid gap-3 border-t border-[color:var(--border)] pt-3 first:border-t-0 first:pt-0 md:grid-cols-[minmax(0,1fr)_9rem] md:items-end"
                            >
                              <div className="space-y-1">
                                <div className="flex items-center justify-between gap-3">
                                  <div>
                                    <p className="text-sm font-semibold text-slate-950">{item.modelName}</p>
                                    <p className="mt-1 text-sm text-slate-500">
                                      {item.colorName} / {item.sizeName}
                                    </p>
                                  </div>
                                  <span className={cx(ui.pillMuted, 'shrink-0')}>잔여 {item.remainingQuantity}</span>
                                </div>
                                <p className="text-xs text-slate-500">
                                  주문 {item.orderedQuantity} · 받은 {item.receivedQuantity}
                                </p>
                              </div>

                              <div>
                                <label htmlFor={`arrival-quantity-${arrival.id}-${item.id}`} className={ui.label}>
                                  입고 수량
                                </label>
                                <input
                                  id={`arrival-quantity-${arrival.id}-${item.id}`}
                                  type="number"
                                  min={0}
                                  max={item.remainingQuantity}
                                  value={quantity}
                                  onChange={(event) =>
                                    updateReceiveDraft(arrival.id, (draft) => ({
                                      ...draft,
                                      quantities: {
                                        ...draft.quantities,
                                        [item.id]: event.target.value ? Number(event.target.value) : 0,
                                      },
                                    }))
                                  }
                                  className={cx(ui.controlSm, 'text-right')}
                                  disabled={item.remainingQuantity === 0}
                                />
                              </div>
                            </div>
                          )
                        })}
                      </div>

                      <div className="flex flex-col gap-3 border-t border-[color:var(--border)] pt-3 md:flex-row md:items-center md:justify-between">
                        <div className="text-sm text-slate-600">
                          선택된 창고로{' '}
                          <span className="font-semibold text-slate-950">
                            {arrival.items.reduce((sum, item) => sum + (receiveDrafts[arrival.id]?.quantities[item.id] ?? item.remainingQuantity), 0)}
                          </span>
                          건을 반영합니다.
                        </div>
                        <button
                          type="button"
                          onClick={() => submitReceive(arrival)}
                          disabled={isPending || warehouses.length === 0 || arrival.remainingQuantity === 0}
                          className={ui.buttonPrimary}
                        >
                          입고 반영
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}

'use client'

import { useEffect, useMemo, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { createFactoryArrivalBatch, receiveFactoryArrival } from '@/lib/actions'
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
  const [factoryId, setFactoryId] = useState<number>(factories.find((factory) => factory.isActive)?.id ?? factories[0]?.id ?? 0)
  const [expectedDate, setExpectedDate] = useState(new Date().toISOString().slice(0, 10))
  const [memo, setMemo] = useState('')
  const [rows, setRows] = useState<ArrivalRow[]>([createRow(), createRow()])
  const [csvText, setCsvText] = useState('')
  const [receiveDrafts, setReceiveDrafts] = useState<Record<number, ReceiveDraft>>(() => buildReceiveDrafts(arrivals, warehouses))

  const activeFactories = factories.filter((factory) => factory.isActive)

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
    const validRows = normalizedRows
      .filter((row) => row.valid)
      .map((row) => ({
        modelId: row.modelId as number,
        sizeId: row.sizeId as number,
        colorId: row.colorId as number,
        orderedQuantity: row.orderedQuantity as number,
      }))

    startTransition(async () => {
      try {
        await createFactoryArrivalBatch({
          factoryId,
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
        kicker="Sourcing"
        title="입고 예정"
        description="실제 재고와 분리된 staging 목록에서 공장발 예정 입고를 관리합니다."
      />

      {message ? (
        <div className="mb-4 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
          {message}
        </div>
      ) : null}

      <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
        <section className={cx(ui.panel, ui.panelBody, 'space-y-4 md:p-5')}>
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
              <label className={ui.label}>공장</label>
              <select value={factoryId} onChange={(event) => setFactoryId(Number(event.target.value))} className={ui.controlSm}>
                {activeFactories.map((factory) => (
                  <option key={factory.id} value={factory.id}>
                    {factory.name}
                  </option>
                ))}
              </select>
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
            <div className="space-y-3 rounded-2xl border border-dashed border-slate-300 bg-slate-50/80 p-4">
              <label htmlFor="arrival-csv" className="text-sm font-medium text-slate-700">
                CSV/표 붙여넣기
              </label>
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
            </div>
          ) : null}

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-slate-900">입고 예정 항목</h2>
              <button type="button" onClick={() => setRows((current) => [...current, createRow()])} className={ui.buttonSecondary}>
                행 추가
              </button>
            </div>

            <div className="space-y-3">
              {normalizedRows.map((row, index) => (
                <div key={row.key} className={cx('surface space-y-3 p-4', row.error && 'border-amber-200 bg-amber-50/70')}>
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
                    <select
                      value={row.modelId}
                      onChange={(event) =>
                        setRows((current) =>
                          current.map((item) =>
                            item.key === row.key
                              ? { ...item, modelId: Number(event.target.value), sizeId: '', colorId: '', error: null }
                              : item,
                          ),
                        )
                      }
                      className={ui.controlSm}
                    >
                      <option value="">모델 선택</option>
                      {models.map((model) => (
                        <option key={model.id} value={model.id}>
                          {model.name}
                        </option>
                      ))}
                    </select>

                    <select
                      value={row.sizeId}
                      onChange={(event) =>
                        setRows((current) =>
                          current.map((item) =>
                            item.key === row.key ? { ...item, sizeId: Number(event.target.value), error: null } : item,
                          ),
                        )
                      }
                      disabled={!row.model}
                      className={ui.controlSm}
                    >
                      <option value="">사이즈</option>
                      {(row.model?.sizes ?? []).map((size) => (
                        <option key={size.id} value={size.id}>
                          {size.name}
                        </option>
                      ))}
                    </select>

                    <select
                      value={row.colorId}
                      onChange={(event) =>
                        setRows((current) =>
                          current.map((item) =>
                            item.key === row.key ? { ...item, colorId: Number(event.target.value), error: null } : item,
                          ),
                        )
                      }
                      disabled={!row.model}
                      className={ui.controlSm}
                    >
                      <option value="">색상</option>
                      {(row.model?.colors ?? []).map((color) => (
                        <option key={color.id} value={color.id}>
                          {color.name}
                        </option>
                      ))}
                    </select>

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
                </div>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
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
          </div>
        </section>

        <section className={cx(ui.panel, 'overflow-hidden')}>
          <div className={ui.panelHeader}>
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold tracking-tight text-slate-950">예정 목록</h2>
                <p className="mt-1 text-sm text-slate-500">실제 입고 반영 전 staging 상태를 유지합니다.</p>
              </div>
              <span className={ui.pill}>총 {arrivals.length}건</span>
            </div>
          </div>

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
                        <span className={cx('inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold',
                          arrival.status === '예정'
                            ? 'border-blue-200 bg-blue-50 text-blue-700'
                            : arrival.status === '부분입고'
                              ? 'border-amber-200 bg-amber-50 text-amber-700'
                              : arrival.status === '입고완료'
                                ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                                : 'border-slate-200 bg-slate-100 text-slate-600')}>
                          {arrival.status}
                        </span>
                      </div>
                      <p className="mt-1 text-sm text-slate-500">
                        {arrival.expectedDate} · {arrival.sourceChannel === 'csv' ? 'CSV 등록' : '수동 등록'}
                      </p>
                      {arrival.memo ? <p className="mt-2 text-sm text-slate-600">{arrival.memo}</p> : null}
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3">
                        <p className="text-xs text-slate-500">총 수량</p>
                        <p className="mt-1 font-semibold text-slate-950">{arrival.totalOrderedQuantity}개</p>
                      </div>
                      <div className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3">
                        <p className="text-xs text-slate-500">잔여 수량</p>
                        <p className="mt-1 font-semibold text-slate-950">{arrival.remainingQuantity}개</p>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-3 rounded-2xl border border-slate-200 bg-slate-50 p-3 md:p-4">
                    <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
                      <div>
                        <p className="text-sm font-semibold text-slate-950">입고 반영</p>
                        <p className="mt-1 text-sm text-slate-500">창고를 선택하고 항목별 수량을 조정한 뒤 한 번에 반영합니다.</p>
                      </div>
                      <div className="min-w-0 md:w-64">
                        <label htmlFor={`arrival-warehouse-${arrival.id}`} className={ui.label}>
                          입고 창고
                        </label>
                        <select
                          id={`arrival-warehouse-${arrival.id}`}
                          value={receiveDrafts[arrival.id]?.warehouseId ?? warehouses[0]?.id ?? 0}
                          onChange={(event) =>
                            updateReceiveDraft(arrival.id, (draft) => ({
                              ...draft,
                              warehouseId: Number(event.target.value),
                            }))
                          }
                          className={ui.controlSm}
                          disabled={warehouses.length === 0}
                        >
                          {warehouses.length === 0 ? (
                            <option value={0}>등록된 창고가 없습니다</option>
                          ) : (
                            warehouses.map((warehouse) => (
                              <option key={warehouse.id} value={warehouse.id}>
                                {warehouse.name}
                              </option>
                            ))
                          )}
                        </select>
                      </div>
                    </div>

                    <div className="space-y-2">
                      {arrival.items.map((item) => {
                        const quantity = receiveDrafts[arrival.id]?.quantities[item.id] ?? item.remainingQuantity

                        return (
                          <div
                            key={item.id}
                            className="grid gap-3 rounded-2xl border border-slate-200 bg-white px-3 py-3 md:grid-cols-[minmax(0,1fr)_9rem] md:items-end"
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

                    <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3 md:flex-row md:items-center md:justify-between">
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
        </section>
      </div>
    </div>
  )
}

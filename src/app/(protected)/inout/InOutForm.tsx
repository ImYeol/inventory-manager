'use client'

import Link from 'next/link'
import { useCallback, useMemo, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { createTransactions, getCurrentStock } from '@/lib/actions'
import { cx, ui } from '../../components/ui'

type SizeType = { id: number; name: string; sortOrder: number; modelId: number }
type ColorType = {
  id: number
  name: string
  rgbCode: string
  textWhite: boolean
  sortOrder: number
  modelId: number
}

type ModelType = {
  id: number
  name: string
  sizes: SizeType[]
  colors: ColorType[]
}

type WarehouseLookup = {
  id: number
  name: string
}

type RowData = {
  key: string
  modelId: number | ''
  sizeId: number | ''
  colorId: number | ''
  quantity: number | ''
  currentStock: number | null
  stockLoading: boolean
}

const INITIAL_ROW_COUNT = 8

function todayString() {
  const d = new Date()
  return d.toISOString().slice(0, 10)
}

function formatDateKR(dateStr: string) {
  const p = dateStr.split('-')
  if (p.length === 3) return `${p[0].slice(2)}.${p[1]}.${p[2]}`
  return dateStr
}

function emptyRow(): RowData {
  return {
    key: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    modelId: '',
    sizeId: '',
    colorId: '',
    quantity: '',
    currentStock: null,
    stockLoading: false,
  }
}

function getEffectiveModelId(rows: RowData[], idx: number): number | '' {
  for (let i = idx; i >= 0; i--) {
    if (rows[i].modelId !== '') return rows[i].modelId
  }
  return ''
}

function getEffectiveSizeId(rows: RowData[], idx: number, models: ModelType[]): number | '' {
  const effModelId = getEffectiveModelId(rows, idx)
  if (!effModelId) return ''
  const model = models.find((m) => m.id === effModelId)
  if (!model) return ''

  for (let i = idx; i >= 0; i--) {
    if (rows[i].sizeId !== '') {
      if (model.sizes.some((s) => s.id === rows[i].sizeId)) return rows[i].sizeId
      return ''
    }
    if (i < idx && rows[i].modelId !== '') break
  }

  return ''
}

export default function InOutForm({ models, warehouses }: { models: ModelType[]; warehouses: WarehouseLookup[] }) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  const [type, setType] = useState<'입고' | '출고'>('입고')
  const [date, setDate] = useState(todayString())
  const [warehouseId, setWarehouseId] = useState<number>(warehouses[0]?.id ?? -1)
  const [rows, setRows] = useState<RowData[]>(() => Array.from({ length: INITIAL_ROW_COUNT }, emptyRow))
  const [message, setMessage] = useState<{ text: string; error: boolean } | null>(null)

  const [overrides, setOverrides] = useState<Record<string, { model?: boolean; size?: boolean }>>({})

  const [overriddenWarehouseId, setOverriddenWarehouseId] = useState<number | null>(
    null,
  )
  const fallbackWarehouseId =
    warehouseId > 0 && warehouses.some((item) => item.id === warehouseId)
      ? warehouseId
      : (warehouses[0]?.id ?? -1)
  const selectedWarehouseId = overriddenWarehouseId ?? fallbackWarehouseId

  const modelMap = useMemo(() => {
    const map = new Map<number, ModelType>()
    for (const m of models) map.set(m.id, m)
    return map
  }, [models])

  const getModel = useCallback(
    (id: number | '') => (id === '' ? undefined : modelMap.get(id)),
    [modelMap],
  )

  const updateRow = useCallback(
    (key: string, patch: Partial<RowData>) =>
      setRows((prev) => prev.map((r) => (r.key === key ? { ...r, ...patch } : r))),
    [],
  )

  const fetchStock = useCallback(
    async (key: string, mId: number, sId: number, cId: number, selectedWarehouseId: number) => {
      updateRow(key, { stockLoading: true })
      try {
        const stock = await getCurrentStock(mId, sId, cId, selectedWarehouseId)
        updateRow(key, { currentStock: stock, stockLoading: false })
      } catch {
        updateRow(key, { currentStock: null, stockLoading: false })
      }
    },
    [updateRow],
  )

  const tryFetchStock = useCallback(
    (key: string, effModelId: number | '', effSizeId: number | '', colorId: number | '') => {
      if (!selectedWarehouseId || !effModelId || !effSizeId || !colorId) {
        updateRow(key, { currentStock: null })
        return
      }

      fetchStock(key, effModelId, effSizeId, colorId, selectedWarehouseId)
    },
    [fetchStock, selectedWarehouseId, updateRow],
  )

  const handleModelChange = useCallback(
    (key: string, val: string) => {
      const newModelId = val ? Number(val) : ('' as const)
      updateRow(key, { modelId: newModelId, sizeId: '', colorId: '', currentStock: null })
      setOverrides((prev) => ({ ...prev, [key]: { ...prev[key], model: false, size: false } }))
    },
    [updateRow],
  )

  const handleSizeChange = useCallback(
    (key: string, val: string, effModelId: number | '', colorId: number | '') => {
      const newSizeId = val ? Number(val) : ('' as const)
      updateRow(key, { sizeId: newSizeId, currentStock: null })
      tryFetchStock(key, effModelId, newSizeId || '', colorId)
    },
    [tryFetchStock, updateRow],
  )

  const handleColorChange = useCallback(
    (key: string, val: string, effModelId: number | '', effSizeId: number | '') => {
      const newColorId = val ? Number(val) : ('' as const)
      updateRow(key, { colorId: newColorId, currentStock: null })
      tryFetchStock(key, effModelId, effSizeId, newColorId)
    },
    [tryFetchStock, updateRow],
  )

  const addRows = (count: number = 5) => {
    setRows((prev) => [...prev, ...Array.from({ length: count }, emptyRow)])
  }

  const removeRow = (key: string) => {
    setRows((prev) => {
      const next = prev.filter((r) => r.key !== key)
      return next.length === 0 ? [emptyRow()] : next
    })
  }

  const clearAll = () => {
    setRows(Array.from({ length: INITIAL_ROW_COUNT }, emptyRow))
    setMessage(null)
  }

  const resolvedRows = useMemo(() => {
    return rows.map((r, idx) => {
      const effModelId = getEffectiveModelId(rows, idx)
      const effSizeId = getEffectiveSizeId(rows, idx, models)
      return { ...r, effModelId, effSizeId }
    })
  }, [rows, models])

  const filledRows = useMemo(() => {
    return resolvedRows.filter(
      (r) => r.effModelId && r.effSizeId && r.colorId && r.quantity && Number(r.quantity) > 0,
    )
  }, [resolvedRows])

  const submitAll = () => {
    if (filledRows.length === 0) {
      setMessage({ text: '입력된 항목이 없습니다.', error: true })
      return
    }

    if (!selectedWarehouseId) {
      setMessage({ text: '창고를 먼저 등록하고 선택해주세요.', error: true })
      return
    }

    startTransition(async () => {
      try {
        await createTransactions(
          filledRows.map((r) => ({
            type,
            date: formatDateKR(date),
            warehouseId: selectedWarehouseId,
            modelId: r.effModelId as number,
            sizeId: r.effSizeId as number,
            colorId: r.colorId as number,
            quantity: r.quantity as number,
          })),
        )
        setMessage({ text: `${filledRows.length}건이 성공적으로 등록되었습니다.`, error: false })
        setRows(Array.from({ length: INITIAL_ROW_COUNT }, emptyRow))
        router.refresh()
        setTimeout(() => setMessage(null), 4000)
      } catch {
        setMessage({ text: '등록 중 오류가 발생했습니다.', error: true })
      }
    })
  }

  function InheritedBadge({
    label,
    onOverride,
  }: {
    label: string
    onOverride: () => void
  }) {
    return (
      <button
        type="button"
        onClick={onOverride}
        className="group flex h-9 w-full items-center gap-1 rounded-lg border border-dashed border-slate-200 px-2 text-sm italic text-slate-400 transition-colors hover:border-slate-400 hover:bg-slate-50 hover:text-slate-600"
        title="클릭하여 직접 선택"
      >
        <span className="text-[10px] opacity-60 group-hover:opacity-100">↑</span>
        <span className="truncate">{label}</span>
      </button>
    )
  }

  function InheritedBadgeMobile({
    label,
  }: {
    label: string
  }) {
    return (
      <div className="flex h-12 items-center gap-1.5 rounded-lg border border-dashed border-slate-200 bg-slate-50 px-3 text-sm italic text-slate-400">
        <span className="text-[10px] opacity-60">↑</span>
        <span className="truncate">{label}</span>
      </div>
    )
  }

  const canInput = warehouses.length > 0 && selectedWarehouseId > 0

  return (
    <div className="space-y-4">
      {message && (
        <div
          className={`px-4 py-3 rounded-xl text-center font-medium text-sm border ${
            message.error
              ? 'bg-red-50 border-red-200 text-red-700'
              : 'bg-slate-50 border-slate-200 text-slate-700'
          }`}
          aria-live="polite"
        >
          {message.text}
        </div>
      )}

      <div className={cx(ui.panel, ui.panelBody, 'md:p-5')}>
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className={ui.label}>날짜</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className={ui.controlSm}
            />
          </div>

          <div>
            <label className={ui.label}>창고</label>
            {warehouses.length === 0 ? (
              <div className="flex gap-2 items-center h-11 px-3 py-2.5 rounded-lg border border-dashed border-slate-200 text-sm text-slate-500">
                창고가 없습니다.
                <Link href="/master-data" className="text-slate-700 underline underline-offset-2">
                  창고 등록하러 가기
                </Link>
              </div>
            ) : (
              <select
                value={selectedWarehouseId}
                onChange={(e) => {
                  const next = Number(e.target.value)
                  setWarehouseId(next)
                  setOverriddenWarehouseId(next)
                }}
                className={ui.controlSm}
              >
                {warehouses.map((warehouse) => (
                  <option key={warehouse.id} value={warehouse.id}>
                    {warehouse.name}
                  </option>
                ))}
              </select>
            )}
          </div>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-2.5">
          <button
            type="button"
            onClick={() => setType('입고')}
            className={cx(
              'h-11 rounded-xl text-[15px] font-semibold tracking-tight transition-colors',
              type === '입고' ? 'bg-slate-950 text-white' : 'bg-slate-100 text-slate-500 hover:bg-slate-200',
            )}
          >
            ▼ 입고
          </button>
          <button
            type="button"
            onClick={() => setType('출고')}
            className={cx(
              'h-11 rounded-xl text-[15px] font-semibold tracking-tight transition-colors',
              type === '출고' ? 'bg-slate-950 text-white' : 'bg-slate-100 text-slate-500 hover:bg-slate-200',
            )}
          >
            ▲ 출고
          </button>
        </div>

        {!canInput ? (
          <p className="mt-4 text-sm text-slate-500">입출고 등록은 창고 등록 후 이용할 수 있습니다.</p>
        ) : null}
      </div>

      <div className="flex items-center gap-2 px-1 text-xs text-slate-500">
        <span className="inline-flex items-center gap-0.5 rounded border border-dashed border-slate-300 px-1.5 py-0.5 text-[11px] italic text-slate-500">
          ↑ 상속
        </span>
        <span>= 비어있으면 위 행의 모델/사이즈를 자동 적용</span>
      </div>

      <div className={cx('hidden md:block', ui.tableShell)}>
        <div className="surface-header flex items-center justify-between px-4 py-3">
          <span className="text-sm font-semibold text-slate-700">
            일괄 입력
            {filledRows.length > 0 && (
              <span className="ml-2 text-slate-500">({filledRows.length}건 입력됨)</span>
            )}
          </span>
          <div className="flex gap-2">
            <button type="button" onClick={() => addRows(5)} className={ui.buttonSecondary + ' px-3 py-1.5 text-xs'}>
              + 5행 추가
            </button>
            <button type="button" onClick={clearAll} className={ui.buttonSecondary + ' px-3 py-1.5 text-xs text-slate-600'}>
              초기화
            </button>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="ui-table-head text-slate-500">
                <th className="w-8 px-2 py-2.5 text-center">#</th>
                <th className="px-2 py-2.5 text-left min-w-[150px]">모델</th>
                <th className="px-2 py-2.5 text-left min-w-[140px]">사이즈</th>
                <th className="px-2 py-2.5 text-left min-w-[130px]">색상</th>
                <th className="px-2 py-2.5 text-right w-[90px]">수량</th>
                <th className="px-2 py-2.5 text-right w-[70px]">재고</th>
                <th className="w-10 px-2 py-2.5"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.map((row, idx) => {
                const resolved = resolvedRows[idx]
                const effModelId = resolved.effModelId
                const effSizeId = resolved.effSizeId
                const effModel = getModel(effModelId)

                const isModelInherited = row.modelId === '' && effModelId !== ''
                const isSizeInherited = row.sizeId === '' && effSizeId !== ''
                const showModelDropdown = !isModelInherited || overrides[row.key]?.model
                const showSizeDropdown = !isSizeInherited || overrides[row.key]?.size

                const inheritedModelName = effModel?.name ?? ''
                const inheritedSizeName = effModel?.sizes.find((s) => s.id === effSizeId)?.name ?? ''
                const selectedColor = effModel?.colors.find((c) => c.id === row.colorId)

                return (
                  <tr
                    key={row.key}
                    className="group transition-colors hover:bg-slate-50/70"
                  >
                    <td className="px-2 py-1.5 text-center text-xs text-slate-400 font-mono">{idx + 1}</td>

                    <td className="px-2 py-1.5">
                      {showModelDropdown ? (
                        <select
                          value={row.modelId}
                          onChange={(e) => {
                            handleModelChange(row.key, e.target.value)
                            setOverrides((prev) => ({ ...prev, [row.key]: { ...prev[row.key], model: false } }))
                          }}
                          onBlur={() => {
                            if (row.modelId === '') setOverrides((prev) => ({ ...prev, [row.key]: { ...prev[row.key], model: false } }))
                          }}
                          autoFocus={overrides[row.key]?.model}
                          className={ui.controlSm}
                        >
                          <option value="">선택</option>
                          {models.map((m) => (
                            <option key={m.id} value={m.id}>
                              {m.name}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <InheritedBadge label={inheritedModelName} onOverride={() => setOverrides((prev) => ({ ...prev, [row.key]: { ...prev[row.key], model: true } }))} />
                      )}
                    </td>

                    <td className="px-2 py-1.5">
                      {showSizeDropdown ? (
                        <select
                          value={row.sizeId}
                          onChange={(e) => {
                            handleSizeChange(row.key, e.target.value, effModelId, row.colorId)
                            setOverrides((prev) => ({ ...prev, [row.key]: { ...prev[row.key], size: false } }))
                          }}
                          onBlur={() => {
                            if (row.sizeId === '') setOverrides((prev) => ({ ...prev, [row.key]: { ...prev[row.key], size: false } }))
                          }}
                          disabled={!effModelId}
                          autoFocus={overrides[row.key]?.size}
                          className={ui.controlSm}
                        >
                          <option value="">선택</option>
                          {(effModel?.sizes ?? []).map((s) => (
                            <option key={s.id} value={s.id}>
                              {s.name}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <InheritedBadge label={inheritedSizeName} onOverride={() => setOverrides((prev) => ({ ...prev, [row.key]: { ...prev[row.key], size: true } }))} />
                      )}
                    </td>

                    <td className="px-2 py-1.5">
                      <div className="flex items-center gap-1.5">
                        {selectedColor && (
                          <span
                            className="w-4 h-4 rounded-full border border-slate-200 shrink-0"
                            style={{ backgroundColor: selectedColor.rgbCode }}
                          />
                        )}
                        <select
                          value={row.colorId}
                          onChange={(e) => handleColorChange(row.key, e.target.value, effModelId, effSizeId)}
                          disabled={!effModelId || !canInput}
                          className={ui.controlSm}
                        >
                          <option value="">색상 선택</option>
                          {(effModel?.colors ?? []).map((c) => (
                            <option key={c.id} value={c.id}>
                              {c.name}
                            </option>
                          ))}
                        </select>
                      </div>
                    </td>

                    <td className="px-2 py-1.5">
                      <input
                        type="number"
                        value={row.quantity}
                        onChange={(e) =>
                          updateRow(row.key, {
                            quantity: e.target.value ? Number(e.target.value) : '',
                          })
                        }
                        placeholder="0"
                        min={1}
                        disabled={!canInput}
                        className={cx(ui.controlSm, 'text-right font-semibold')}
                      />
                    </td>

                    <td className="px-2 py-1.5 text-right">
                      {row.stockLoading ? (
                        <span className="text-xs text-slate-400 animate-pulse">…</span>
                      ) : row.currentStock !== null ? (
                        <span className="text-sm font-semibold text-slate-900">{row.currentStock}</span>
                      ) : (
                        <span className="text-xs text-slate-300">—</span>
                      )}
                    </td>

                    <td className="px-2 py-1.5 text-center">
                      <button
                        type="button"
                        onClick={() => removeRow(row.key)}
                        className="text-slate-300 transition-colors text-lg leading-none hover:text-slate-950"
                        aria-label="행 삭제"
                      >
                        ×
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      <div className="md:hidden space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-sm font-semibold text-slate-700">
            입력 항목
            {filledRows.length > 0 && (
              <span className="ml-1.5 text-slate-500">({filledRows.length}건)</span>
            )}
          </span>
          <div className="flex gap-2">
            <button type="button" onClick={() => addRows(3)} className={ui.buttonSecondary + ' px-3 py-1.5 text-xs'}>
              + 추가
            </button>
            <button type="button" onClick={clearAll} className={ui.buttonSecondary + ' px-3 py-1.5 text-xs text-slate-600'}>
              초기화
            </button>
          </div>
        </div>

        {rows.map((row, idx) => {
          const resolved = resolvedRows[idx]
          const effModelId = resolved.effModelId
          const effSizeId = resolved.effSizeId
          const effModel = getModel(effModelId)

          const isModelInherited = row.modelId === '' && effModelId !== ''
          const isSizeInherited = row.sizeId === '' && effSizeId !== ''

          const inheritedModelName = effModel?.name ?? ''
          const inheritedSizeName = effModel?.sizes.find((s) => s.id === effSizeId)?.name ?? ''

          return (
            <div key={row.key} className="surface space-y-2.5 p-3.5 transition-colors">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-400">#{idx + 1}</span>
                  {(isModelInherited || isSizeInherited) && (
                    <div className="flex items-center gap-1 text-[11px] text-slate-400 italic">
                      {isModelInherited && <span className="px-1.5 py-0.5 border border-dashed border-slate-200 rounded bg-slate-50">↑ {inheritedModelName}</span>}
                      {isSizeInherited && <span className="px-1.5 py-0.5 border border-dashed border-slate-200 rounded bg-slate-50">↑ {inheritedSizeName}</span>}
                    </div>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => removeRow(row.key)}
                  className="text-sm px-1 text-slate-400 hover:text-slate-950"
                  aria-label="행 삭제"
                >
                  삭제
                </button>
              </div>

              {isModelInherited ? (
                <InheritedBadgeMobile label={`모델: ${inheritedModelName}`} />
              ) : (
                <select
                  value={row.modelId}
                  onChange={(e) => handleModelChange(row.key, e.target.value)}
                  className={ui.control}
                >
                  <option value="">모델 선택</option>
                  {models.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name}
                    </option>
                  ))}
                </select>
              )}

              <div className="grid grid-cols-2 gap-2">
                {isSizeInherited ? (
                  <InheritedBadgeMobile label={inheritedSizeName} />
                ) : (
                  <select
                    value={row.sizeId}
                    onChange={(e) => handleSizeChange(row.key, e.target.value, effModelId, row.colorId)}
                    disabled={!effModelId}
                    className={ui.control}
                  >
                    <option value="">사이즈</option>
                    {(effModel?.sizes ?? []).map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                )}
                <select
                  value={row.colorId}
                  onChange={(e) => handleColorChange(row.key, e.target.value, effModelId, effSizeId)}
                  disabled={!effModelId || !canInput}
                  className={ui.control}
                >
                  <option value="">색상</option>
                  {(effModel?.colors ?? []).map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="number"
                  value={row.quantity}
                  onChange={(e) =>
                    updateRow(row.key, {
                      quantity: e.target.value ? Number(e.target.value) : '',
                    })
                  }
                  placeholder="수량"
                  min={1}
                  disabled={!canInput}
                  className={cx(ui.control, 'text-right font-semibold')}
                />
                {row.currentStock !== null && (
                  <div className="flex h-12 shrink-0 items-center rounded-lg border border-slate-200 bg-slate-50 px-3">
                    <span className="mr-1 text-xs text-slate-500">재고</span>
                    <span className="text-base font-semibold text-slate-900">{row.currentStock}</span>
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>

      <div className="sticky bottom-16 md:bottom-0 z-10 bg-gradient-to-t from-slate-50 via-slate-50 to-slate-50/0 pt-4 pb-2">
        <button
          onClick={submitAll}
          disabled={isPending || filledRows.length === 0 || !canInput}
          className={cx(
            'w-full h-14 rounded-xl text-lg font-semibold transition-colors',
            ui.buttonPrimary,
            'disabled:bg-slate-200 disabled:text-slate-400',
          )}
        >
          {isPending
            ? '등록 중…'
            : filledRows.length > 0
              ? `${type === '입고' ? '입고' : '출고'} 일괄 등록 (${filledRows.length}건)`
              : '항목을 입력하세요'}
        </button>
      </div>
    </div>
  )
}

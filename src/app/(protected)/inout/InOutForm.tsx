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

const INITIAL_ROW_COUNT = 6

function todayString() {
  const d = new Date()
  return d.toISOString().slice(0, 10)
}

function formatDateKR(dateStr: string) {
  const p = dateStr.split('-')
  if (p.length === 3) return `${p[0].slice(2)}.${p[1]}.${p[2]}`
  return dateStr
}

function createRowKey() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
}

function emptyRow(): RowData {
  return {
    key: createRowKey(),
    modelId: '',
    sizeId: '',
    colorId: '',
    quantity: '',
    currentStock: null,
    stockLoading: false,
  }
}

type InOutFormProps = {
  models: ModelType[]
  warehouses: WarehouseLookup[]
  initialType?: '입고' | '출고'
  initialWarehouseId?: number
  lockedWarehouseId?: number | null
  onSubmitted?: () => void
}

export default function InOutForm({
  models,
  warehouses,
  initialType = '입고',
  initialWarehouseId,
  lockedWarehouseId,
  onSubmitted,
}: InOutFormProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [date, setDate] = useState(todayString())
  const [warehouseId, setWarehouseId] = useState<number>(initialWarehouseId ?? warehouses[0]?.id ?? -1)
  const [rows, setRows] = useState<RowData[]>(() => Array.from({ length: INITIAL_ROW_COUNT }, emptyRow))
  const [message, setMessage] = useState<{ text: string; error: boolean } | null>(null)

  const selectedWarehouseId =
    lockedWarehouseId ?? (warehouseId > 0 && warehouses.some((item) => item.id === warehouseId) ? warehouseId : (warehouses[0]?.id ?? -1))
  const canInput = warehouses.length > 0 && selectedWarehouseId > 0

  const modelMap = useMemo(() => {
    const map = new Map<number, ModelType>()
    for (const model of models) {
      map.set(model.id, model)
    }
    return map
  }, [models])

  const updateRow = useCallback(
    (key: string, patch: Partial<RowData>) =>
      setRows((prev) => prev.map((row) => (row.key === key ? { ...row, ...patch } : row))),
    [],
  )

  const fetchStock = useCallback(
    async (key: string, modelId: number, sizeId: number, colorId: number, warehouseLookupId: number) => {
      updateRow(key, { stockLoading: true })

      try {
        const stock = await getCurrentStock(modelId, sizeId, colorId, warehouseLookupId)
        updateRow(key, { currentStock: stock, stockLoading: false })
      } catch {
        updateRow(key, { currentStock: null, stockLoading: false })
      }
    },
    [updateRow],
  )

  const maybeFetchStock = useCallback(
    (key: string, modelId: number | '', sizeId: number | '', colorId: number | '') => {
      if (!selectedWarehouseId || !modelId || !sizeId || !colorId) {
        updateRow(key, { currentStock: null })
        return
      }

      void fetchStock(key, modelId, sizeId, colorId, selectedWarehouseId)
    },
    [fetchStock, selectedWarehouseId, updateRow],
  )

  const handleModelChange = (key: string, value: string) => {
    const modelId = value ? Number(value) : ('' as const)
    updateRow(key, { modelId, sizeId: '', colorId: '', quantity: '', currentStock: null })
  }

  const handleSizeChange = (key: string, value: string) => {
    const sizeId = value ? Number(value) : ('' as const)
    const row = rows.find((entry) => entry.key === key)
    if (!row) return
    updateRow(key, { sizeId, currentStock: null })
    maybeFetchStock(key, row.modelId, sizeId, row.colorId)
  }

  const handleColorChange = (key: string, value: string) => {
    const colorId = value ? Number(value) : ('' as const)
    const row = rows.find((entry) => entry.key === key)
    if (!row) return
    updateRow(key, { colorId, currentStock: null })
    maybeFetchStock(key, row.modelId, row.sizeId, colorId)
  }

  const addRow = () => {
    setRows((prev) => [...prev, emptyRow()])
  }

  const removeRow = (key: string) => {
    setRows((prev) => {
      const next = prev.filter((row) => row.key !== key)
      return next.length === 0 ? [emptyRow()] : next
    })
  }

  const duplicateRow = (key: string) => {
    setRows((prev) => {
      const index = prev.findIndex((row) => row.key === key)
      if (index === -1) return prev

      const source = prev[index]
      const nextRow: RowData = {
        ...source,
        key: createRowKey(),
        currentStock: null,
        stockLoading: false,
      }

      return [...prev.slice(0, index + 1), nextRow, ...prev.slice(index + 1)]
    })
  }

  const resolvedRows = useMemo(
    () =>
      rows.map((row) => {
        const model = row.modelId ? modelMap.get(row.modelId) : undefined
        return {
          ...row,
          model,
        }
      }),
    [modelMap, rows],
  )

  const filledRows = useMemo(
    () =>
      resolvedRows.filter((row) => row.modelId && row.sizeId && row.colorId && row.quantity && Number(row.quantity) > 0),
    [resolvedRows],
  )

  const rowErrors = useMemo(
    () =>
      resolvedRows.map((row) => {
        const hasAnyInput = row.modelId !== '' || row.sizeId !== '' || row.colorId !== '' || row.quantity !== ''
        if (!hasAnyInput) return []

        const errors: string[] = []
        if (!row.modelId) errors.push('모델')
        if (!row.sizeId) errors.push('사이즈')
        if (!row.colorId) errors.push('색상')
        if (!row.quantity || Number(row.quantity) <= 0) errors.push('수량')
        return errors
      }),
    [resolvedRows],
  )

  const invalidRowCount = rowErrors.filter((errors) => errors.length > 0).length

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
          filledRows.map((row) => ({
            type: initialType,
            date: formatDateKR(date),
            warehouseId: selectedWarehouseId,
            modelId: row.modelId as number,
            sizeId: row.sizeId as number,
            colorId: row.colorId as number,
            quantity: row.quantity as number,
          })),
        )

        setMessage({ text: `${filledRows.length}건이 성공적으로 등록되었습니다.`, error: false })
        setRows(Array.from({ length: INITIAL_ROW_COUNT }, emptyRow))
        router.refresh()
        onSubmitted?.()
      } catch {
        setMessage({ text: '등록 중 오류가 발생했습니다.', error: true })
      }
    })
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] md:items-end">
        <div>
          <label className={ui.label} htmlFor="transaction-date">
            날짜
          </label>
          <input id="transaction-date" type="date" value={date} onChange={(event) => setDate(event.target.value)} className={ui.controlSm} />
        </div>

        <div>
          <label className={ui.label}>창고</label>
          {warehouses.length === 0 ? (
            <div className="flex h-11 items-center gap-2 rounded-lg border border-dashed border-slate-200 px-3 py-2.5 text-sm text-slate-500">
              창고가 없습니다.
              <Link href="/products" className="text-slate-700 underline underline-offset-2">
                창고 등록하러 가기
              </Link>
            </div>
          ) : lockedWarehouseId ? (
            <div className="flex h-11 items-center rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm font-medium text-slate-700">
              {warehouses.find((warehouse) => warehouse.id === selectedWarehouseId)?.name ?? '선택된 창고'}
            </div>
          ) : (
            <select
              value={selectedWarehouseId}
              onChange={(event) => setWarehouseId(Number(event.target.value))}
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

      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="ui-table-head text-left">
                <th className="px-3 py-3">모델</th>
                <th className="px-3 py-3">사이즈</th>
                <th className="px-3 py-3">색상</th>
                <th className="px-3 py-3 text-right">수량</th>
                <th className="px-3 py-3 text-right">재고</th>
                <th className="px-3 py-3 text-right">행 작업</th>
              </tr>
            </thead>
            <tbody>
              {resolvedRows.map((row, idx) => {
                const model = row.model
                const selectedColor = model?.colors.find((color) => color.id === row.colorId)
                const hasError = rowErrors[idx].length > 0

                return (
                  <tr key={row.key} className={cx('border-t border-slate-100', hasError && 'bg-red-50/60')}>
                    <td className="px-3 py-2.5">
                      <select value={row.modelId} onChange={(event) => handleModelChange(row.key, event.target.value)} className={ui.controlSm}>
                        <option value="">모델 선택</option>
                        {models.map((entry) => (
                          <option key={entry.id} value={entry.id}>
                            {entry.name}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="px-3 py-2.5">
                      <select value={row.sizeId} onChange={(event) => handleSizeChange(row.key, event.target.value)} disabled={!row.modelId} className={ui.controlSm}>
                        <option value="">사이즈</option>
                        {(model?.sizes ?? []).map((size) => (
                          <option key={size.id} value={size.id}>
                            {size.name}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="px-3 py-2.5">
                      <div className="flex items-center gap-2">
                        {selectedColor ? (
                          <span
                            className="h-3.5 w-3.5 rounded-full border border-slate-200"
                            style={{ backgroundColor: selectedColor.rgbCode }}
                          />
                        ) : null}
                        <select
                          value={row.colorId}
                          onChange={(event) => handleColorChange(row.key, event.target.value)}
                          disabled={!row.modelId}
                          className={ui.controlSm}
                        >
                          <option value="">색상</option>
                          {(model?.colors ?? []).map((color) => (
                            <option key={color.id} value={color.id}>
                              {color.name}
                            </option>
                          ))}
                        </select>
                      </div>
                    </td>
                    <td className="px-3 py-2.5">
                      <input
                        type="number"
                        min={1}
                        value={row.quantity}
                        onChange={(event) => updateRow(row.key, { quantity: event.target.value ? Number(event.target.value) : '' })}
                        className={cx(ui.controlSm, 'text-right font-semibold')}
                        placeholder="0"
                        disabled={!canInput}
                      />
                    </td>
                    <td className="px-3 py-2.5 text-right">
                      {row.stockLoading ? (
                        <span className="text-xs text-slate-400">조회 중…</span>
                      ) : row.currentStock !== null ? (
                        <span className="font-semibold text-slate-950">{row.currentStock}</span>
                      ) : (
                        <span className="text-xs text-slate-300">-</span>
                      )}
                    </td>
                    <td className="px-3 py-2.5">
                      <div className="flex items-center justify-end gap-2">
                        <button type="button" onClick={() => duplicateRow(row.key)} className="text-sm text-slate-500 hover:text-slate-950" aria-label="행 복제">
                          복제
                        </button>
                        <button type="button" onClick={() => removeRow(row.key)} className="text-sm text-slate-400 hover:text-slate-950" aria-label="행 삭제">
                          삭제
                        </button>
                      </div>
                      {hasError ? <p className="mt-1 text-right text-xs text-red-600">{rowErrors[idx].join(', ')} 필요</p> : null}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      <div className="flex flex-col gap-3 border-t border-slate-100 pt-4 md:flex-row md:items-center md:justify-between">
        <div className="flex flex-col gap-2">
          <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
            <span className={ui.pill}>유효 {filledRows.length}건</span>
            <span className={ui.pillMuted}>확인 필요 {invalidRowCount}건</span>
          </div>
          {message ? (
            <p
              className={cx(
                'text-xs font-medium',
                message.error ? 'text-red-600' : 'text-slate-500',
              )}
              aria-live="polite"
            >
              {message.text}
            </p>
          ) : null}
        </div>
        <div className="flex flex-wrap gap-2 md:justify-end">
          <button type="button" onClick={addRow} className={ui.buttonSecondary}>
            행 추가
          </button>
          <button
            type="button"
            onClick={submitAll}
            disabled={isPending || filledRows.length === 0 || !canInput}
            className={cx(ui.buttonPrimary, 'h-12 justify-center text-base')}
          >
            {isPending ? '등록 중…' : `${initialType} 등록 (${filledRows.length}건)`}
          </button>
        </div>
      </div>
    </div>
  )
}

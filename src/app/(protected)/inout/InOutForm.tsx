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
  sourceError: string | null
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
    sourceError: null,
  }
}

function getEffectiveModelId(rows: RowData[], idx: number): number | '' {
  for (let i = idx; i >= 0; i -= 1) {
    if (rows[i].modelId !== '') return rows[i].modelId
  }
  return ''
}

function getEffectiveSizeId(rows: RowData[], idx: number, models: ModelType[]): number | '' {
  const effModelId = getEffectiveModelId(rows, idx)
  if (!effModelId) return ''
  const model = models.find((entry) => entry.id === effModelId)
  if (!model) return ''

  for (let i = idx; i >= 0; i -= 1) {
    if (rows[i].sizeId !== '') {
      if (model.sizes.some((entry) => entry.id === rows[i].sizeId)) return rows[i].sizeId
      return ''
    }
    if (i < idx && rows[i].modelId !== '') break
  }

  return ''
}

function parseDelimitedText(text: string) {
  return text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => line.split(line.includes('\t') ? '\t' : ',').map((cell) => cell.trim()))
}

function buildRowFromCells(cells: string[], models: ModelType[]): RowData | null {
  if (cells.length === 0 || cells.every((cell) => cell.length === 0)) {
    return null
  }

  const [modelName = '', sizeName = '', colorName = '', quantityText = ''] = cells
  const normalized = [modelName.toLowerCase(), sizeName.toLowerCase(), colorName.toLowerCase()]
  const isHeader =
    (normalized[0] === '모델' || normalized[0] === 'model') &&
    (normalized[1] === '사이즈' || normalized[1] === 'size')

  if (isHeader) {
    return null
  }

  const model = models.find((entry) => entry.name === modelName)
  const size = model?.sizes.find((entry) => entry.name === sizeName)
  const color = model?.colors.find((entry) => entry.name === colorName)
  const quantity = Number(quantityText)

  const issues: string[] = []
  if (!model) issues.push(`모델 "${modelName}"`)
  if (!size) issues.push(`사이즈 "${sizeName}"`)
  if (!color) issues.push(`색상 "${colorName}"`)
  if (!Number.isFinite(quantity) || quantity <= 0) issues.push(`수량 "${quantityText}"`)

  return {
    key: createRowKey(),
    modelId: model?.id ?? '',
    sizeId: size?.id ?? '',
    colorId: color?.id ?? '',
    quantity: Number.isFinite(quantity) && quantity > 0 ? quantity : '',
    currentStock: null,
    stockLoading: false,
    sourceError: issues.length > 0 ? `가져오기 실패: ${issues.join(', ')} 확인 필요` : null,
  }
}

type InOutFormProps = {
  models: ModelType[]
  warehouses: WarehouseLookup[]
  initialType?: '입고' | '출고'
  initialWarehouseId?: number
  lockedWarehouseId?: number | null
  entryMode?: 'manual' | 'csv'
  onSubmitted?: () => void
}

export default function InOutForm({
  models,
  warehouses,
  initialType = '입고',
  initialWarehouseId,
  lockedWarehouseId,
  entryMode = 'manual',
  onSubmitted,
}: InOutFormProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  const [type, setType] = useState<'입고' | '출고'>(initialType)
  const [date, setDate] = useState(todayString())
  const [warehouseId, setWarehouseId] = useState<number>(initialWarehouseId ?? warehouses[0]?.id ?? -1)
  const [rows, setRows] = useState<RowData[]>(() => Array.from({ length: INITIAL_ROW_COUNT }, emptyRow))
  const [message, setMessage] = useState<{ text: string; error: boolean } | null>(null)
  const [importText, setImportText] = useState('')
  const [bulkImportOpen, setBulkImportOpen] = useState(entryMode === 'csv')
  const [overrides, setOverrides] = useState<Record<string, { model?: boolean; size?: boolean }>>({})
  const [overriddenWarehouseId, setOverriddenWarehouseId] = useState<number | null>(null)

  const fallbackWarehouseId =
    warehouseId > 0 && warehouses.some((item) => item.id === warehouseId)
      ? warehouseId
      : (warehouses[0]?.id ?? -1)
  const selectedWarehouseId = lockedWarehouseId ?? overriddenWarehouseId ?? fallbackWarehouseId

  const modelMap = useMemo(() => {
    const map = new Map<number, ModelType>()
    for (const model of models) {
      map.set(model.id, model)
    }
    return map
  }, [models])

  const getModel = useCallback((id: number | '') => (id === '' ? undefined : modelMap.get(id)), [modelMap])

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

  const tryFetchStock = useCallback(
    (key: string, effModelId: number | '', effSizeId: number | '', colorId: number | '') => {
      if (!selectedWarehouseId || !effModelId || !effSizeId || !colorId) {
        updateRow(key, { currentStock: null })
        return
      }

      void fetchStock(key, effModelId, effSizeId, colorId, selectedWarehouseId)
    },
    [fetchStock, selectedWarehouseId, updateRow],
  )

  const handleModelChange = useCallback(
    (key: string, value: string) => {
      const modelId = value ? Number(value) : ('' as const)
      updateRow(key, { modelId, sizeId: '', colorId: '', currentStock: null, sourceError: null })
      setOverrides((prev) => ({ ...prev, [key]: { ...prev[key], model: false, size: false } }))
    },
    [updateRow],
  )

  const handleSizeChange = useCallback(
    (key: string, value: string, effModelId: number | '', colorId: number | '') => {
      const sizeId = value ? Number(value) : ('' as const)
      updateRow(key, { sizeId, currentStock: null, sourceError: null })
      tryFetchStock(key, effModelId, sizeId || '', colorId)
    },
    [tryFetchStock, updateRow],
  )

  const handleColorChange = useCallback(
    (key: string, value: string, effModelId: number | '', effSizeId: number | '') => {
      const colorId = value ? Number(value) : ('' as const)
      updateRow(key, { colorId, currentStock: null, sourceError: null })
      tryFetchStock(key, effModelId, effSizeId, colorId)
    },
    [tryFetchStock, updateRow],
  )

  const addRows = (count: number) => {
    setRows((prev) => [...prev, ...Array.from({ length: count }, emptyRow)])
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

  const clearAll = () => {
    setRows(Array.from({ length: INITIAL_ROW_COUNT }, emptyRow))
    setImportText('')
    setMessage(null)
  }

  const resolvedRows = useMemo(
    () =>
      rows.map((row, idx) => {
        const effModelId = getEffectiveModelId(rows, idx)
        const effSizeId = getEffectiveSizeId(rows, idx, models)
        return { ...row, effModelId, effSizeId }
      }),
    [models, rows],
  )

  const filledRows = useMemo(
    () =>
      resolvedRows.filter(
        (row) => row.effModelId && row.effSizeId && row.colorId && row.quantity && Number(row.quantity) > 0,
      ),
    [resolvedRows],
  )

  const rowErrors = useMemo(
    () =>
      resolvedRows.map((row) => {
        const hasAnyInput =
          row.modelId !== '' || row.sizeId !== '' || row.colorId !== '' || row.quantity !== '' || !!row.sourceError

        if (!hasAnyInput) {
          return []
        }

        const errors: string[] = []
        if (!row.effModelId) errors.push('모델')
        if (!row.effSizeId) errors.push('사이즈')
        if (!row.colorId) errors.push('색상')
        if (!row.quantity || Number(row.quantity) <= 0) errors.push('수량')
        if (row.sourceError) errors.push(row.sourceError)

        return errors
      }),
    [resolvedRows],
  )

  const invalidRowCount = rowErrors.filter((errors) => errors.length > 0).length

  const importRowsFromText = useCallback(
    (text: string) => {
      const importedRows: RowData[] = parseDelimitedText(text)
        .map((cells) => buildRowFromCells(cells, models))
        .filter((row): row is RowData => row !== null)

      if (importedRows.length === 0) {
        setMessage({ text: '가져올 행이 없습니다. 모델, 사이즈, 색상, 수량 순서로 붙여넣어 주세요.', error: true })
        return
      }

      setRows([...importedRows, emptyRow()])
      setImportText('')
      setMessage({
        text: `${importedRows.length}개 행을 가져왔습니다.${importedRows.some((row) => row.sourceError) ? ' 일부 항목은 확인이 필요합니다.' : ''}`,
        error: false,
      })
    },
    [models],
  )

  const handleImportFile = useCallback(
    async (file: File | null) => {
      if (!file) return
      const text = await file.text()
      importRowsFromText(text)
    },
    [importRowsFromText],
  )

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
            type,
            date: formatDateKR(date),
            warehouseId: selectedWarehouseId,
            modelId: row.effModelId as number,
            sizeId: row.effSizeId as number,
            colorId: row.colorId as number,
            quantity: row.quantity as number,
          })),
        )

        setMessage({ text: `${filledRows.length}건이 성공적으로 등록되었습니다.`, error: false })
        setRows(Array.from({ length: INITIAL_ROW_COUNT }, emptyRow))
        setImportText('')
        router.refresh()
        onSubmitted?.()
        setTimeout(() => setMessage(null), 4000)
      } catch {
        setMessage({ text: '등록 중 오류가 발생했습니다.', error: true })
      }
    })
  }

  function InheritedBadge({ label, onOverride }: { label: string; onOverride: () => void }) {
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

  function InheritedBadgeMobile({ label }: { label: string }) {
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
      {message ? (
        <div
          className={cx(
            'rounded-xl border px-4 py-3 text-center text-sm font-medium',
            message.error ? 'border-red-200 bg-red-50 text-red-700' : 'border-slate-200 bg-slate-50 text-slate-700',
          )}
          aria-live="polite"
        >
          {message.text}
        </div>
      ) : null}

      <div className={cx(ui.panel, ui.panelBody, 'md:p-5')}>
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className={ui.label}>날짜</label>
            <input type="date" value={date} onChange={(event) => setDate(event.target.value)} className={ui.controlSm} />
          </div>

          <div>
            <label className={ui.label}>창고</label>
            {warehouses.length === 0 ? (
              <div className="flex h-11 items-center gap-2 rounded-lg border border-dashed border-slate-200 px-3 py-2.5 text-sm text-slate-500">
                창고가 없습니다.
                <Link href="/settings/master-data" className="text-slate-700 underline underline-offset-2">
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
                onChange={(event) => {
                  const next = Number(event.target.value)
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

        {!canInput ? <p className="mt-4 text-sm text-slate-500">입출고 등록은 창고 등록 후 이용할 수 있습니다.</p> : null}
      </div>

      <div className={cx(ui.panel, ui.panelBody, 'space-y-3 md:p-5')}>
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-sm font-semibold text-slate-900">{entryMode === 'csv' ? 'CSV/표 가져오기' : '표 붙여넣기'}</h2>
            <p className="mt-1 text-sm text-slate-500">
              `모델, 사이즈, 색상, 수량` 순서의 CSV 또는 탭 구분 텍스트를 붙여넣거나 파일로 가져올 수 있습니다.
            </p>
          </div>
          {entryMode === 'manual' ? (
            <button type="button" onClick={() => setBulkImportOpen((current) => !current)} className={ui.buttonSecondary}>
              {bulkImportOpen ? '가져오기 닫기' : '표 붙여넣기'}
            </button>
          ) : null}
        </div>

        {bulkImportOpen ? (
          <div className="space-y-3 rounded-2xl border border-dashed border-slate-300 bg-slate-50/80 p-3 md:p-4">
            <label className="text-sm font-medium text-slate-700" htmlFor="bulk-import-text">
              붙여넣기
            </label>
            <textarea
              id="bulk-import-text"
              value={importText}
              onChange={(event) => setImportText(event.target.value)}
              placeholder={'모델,사이즈,색상,수량\nLP01,S,네이비,12'}
              className={cx(ui.control, 'min-h-28 resize-y font-mono text-sm')}
            />
            <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
              <label className={cx(ui.buttonSecondary, 'cursor-pointer justify-center')}>
                파일 선택
                <input
                  type="file"
                  accept=".csv,text/csv,.txt,.tsv"
                  className="sr-only"
                  onChange={(event) => {
                    void handleImportFile(event.target.files?.[0] ?? null)
                    event.currentTarget.value = ''
                  }}
                />
              </label>
              <button
                type="button"
                onClick={() => importRowsFromText(importText)}
                className={ui.buttonPrimary}
                disabled={importText.trim().length === 0}
              >
                행으로 가져오기
              </button>
            </div>
          </div>
        ) : null}

        <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
          <span className={ui.pill}>유효 {filledRows.length}건</span>
          <span className={ui.pillMuted}>확인 필요 {invalidRowCount}건</span>
        </div>
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
            {filledRows.length > 0 ? <span className="ml-2 text-slate-500">({filledRows.length}건 입력됨)</span> : null}
          </span>
          <div className="flex gap-2">
            <button type="button" onClick={() => addRows(5)} className={cx(ui.buttonSecondary, 'px-3 py-1.5 text-xs')}>
              + 5행 추가
            </button>
            <button type="button" onClick={clearAll} className={cx(ui.buttonSecondary, 'px-3 py-1.5 text-xs text-slate-600')}>
              초기화
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="ui-table-head text-slate-500">
                <th className="w-8 px-2 py-2.5 text-center">#</th>
                <th className="min-w-[150px] px-2 py-2.5 text-left">모델</th>
                <th className="min-w-[140px] px-2 py-2.5 text-left">사이즈</th>
                <th className="min-w-[130px] px-2 py-2.5 text-left">색상</th>
                <th className="w-[90px] px-2 py-2.5 text-right">수량</th>
                <th className="w-[70px] px-2 py-2.5 text-right">재고</th>
                <th className="w-24 px-2 py-2.5 text-right">행 작업</th>
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
                const inheritedSizeName = effModel?.sizes.find((size) => size.id === effSizeId)?.name ?? ''
                const selectedColor = effModel?.colors.find((color) => color.id === row.colorId)
                const hasError = rowErrors[idx].length > 0

                return (
                  <tr key={row.key} className={cx('group transition-colors hover:bg-slate-50/70', hasError && 'bg-rose-50/60')}>
                    <td className="px-2 py-1.5 text-center font-mono text-xs text-slate-400">{idx + 1}</td>

                    <td className="px-2 py-1.5">
                      {showModelDropdown ? (
                        <select
                          value={row.modelId}
                          onChange={(event) => {
                            handleModelChange(row.key, event.target.value)
                            setOverrides((prev) => ({ ...prev, [row.key]: { ...prev[row.key], model: false } }))
                          }}
                          onBlur={() => {
                            if (row.modelId === '') {
                              setOverrides((prev) => ({ ...prev, [row.key]: { ...prev[row.key], model: false } }))
                            }
                          }}
                          autoFocus={overrides[row.key]?.model}
                          className={ui.controlSm}
                        >
                          <option value="">선택</option>
                          {models.map((model) => (
                            <option key={model.id} value={model.id}>
                              {model.name}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <InheritedBadge
                          label={inheritedModelName}
                          onOverride={() =>
                            setOverrides((prev) => ({ ...prev, [row.key]: { ...prev[row.key], model: true } }))
                          }
                        />
                      )}
                    </td>

                    <td className="px-2 py-1.5">
                      {showSizeDropdown ? (
                        <select
                          value={row.sizeId}
                          onChange={(event) => {
                            handleSizeChange(row.key, event.target.value, effModelId, row.colorId)
                            setOverrides((prev) => ({ ...prev, [row.key]: { ...prev[row.key], size: false } }))
                          }}
                          onBlur={() => {
                            if (row.sizeId === '') {
                              setOverrides((prev) => ({ ...prev, [row.key]: { ...prev[row.key], size: false } }))
                            }
                          }}
                          disabled={!effModelId}
                          autoFocus={overrides[row.key]?.size}
                          className={ui.controlSm}
                        >
                          <option value="">선택</option>
                          {(effModel?.sizes ?? []).map((size) => (
                            <option key={size.id} value={size.id}>
                              {size.name}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <InheritedBadge
                          label={inheritedSizeName}
                          onOverride={() =>
                            setOverrides((prev) => ({ ...prev, [row.key]: { ...prev[row.key], size: true } }))
                          }
                        />
                      )}
                    </td>

                    <td className="px-2 py-1.5">
                      <div className="flex items-center gap-1.5">
                        {selectedColor ? (
                          <span
                            className="h-4 w-4 shrink-0 rounded-full border border-slate-200"
                            style={{ backgroundColor: selectedColor.rgbCode }}
                          />
                        ) : null}
                        <select
                          value={row.colorId}
                          onChange={(event) => handleColorChange(row.key, event.target.value, effModelId, effSizeId)}
                          disabled={!effModelId || !canInput}
                          className={ui.controlSm}
                        >
                          <option value="">색상 선택</option>
                          {(effModel?.colors ?? []).map((color) => (
                            <option key={color.id} value={color.id}>
                              {color.name}
                            </option>
                          ))}
                        </select>
                      </div>
                    </td>

                    <td className="px-2 py-1.5">
                      <input
                        type="number"
                        value={row.quantity}
                        onChange={(event) =>
                          updateRow(row.key, {
                            quantity: event.target.value ? Number(event.target.value) : '',
                            sourceError: null,
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
                        <span className="animate-pulse text-xs text-slate-400">…</span>
                      ) : row.currentStock !== null ? (
                        <span className="text-sm font-semibold text-slate-900">{row.currentStock}</span>
                      ) : (
                        <span className="text-xs text-slate-300">—</span>
                      )}
                    </td>

                    <td className="px-2 py-1.5 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => duplicateRow(row.key)}
                          className="text-xs font-medium text-slate-500 transition-colors hover:text-slate-950"
                          aria-label="행 복제"
                        >
                          복제
                        </button>
                        <button
                          type="button"
                          onClick={() => removeRow(row.key)}
                          className="text-lg leading-none text-slate-300 transition-colors hover:text-slate-950"
                          aria-label="행 삭제"
                        >
                          ×
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {rowErrors.some((errors) => errors.length > 0) ? (
          <div className="border-t border-slate-200 bg-rose-50/70 px-4 py-3 text-sm text-rose-700">
            일부 행에 누락 항목이 있습니다. 붉은색으로 강조된 행을 확인해 주세요.
          </div>
        ) : null}
      </div>

      <div className="space-y-3 md:hidden">
        <div className="flex items-center justify-between">
          <span className="text-sm font-semibold text-slate-700">
            입력 항목
            {filledRows.length > 0 ? <span className="ml-1.5 text-slate-500">({filledRows.length}건)</span> : null}
          </span>
          <div className="flex gap-2">
            <button type="button" onClick={() => addRows(3)} className={cx(ui.buttonSecondary, 'px-3 py-1.5 text-xs')}>
              + 추가
            </button>
            <button type="button" onClick={clearAll} className={cx(ui.buttonSecondary, 'px-3 py-1.5 text-xs text-slate-600')}>
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
          const inheritedSizeName = effModel?.sizes.find((size) => size.id === effSizeId)?.name ?? ''
          const hasError = rowErrors[idx].length > 0

          return (
            <div key={row.key} className={cx('surface space-y-2.5 p-3.5 transition-colors', hasError && 'border-rose-200 bg-rose-50/70')}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-400">#{idx + 1}</span>
                  {isModelInherited || isSizeInherited ? (
                    <div className="flex items-center gap-1 text-[11px] italic text-slate-400">
                      {isModelInherited ? (
                        <span className="rounded border border-dashed border-slate-200 bg-slate-50 px-1.5 py-0.5">↑ {inheritedModelName}</span>
                      ) : null}
                      {isSizeInherited ? (
                        <span className="rounded border border-dashed border-slate-200 bg-slate-50 px-1.5 py-0.5">↑ {inheritedSizeName}</span>
                      ) : null}
                    </div>
                  ) : null}
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => duplicateRow(row.key)}
                    className="px-1 text-sm text-slate-500 hover:text-slate-950"
                    aria-label="행 복제"
                  >
                    복제
                  </button>
                  <button
                    type="button"
                    onClick={() => removeRow(row.key)}
                    className="px-1 text-sm text-slate-400 hover:text-slate-950"
                    aria-label="행 삭제"
                  >
                    삭제
                  </button>
                </div>
              </div>

              {isModelInherited ? (
                <InheritedBadgeMobile label={`모델: ${inheritedModelName}`} />
              ) : (
                <select value={row.modelId} onChange={(event) => handleModelChange(row.key, event.target.value)} className={ui.control}>
                  <option value="">모델 선택</option>
                  {models.map((model) => (
                    <option key={model.id} value={model.id}>
                      {model.name}
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
                    onChange={(event) => handleSizeChange(row.key, event.target.value, effModelId, row.colorId)}
                    disabled={!effModelId}
                    className={ui.control}
                  >
                    <option value="">사이즈</option>
                    {(effModel?.sizes ?? []).map((size) => (
                      <option key={size.id} value={size.id}>
                        {size.name}
                      </option>
                    ))}
                  </select>
                )}

                <select
                  value={row.colorId}
                  onChange={(event) => handleColorChange(row.key, event.target.value, effModelId, effSizeId)}
                  disabled={!effModelId || !canInput}
                  className={ui.control}
                >
                  <option value="">색상</option>
                  {(effModel?.colors ?? []).map((color) => (
                    <option key={color.id} value={color.id}>
                      {color.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="number"
                  value={row.quantity}
                  onChange={(event) =>
                    updateRow(row.key, {
                      quantity: event.target.value ? Number(event.target.value) : '',
                      sourceError: null,
                    })
                  }
                  placeholder="수량"
                  min={1}
                  disabled={!canInput}
                  className={cx(ui.control, 'text-right font-semibold')}
                />
                {row.currentStock !== null ? (
                  <div className="flex h-12 shrink-0 items-center rounded-lg border border-slate-200 bg-slate-50 px-3">
                    <span className="mr-1 text-xs text-slate-500">재고</span>
                    <span className="text-base font-semibold text-slate-900">{row.currentStock}</span>
                  </div>
                ) : null}
              </div>

              {hasError ? <p className="text-xs font-medium text-rose-700">{rowErrors[idx][0]}</p> : null}
            </div>
          )
        })}
      </div>

      <div className="sticky bottom-16 z-10 bg-gradient-to-t from-slate-50 via-slate-50 to-slate-50/0 pb-2 pt-4 md:bottom-0">
        <button
          onClick={submitAll}
          disabled={isPending || filledRows.length === 0 || !canInput}
          className={cx('h-14 w-full rounded-xl text-lg font-semibold transition-colors', ui.buttonPrimary, 'disabled:bg-slate-200 disabled:text-slate-400')}
        >
          {isPending ? '등록 중…' : filledRows.length > 0 ? `${type === '입고' ? '입고' : '출고'} 일괄 등록 (${filledRows.length}건)` : '항목을 입력하세요'}
        </button>
      </div>
    </div>
  )
}

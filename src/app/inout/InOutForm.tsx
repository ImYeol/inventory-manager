'use client'

import { useState, useTransition, useCallback, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { createTransactions, getCurrentStock } from '@/lib/actions'

type SizeType = { id: number; name: string; sortOrder: number; modelId: number }
type ColorType = {
  id: number; name: string; rgbCode: string; textWhite: boolean
  sortOrder: number; modelId: number
}
type ModelType = { id: number; name: string; sizes: SizeType[]; colors: ColorType[] }

type RowData = {
  key: string
  modelId: number | ''
  sizeId: number | ''
  colorId: number | ''
  quantity: number | ''
  currentStock: number | null
  stockLoading: boolean
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

function todayString() {
  const d = new Date()
  return d.toISOString().slice(0, 10)
}

function formatDateKR(dateStr: string) {
  const p = dateStr.split('-')
  if (p.length === 3) return `${p[0].slice(2)}.${p[1]}.${p[2]}`
  return dateStr
}

// ── 상속 체인 함수 ──
function getEffectiveModelId(rows: RowData[], idx: number): number | '' {
  for (let i = idx; i >= 0; i--) {
    if (rows[i].modelId !== '') return rows[i].modelId
  }
  return ''
}

function getEffectiveSizeId(
  rows: RowData[], idx: number, models: ModelType[],
): number | '' {
  const effModelId = getEffectiveModelId(rows, idx)
  if (!effModelId) return ''
  const model = models.find((m) => m.id === effModelId)
  if (!model) return ''

  for (let i = idx; i >= 0; i--) {
    if (rows[i].sizeId !== '') {
      // 이 사이즈가 effective 모델에 속하는지 확인
      if (model.sizes.some((s) => s.id === rows[i].sizeId)) {
        return rows[i].sizeId
      }
      return '' // 다른 모델의 사이즈 → 상속 끊김
    }
    // 위 행에서 명시적으로 다른 모델을 선택했으면 사이즈 상속 끊김
    if (i < idx && rows[i].modelId !== '') break
  }
  return ''
}

const INITIAL_ROW_COUNT = 8

export default function InOutForm({ models }: { models: ModelType[] }) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  const [type, setType] = useState<'입고' | '반출'>('입고')
  const [date, setDate] = useState(todayString())
  const [warehouse, setWarehouse] = useState('오금동')
  const [rows, setRows] = useState<RowData[]>(
    () => Array.from({ length: INITIAL_ROW_COUNT }, emptyRow),
  )
  const [message, setMessage] = useState<{ text: string; error: boolean } | null>(null)

  // ── helpers ──
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
    async (key: string, mId: number, sId: number, cId: number, wh: string) => {
      updateRow(key, { stockLoading: true })
      try {
        const stock = await getCurrentStock(mId, sId, cId, wh)
        updateRow(key, { currentStock: stock, stockLoading: false })
      } catch {
        updateRow(key, { currentStock: null, stockLoading: false })
      }
    },
    [updateRow],
  )

  // ── effective 값에 기반한 재고 조회 ──
  const tryFetchStock = useCallback(
    (key: string, effModelId: number | '', effSizeId: number | '', colorId: number | '', wh: string) => {
      if (effModelId && effSizeId && colorId) {
        fetchStock(key, effModelId as number, effSizeId as number, colorId as number, wh)
      } else {
        updateRow(key, { currentStock: null })
      }
    },
    [fetchStock, updateRow],
  )

  // ── row event handlers ──
  const handleModelChange = (key: string, val: string) => {
    const newModelId = val ? Number(val) : ('' as const)
    updateRow(key, { modelId: newModelId, sizeId: '', colorId: '', currentStock: null })
  }

  const handleSizeChange = (key: string, val: string, effModelId: number | '', colorId: number | '') => {
    const newSizeId = val ? Number(val) : ('' as const)
    updateRow(key, { sizeId: newSizeId, currentStock: null })
    tryFetchStock(key, effModelId, newSizeId || '' , colorId, warehouse)
  }

  const handleColorChange = (key: string, val: string, effModelId: number | '', effSizeId: number | '') => {
    const newColorId = val ? Number(val) : ('' as const)
    updateRow(key, { colorId: newColorId, currentStock: null })
    tryFetchStock(key, effModelId, effSizeId, newColorId, warehouse)
  }

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

  // ── 제출용 resolved rows ──
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
    startTransition(async () => {
      try {
        await createTransactions(
          filledRows.map((r) => ({
            type,
            date: formatDateKR(date),
            warehouse,
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

  // ── 상속 표시 컴포넌트 ──
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
        className="w-full h-9 px-2 flex items-center gap-1 text-sm text-slate-400 italic
                   border border-dashed border-slate-200 rounded-lg
                   hover:border-blue-400 hover:text-blue-500 hover:bg-blue-50/50
                   transition-all cursor-pointer group"
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
      <div className="h-12 px-3 flex items-center gap-1.5 text-sm text-slate-400 italic
                      border border-dashed border-slate-200 rounded-lg bg-slate-50/50">
        <span className="text-[10px] opacity-60">↑</span>
        <span className="truncate">{label}</span>
      </div>
    )
  }

  // ── 행별 override 상태 (상속 표시를 클릭해서 드롭다운으로 전환) ──
  const [overrides, setOverrides] = useState<Record<string, { model?: boolean; size?: boolean }>>({})
  const setOverride = (key: string, field: 'model' | 'size', val: boolean) => {
    setOverrides((prev) => ({
      ...prev,
      [key]: { ...prev[key], [field]: val },
    }))
  }

  return (
    <div className="space-y-4">
      {/* 메시지 배너 */}
      {message && (
        <div
          className={`px-4 py-3 rounded-xl text-center font-medium text-sm border ${
            message.error
              ? 'bg-red-50 border-red-200 text-red-700'
              : 'bg-emerald-50 border-emerald-200 text-emerald-700'
          }`}
        >
          {message.text}
        </div>
      )}

      {/* ─── 상단 공통 설정 카드 ─── */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-4 md:p-5">
        <div className="flex gap-2 mb-4">
          <button
            onClick={() => setType('입고')}
            className={`flex-1 h-[52px] rounded-xl text-[17px] font-bold tracking-wide transition-all ${
              type === '입고'
                ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-200'
                : 'bg-slate-100 text-slate-400 hover:bg-slate-200'
            }`}
          >
            ▼ 입고
          </button>
          <button
            onClick={() => setType('반출')}
            className={`flex-1 h-[52px] rounded-xl text-[17px] font-bold tracking-wide transition-all ${
              type === '반출'
                ? 'bg-red-600 text-white shadow-lg shadow-red-200'
                : 'bg-slate-100 text-slate-400 hover:bg-slate-200'
            }`}
          >
            ▲ 반출
          </button>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1.5">날짜</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full h-11 px-3 border border-slate-200 rounded-lg text-sm text-slate-800
                         focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1.5">창고</label>
            <div className="flex gap-1.5 h-11">
              {['오금동', '대자동'].map((wh) => (
                <button
                  key={wh}
                  onClick={() => setWarehouse(wh)}
                  className={`flex-1 rounded-lg text-sm font-semibold transition-all ${
                    warehouse === wh
                      ? 'bg-blue-600 text-white'
                      : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                  }`}
                >
                  {wh}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ─── 상속 안내 ─── */}
      <div className="flex items-center gap-2 px-1 text-xs text-slate-400">
        <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 border border-dashed border-slate-300 rounded text-[11px] italic text-slate-400">
          ↑ 상속
        </span>
        <span>= 비어있으면 위 행의 모델/사이즈를 자동 적용</span>
      </div>

      {/* ═══════ 데스크톱 테이블 ═══════ */}
      <div className="hidden md:block bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
        <div className="px-4 py-3 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
          <span className="text-sm font-bold text-slate-600">
            일괄 입력
            {filledRows.length > 0 && (
              <span className="ml-2 text-blue-600">({filledRows.length}건 입력됨)</span>
            )}
          </span>
          <div className="flex gap-2">
            <button
              onClick={() => addRows(5)}
              className="px-3 py-1.5 text-xs font-semibold text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
            >
              + 5행 추가
            </button>
            <button
              onClick={clearAll}
              className="px-3 py-1.5 text-xs font-semibold text-slate-500 bg-slate-100 rounded-lg hover:bg-slate-200 transition-colors"
            >
              초기화
            </button>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wider">
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

                const isFilled = effModelId && effSizeId && row.colorId && row.quantity && Number(row.quantity) > 0

                // 상속된 모델/사이즈 이름
                const inheritedModelName = effModel?.name ?? ''
                const inheritedSizeName = effModel?.sizes.find((s) => s.id === effSizeId)?.name ?? ''

                // 색상의 색깔 dot
                const selectedColor = effModel?.colors.find((c) => c.id === row.colorId)

                return (
                  <tr
                    key={row.key}
                    className={`group transition-colors ${
                      isFilled
                        ? type === '입고' ? 'bg-emerald-50/40' : 'bg-red-50/40'
                        : 'hover:bg-slate-50/50'
                    }`}
                  >
                    <td className="px-2 py-1.5 text-center text-xs text-slate-400 font-mono">
                      {idx + 1}
                    </td>

                    {/* ── 모델 ── */}
                    <td className="px-2 py-1.5">
                      {showModelDropdown ? (
                        <select
                          value={row.modelId}
                          onChange={(e) => {
                            handleModelChange(row.key, e.target.value)
                            setOverride(row.key, 'model', false)
                          }}
                          onBlur={() => {
                            if (row.modelId === '') setOverride(row.key, 'model', false)
                          }}
                          autoFocus={overrides[row.key]?.model}
                          className="w-full h-9 px-2 border border-slate-200 rounded-lg text-sm bg-white
                                     focus:outline-none focus:ring-1 focus:ring-blue-400"
                        >
                          <option value="">선택</option>
                          {models.map((m) => (
                            <option key={m.id} value={m.id}>{m.name}</option>
                          ))}
                        </select>
                      ) : (
                        <InheritedBadge
                          label={inheritedModelName}
                          onOverride={() => setOverride(row.key, 'model', true)}
                        />
                      )}
                    </td>

                    {/* ── 사이즈 ── */}
                    <td className="px-2 py-1.5">
                      {showSizeDropdown ? (
                        <select
                          value={row.sizeId}
                          onChange={(e) => {
                            handleSizeChange(row.key, e.target.value, effModelId, row.colorId)
                            setOverride(row.key, 'size', false)
                          }}
                          onBlur={() => {
                            if (row.sizeId === '') setOverride(row.key, 'size', false)
                          }}
                          disabled={!effModelId}
                          autoFocus={overrides[row.key]?.size}
                          className="w-full h-9 px-2 border border-slate-200 rounded-lg text-sm bg-white
                                     disabled:bg-slate-50 disabled:text-slate-300
                                     focus:outline-none focus:ring-1 focus:ring-blue-400"
                        >
                          <option value="">선택</option>
                          {(effModel?.sizes ?? []).map((s) => (
                            <option key={s.id} value={s.id}>{s.name}</option>
                          ))}
                        </select>
                      ) : (
                        <InheritedBadge
                          label={inheritedSizeName}
                          onOverride={() => setOverride(row.key, 'size', true)}
                        />
                      )}
                    </td>

                    {/* ── 색상 (상속 안함 / 항상 드롭다운) ── */}
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
                          disabled={!effModelId}
                          className="w-full h-9 px-2 border border-slate-200 rounded-lg text-sm bg-white
                                     disabled:bg-slate-50 disabled:text-slate-300
                                     focus:outline-none focus:ring-1 focus:ring-blue-400"
                        >
                          <option value="">색상 선택</option>
                          {(effModel?.colors ?? []).map((c) => (
                            <option key={c.id} value={c.id}>{c.name}</option>
                          ))}
                        </select>
                      </div>
                    </td>

                    {/* ── 수량 ── */}
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
                        className="w-full h-9 px-2 border border-slate-200 rounded-lg text-sm text-right
                                   font-semibold focus:outline-none focus:ring-1 focus:ring-blue-400"
                      />
                    </td>

                    {/* ── 현재 재고 ── */}
                    <td className="px-2 py-1.5 text-right">
                      {row.stockLoading ? (
                        <span className="text-xs text-slate-400 animate-pulse">...</span>
                      ) : row.currentStock !== null ? (
                        <span className="text-sm font-bold text-blue-600">{row.currentStock}</span>
                      ) : (
                        <span className="text-xs text-slate-300">—</span>
                      )}
                    </td>

                    {/* ── 삭제 ── */}
                    <td className="px-2 py-1.5 text-center">
                      <button
                        onClick={() => removeRow(row.key)}
                        className="text-slate-300 hover:text-red-500 transition-colors text-lg leading-none"
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

      {/* ═══════ 모바일 카드 ═══════ */}
      <div className="md:hidden space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-sm font-bold text-slate-600">
            입력 항목
            {filledRows.length > 0 && (
              <span className="ml-1.5 text-blue-600">({filledRows.length}건)</span>
            )}
          </span>
          <div className="flex gap-2">
            <button
              onClick={() => addRows(3)}
              className="px-3 py-1.5 text-xs font-semibold text-blue-600 bg-blue-50 rounded-lg"
            >
              + 추가
            </button>
            <button
              onClick={clearAll}
              className="px-3 py-1.5 text-xs font-semibold text-slate-500 bg-slate-100 rounded-lg"
            >
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

          const isFilled = effModelId && effSizeId && row.colorId && row.quantity && Number(row.quantity) > 0

          return (
            <div
              key={row.key}
              className={`bg-white border rounded-xl p-3.5 space-y-2.5 transition-all ${
                isFilled
                  ? type === '입고'
                    ? 'border-emerald-300 shadow-sm shadow-emerald-100'
                    : 'border-red-300 shadow-sm shadow-red-100'
                  : 'border-slate-200'
              }`}
            >
              {/* 카드 헤더 */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-400">#{idx + 1}</span>
                  {/* 상속 배지 표시 */}
                  {(isModelInherited || isSizeInherited) && (
                    <div className="flex items-center gap-1 text-[11px] text-slate-400 italic">
                      {isModelInherited && (
                        <span className="px-1.5 py-0.5 border border-dashed border-slate-200 rounded bg-slate-50">
                          ↑ {inheritedModelName}
                        </span>
                      )}
                      {isSizeInherited && (
                        <span className="px-1.5 py-0.5 border border-dashed border-slate-200 rounded bg-slate-50">
                          ↑ {inheritedSizeName}
                        </span>
                      )}
                    </div>
                  )}
                </div>
                <button
                  onClick={() => removeRow(row.key)}
                  className="text-slate-400 hover:text-red-500 text-sm px-1"
                >
                  삭제
                </button>
              </div>

              {/* 모델 - 상속 시 컴팩트 / 아닐 때 풀 드롭다운 */}
              {isModelInherited ? (
                <InheritedBadgeMobile label={`모델: ${inheritedModelName}`} />
              ) : (
                <select
                  value={row.modelId}
                  onChange={(e) => handleModelChange(row.key, e.target.value)}
                  className="w-full h-12 px-3 border border-slate-200 rounded-lg text-base bg-white
                             focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">모델 선택</option>
                  {models.map((m) => (
                    <option key={m.id} value={m.id}>{m.name}</option>
                  ))}
                </select>
              )}

              {/* 사이즈 + 색상 */}
              <div className="grid grid-cols-2 gap-2">
                {isSizeInherited ? (
                  <InheritedBadgeMobile label={inheritedSizeName} />
                ) : (
                  <select
                    value={row.sizeId}
                    onChange={(e) => handleSizeChange(row.key, e.target.value, effModelId, row.colorId)}
                    disabled={!effModelId}
                    className="h-12 px-3 border border-slate-200 rounded-lg text-sm bg-white
                               disabled:bg-slate-50 disabled:text-slate-300
                               focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">사이즈</option>
                    {(effModel?.sizes ?? []).map((s) => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                )}
                <select
                  value={row.colorId}
                  onChange={(e) => handleColorChange(row.key, e.target.value, effModelId, effSizeId)}
                  disabled={!effModelId}
                  className="h-12 px-3 border border-slate-200 rounded-lg text-sm bg-white
                             disabled:bg-slate-50 disabled:text-slate-300
                             focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">색상</option>
                  {(effModel?.colors ?? []).map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>

              {/* 수량 + 현재 재고 */}
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
                  className="flex-1 h-12 px-3 border border-slate-200 rounded-lg text-base text-right
                             font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                {row.currentStock !== null && (
                  <div className="shrink-0 bg-blue-50 border border-blue-100 rounded-lg px-3 h-12 flex items-center">
                    <span className="text-xs text-blue-500 mr-1">재고</span>
                    <span className="text-base font-bold text-blue-700">{row.currentStock}</span>
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* ─── 하단 일괄 등록 버튼 ─── */}
      <div className="sticky bottom-16 md:bottom-0 z-10 bg-gradient-to-t from-slate-50 via-slate-50 to-slate-50/0 pt-4 pb-2">
        <button
          onClick={submitAll}
          disabled={isPending || filledRows.length === 0}
          className={`w-full h-14 text-white text-lg font-bold rounded-xl transition-all
                      disabled:bg-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed
                      disabled:shadow-none ${
            type === '입고'
              ? 'bg-emerald-600 hover:bg-emerald-700 shadow-lg shadow-emerald-200'
              : 'bg-red-600 hover:bg-red-700 shadow-lg shadow-red-200'
          }`}
        >
          {isPending
            ? '등록 중...'
            : filledRows.length > 0
              ? `${type === '입고' ? '입고' : '반출'} 일괄 등록 (${filledRows.length}건)`
              : '항목을 입력하세요'}
        </button>
      </div>
    </div>
  )
}

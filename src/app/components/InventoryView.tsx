'use client'

import { useMemo, useState } from 'react'
import { addTransaction, adjustInventory } from '@/lib/actions'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { cx, ui } from './ui'

type InventoryItem = {
  id: number
  modelId: number
  sizeId: number
  colorId: number
  warehouseId: number
  warehouseName: string
  quantity: number
}

type ColorType = {
  id: number
  name: string
  rgbCode: string
  textWhite: boolean
  sortOrder: number
  modelId: number
}

type SizeType = {
  id: number
  name: string
  sortOrder: number
  modelId: number
}

type ModelWithRelations = {
  id: number
  name: string
  sizes: SizeType[]
  colors: ColorType[]
  inventory: InventoryItem[]
}

type WarehouseLookup = {
  id: number
  name: string
}

type InventoryViewProps = {
  models: ModelWithRelations[]
  warehouses: WarehouseLookup[]
  recentMovements?: Array<{
    modelName: string
    colorName: string
    sizeName: string
    type: '입고' | '출고'
    quantity: number
  }>
}

function todayText() {
  const today = new Date()
  return `${String(today.getFullYear()).slice(2)}.${String(today.getMonth() + 1).padStart(2, '0')}.${String(today.getDate()).padStart(2, '0')}`
}

function makeEditKey(colorId: number, sizeId: number) {
  return `${colorId}:${sizeId}`
}

function InventorySelect({
  label,
  value,
  options,
  onValueChange,
  className,
}: {
  label: string
  value: string
  options: Array<{ value: string; label: string }>
  onValueChange: (value: string) => void
  className?: string
}) {
  return (
    <div className={className}>
      <Select value={value} onValueChange={onValueChange}>
        <SelectTrigger aria-label={label} className={ui.controlSm}>
          <SelectValue placeholder={label} />
        </SelectTrigger>
        <SelectContent>
          {options.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}

export default function InventoryView({ models, warehouses, recentMovements = [] }: InventoryViewProps) {
  const [expanded, setExpanded] = useState<number | null>(models.length === 1 ? models[0].id : null)
  const [viewByModel, setViewByModel] = useState<Record<number, number | 'all'>>({})
  const [adjustModelId, setAdjustModelId] = useState<number | null>(null)
  const [adjustWarehouseByModel, setAdjustWarehouseByModel] = useState<Record<number, number>>({})
  const [adjustEdits, setAdjustEdits] = useState<Record<number, Record<string, number>>>({})

  const hasWarehouses = warehouses.length > 0
  const [submitting, setSubmitting] = useState(false)
  const [message, setMessage] = useState<{ type: 'ok' | 'error'; text: string } | null>(null)
  const movementMap = useMemo(() => {
    const next = new Map<string, { type: '입고' | '출고'; quantity: number }>()

    for (const movement of recentMovements ?? []) {
      const key = `${movement.modelName}::${movement.colorName}::${movement.sizeName}`
      if (!next.has(key)) {
        next.set(key, { type: movement.type, quantity: movement.quantity })
      }
    }

    return next
  }, [recentMovements])

  const getMovement = (modelName: string, colorName: string, sizeName: string) =>
    movementMap.get(`${modelName}::${colorName}::${sizeName}`)

  const getView = (modelId: number) => viewByModel[modelId] ?? 'all'

  const setView = (modelId: number, value: number | 'all') => {
    setViewByModel((prev) => ({
      ...prev,
      [modelId]: value,
    }))
  }

  const getWarehouseQty = (
    model: ModelWithRelations,
    colorId: number,
    sizeId: number,
    warehouseId: number | 'all',
  ) => {
    if (warehouseId === 'all') {
      return model.inventory
        .filter((inv) => inv.colorId === colorId && inv.sizeId === sizeId)
        .reduce((sum, inv) => sum + inv.quantity, 0)
    }
    const inv = model.inventory.find(
      (item) => item.colorId === colorId && item.sizeId === sizeId && item.warehouseId === warehouseId,
    )
    return inv?.quantity ?? 0
  }

  const getTotalQty = (model: ModelWithRelations, warehouseId: number | 'all') =>
    model.inventory
      .filter((inv) => warehouseId === 'all' || inv.warehouseId === warehouseId)
      .reduce((sum, inv) => sum + inv.quantity, 0)

  const getInventoryByModelAndFilter = (model: ModelWithRelations, warehouseId: number | 'all') => {
    const colorRows = model.colors.map((color) => {
      const sizeCells = model.sizes.map((size) => {
        const quantity = getWarehouseQty(model, color.id, size.id, warehouseId)
        return { size, quantity }
      })
      return {
        color,
        cells: sizeCells,
        total: sizeCells.reduce((sum, cell) => sum + cell.quantity, 0),
      }
    })

    return colorRows
  }

  const getModelInventoryRow = (model: ModelWithRelations, colorId: number, sizeId: number, warehouseId: number) => {
    return model.inventory.find(
      (item) => item.colorId === colorId && item.sizeId === sizeId && item.warehouseId === warehouseId,
    )
  }

  const openAdjust = (model: ModelWithRelations) => {
    if (!hasWarehouses) return
    const defaultWarehouse = warehouses[0]?.id

    if (!defaultWarehouse) return

    setAdjustModelId(model.id)
    setAdjustWarehouseByModel((prev) => ({
      ...prev,
      [model.id]: defaultWarehouse,
    }))
    setAdjustEdits((prev) => ({
      ...prev,
      [model.id]: {},
    }))
  }

  const closeAdjust = (modelId: number) => {
    setAdjustModelId((current) => (current === modelId ? null : current))
    setAdjustEdits((prev) => {
      const next = { ...prev }
      delete next[modelId]
      return next
    })
    setMessage(null)
  }

  const setAdjustQty = (modelId: number, colorId: number, sizeId: number, next: string) => {
    const num = next === '' ? 0 : Number.parseInt(next, 10)
    if (Number.isNaN(num) || num < 0) return
    const key = makeEditKey(colorId, sizeId)

    setAdjustEdits((prev) => {
      const modelEdits = prev[modelId] || {}
      return {
        ...prev,
        [modelId]: {
          ...modelEdits,
          [key]: num,
        },
      }
    })
  }

  const isEditingModel = (modelId: number) => adjustModelId === modelId

  const editCount =
    adjustModelId !== null ? Object.keys(adjustEdits[adjustModelId] || {}).length : 0

  const handleSaveAdjust = async (model: ModelWithRelations) => {
    const modelId = model.id
    const edits = adjustEdits[modelId] || {}
    const rowsToSave = Object.entries(edits)

    if (rowsToSave.length === 0 || !hasWarehouses) return

    const warehouseId = adjustWarehouseByModel[modelId] ?? warehouses[0]?.id
    if (!warehouseId) return

    try {
      setSubmitting(true)
      await Promise.all(
        rowsToSave.map(async ([key, value]) => {
          const [colorId, sizeId] = key.split(':').map(Number)
          const existing = getModelInventoryRow(model, colorId, sizeId, warehouseId)
          if (existing) {
            await adjustInventory(existing.id, value)
            return
          }

          await addTransaction({
            date: todayText(),
            modelId,
            sizeId,
            colorId,
            type: '재고조정',
            quantity: value,
            warehouseId,
          })
        }),
      )

      setMessage({ type: 'ok', text: `${model.name} 재고 조정이 완료되었습니다.` })
      setAdjustEdits((prev) => ({
        ...prev,
        [modelId]: {},
      }))
    } catch {
      setMessage({ type: 'error', text: '조정 중 오류가 발생했습니다.' })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="space-y-4">
      {message && (
        <Card
          variant={message.type === 'ok' ? 'muted' : 'default'}
          className={cx('overflow-hidden', message.type === 'error' && 'border-red-200')}
          role="status"
          aria-live="polite"
        >
          <CardContent className={cx('px-4 py-3 text-center text-sm', message.type === 'error' ? 'text-red-700' : 'text-slate-700')}>
            {message.text}
          </CardContent>
        </Card>
      )}

      {models.map((model) => {
        const isOpen = expanded === model.id
        const filter = getView(model.id)
        const totalQty = getTotalQty(model, 'all')
        const rowData = getInventoryByModelAndFilter(model, filter)
        const isEmptySize = model.sizes.length === 0 || model.colors.length === 0
        const adjusting = isEditingModel(model.id)
        const editWarehouseId = adjustWarehouseByModel[model.id] ?? warehouses[0]?.id
        const currentEditValues = adjustEdits[model.id] || {}

        return (
          <Card key={model.id} variant="default" className="overflow-hidden">
            <CardHeader className="px-0 py-0">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setExpanded(isOpen ? null : model.id)}
                className="flex h-auto w-full items-center justify-between rounded-none px-4 py-4 text-left transition-colors hover:bg-slate-50 md:px-6"
              >
                <span className="text-base font-semibold tracking-tight text-slate-950 md:text-lg">{model.name}</span>
                <div className="flex items-center gap-3">
                  <span className="ui-pill text-slate-700">{totalQty}개</span>
                  <span className="text-lg text-slate-400">{isOpen ? '▴' : '▾'}</span>
                </div>
              </Button>
            </CardHeader>

            {isOpen && (
              <div className="border-t border-[color:var(--border)] bg-[color:var(--surface-muted)]/60">
                <div className="flex items-center justify-between gap-2 px-4 py-3">
                  <div className="flex items-center gap-2 text-sm text-slate-600">
                    <span>창고 보기</span>
                    <InventorySelect
                      label="창고 보기"
                      value={String(filter)}
                      onValueChange={(next) => setView(model.id, next === 'all' ? 'all' : Number(next))}
                      options={[
                        { value: 'all', label: '전체' },
                        ...warehouses.map((warehouse) => ({
                          value: String(warehouse.id),
                          label: warehouse.name,
                        })),
                      ]}
                    />
                  </div>

                  <Button
                    type="button"
                    onClick={() => (adjusting ? closeAdjust(model.id) : openAdjust(model))}
                    disabled={hasWarehouses === false}
                    variant="secondary"
                    size="sm"
                    className={cx('h-9 px-3 whitespace-nowrap', hasWarehouses ? '' : 'opacity-50 cursor-not-allowed')}
                  >
                    {adjusting ? '조정 닫기' : '조정'}
                  </Button>
                </div>

                <div className="px-4 pb-3">
                  {isEmptySize ? (
                    <div className={ui.emptyState}>
                      사이즈 또는 색상 데이터가 없습니다.
                    </div>
                  ) : (
                    <div className={cx(ui.tableShell, 'overflow-x-auto scrollbar-thin')}>
                      <table className="w-full border-collapse min-w-max">
                        <thead>
                          <tr>
                            <th className="ui-table-head sticky left-0 z-10 px-3 py-2.5 text-left min-w-[100px]">
                              색상
                            </th>
                            {model.sizes.map((size) => (
                              <th key={size.id} className="ui-table-head px-3 py-2.5 text-center min-w-[60px]">
                                {size.name}
                              </th>
                            ))}
                            <th className="ui-table-head px-3 py-2.5 text-center min-w-[70px]">소계</th>
                          </tr>
                        </thead>
                          <tbody>
                            {rowData.map((row) => {
                              const rowMovement =
                                row.cells
                                  .map((cell) => getMovement(model.name, row.color.name, cell.size.name))
                                  .find(Boolean) ?? null

                              return (
                                <tr
                                  key={row.color.id}
                                  className={cx(
                                    'transition-colors hover:bg-slate-50/70',
                                    rowMovement?.type === '입고'
                                      ? 'border-l-4 border-emerald-400 bg-emerald-50/20'
                                      : rowMovement?.type === '출고'
                                        ? 'border-l-4 border-rose-400 bg-rose-50/20'
                                        : '',
                                  )}
                                >
                                  <td
                                    className={cx(
                                      'ui-table-cell sticky left-0 z-10 bg-[color:var(--surface)] text-sm text-slate-700',
                                      row.total === 0
                                        ? 'font-medium text-slate-400'
                                        : row.total <= 10
                                          ? 'font-medium text-amber-700'
                                          : 'font-medium',
                                    )}
                                  >
                                    <div className="flex items-center gap-2">
                                      <span
                                        className="inline-block h-4 w-4 flex-shrink-0 rounded-full border border-slate-200"
                                        style={{ backgroundColor: row.color.rgbCode }}
                                      />
                                      <span>{row.color.name}</span>
                                    </div>
                                  </td>
                                  {row.cells.map((cell) => {
                                    const qty = cell.quantity
                                    const movement = getMovement(model.name, row.color.name, cell.size.name)

                                    return (
                                      <td
                                        key={cell.size.id}
                                        className={cx(
                                          'ui-table-cell text-center text-base font-semibold',
                                          qty === 0 ? 'text-slate-300' : 'text-slate-900',
                                          movement?.type === '입고'
                                            ? 'bg-emerald-50/40 text-emerald-700'
                                            : movement?.type === '출고'
                                              ? 'bg-rose-50/40 text-rose-700'
                                              : '',
                                        )}
                                      >
                                        <span>{qty}</span>
                                        {movement ? (
                                          <span className="mt-0.5 block text-xs font-bold">
                                            {movement.type === '입고' ? '↗' : '↙'}
                                            {movement.quantity}
                                          </span>
                                        ) : null}
                                      </td>
                                    )
                                  })}
                                  <td
                                    className={cx(
                                      'ui-table-cell bg-slate-50 text-center text-base font-semibold text-slate-950',
                                      rowMovement?.type === '입고'
                                        ? 'bg-emerald-50/50'
                                        : rowMovement?.type === '출고'
                                          ? 'bg-rose-50/50'
                                          : '',
                                    )}
                                  >
                                    {row.total}
                                  </td>
                                </tr>
                              )
                            })}
                          </tbody>
                      </table>
                    </div>
                  )}
                </div>

                {adjusting && (
                  <div className="border-t border-[color:var(--border)] px-4 py-4">
                    <div className="mb-3 flex items-center justify-between">
                      <div>
                        <label className="text-sm text-slate-600">조정 창고</label>
                        <InventorySelect
                          label="조정 창고"
                          value={String(editWarehouseId ?? warehouses[0]?.id ?? '')}
                          className="ml-2 inline-flex"
                          onValueChange={(next) =>
                            setAdjustWarehouseByModel((prev) => ({
                              ...prev,
                              [model.id]: Number(next),
                            }))
                          }
                          options={warehouses.map((warehouse) => ({
                            value: String(warehouse.id),
                            label: warehouse.name,
                          }))}
                        />
                      </div>
                      <span className="text-xs text-slate-500">
                        {editCount > 0 ? `변경값 ${editCount}건` : '수량을 수정해 저장하세요'}
                      </span>
                    </div>

                    {isEmptySize ? null : (
                      <div className={cx(ui.tableShell, 'overflow-x-auto scrollbar-thin')}>
                        <table className="w-full border-collapse min-w-max">
                          <thead>
                            <tr>
                              <th className="ui-table-head px-3 py-2.5 text-left">색상</th>
                              {model.sizes.map((size) => (
                                <th key={size.id} className="ui-table-head px-3 py-2.5 text-center">
                                  {size.name}
                                </th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {model.colors.map((color) => {
                              const selectedWarehouse = editWarehouseId ?? warehouses[0]?.id
                              if (!selectedWarehouse) return null

                              return (
                                <tr key={color.id} className="hover:bg-slate-50/70">
                                  <td className="ui-table-cell">
                                    <div className="flex items-center gap-2">
                                      <span
                                        className="inline-block w-4 h-4 rounded-full border border-slate-200 flex-shrink-0"
                                        style={{ backgroundColor: color.rgbCode }}
                                      />
                                      {color.name}
                                    </div>
                                  </td>
                                  {model.sizes.map((size) => {
                                    const inv = getModelInventoryRow(
                                      model,
                                      color.id,
                                      size.id,
                                      selectedWarehouse,
                                    )
                                    const key = makeEditKey(color.id, size.id)
                                    const edited = currentEditValues[key]
                                    const defaultQty = inv ? inv.quantity : 0
                                    const display = edited === undefined ? defaultQty : edited
                                    return (
                                      <td key={size.id} className="ui-table-cell px-1 py-1 text-center">
                                        <Input
                                          type="number"
                                          value={display}
                                          min={0}
                                          className={cx(ui.controlSm, 'w-full text-center')}
                                          onChange={(event) =>
                                            setAdjustQty(
                                              model.id,
                                              color.id,
                                              size.id,
                                              event.target.value,
                                            )
                                          }
                                        />
                                      </td>
                                    )
                                  })}
                                </tr>
                              )
                            })}
                          </tbody>
                        </table>
                      </div>
                    )}

                    <div className="mt-3 flex items-center justify-end">
                      <Button
                        type="button"
                        onClick={() => handleSaveAdjust(model)}
                        disabled={submitting || editCount === 0}
                        className={cx('h-11 px-5 text-sm whitespace-nowrap')}
                      >
                        {submitting ? '저장 중...' : '조정 저장'}
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </Card>
        )
      })}
    </div>
  )
}

'use client'

import { useEffect, useId, useRef, useState, useTransition, type FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import { cx, ui } from '../../components/ui'
import {
  createModelColor,
  createModelSize,
  createModelsWithSpecs,
  createWarehouse,
  deleteModel,
  deleteModelColor,
  deleteModelSize,
  deleteWarehouse,
} from '@/lib/actions'

type ModelType = {
  id: number
  name: string
  sizes: Array<{ id: number; name: string }>
  colors: Array<{ id: number; name: string; rgbCode: string; textWhite: boolean }>
}

type WarehouseLookup = {
  id: number
  name: string
}

type WarehouseStat = WarehouseLookup & {
  stockQty: number
}

type MasterDataManagerProps = {
  models: ModelType[]
  warehouses: WarehouseLookup[]
  warehouseStats?: WarehouseStat[]
}

type ProductDraft = {
  id: string
  modelName: string
  sizeText: string
  colorText: string
}

type ColorSpec = {
  name: string
  rgbCode: string
  textWhite: boolean
}

function splitList(value: string) {
  return value
    .split(/[\n,]/)
    .map((entry) => entry.trim())
    .filter(Boolean)
}

function parseColorText(value: string) {
  const raw = splitList(value)
  const colors: ColorSpec[] = []
  const invalid: string[] = []

  for (const item of raw) {
    const parts = item.split('|').map((part) => part.trim()).filter(Boolean)
    const name = parts[0] ?? ''
    if (!name) continue

    let rgbCode = '#000000'
    let textWhite = false

    if (parts[1]) {
      const rawColor = parts[1].replace(/\s/g, '')
      const normalized = rawColor.startsWith('#') ? rawColor : `#${rawColor}`
      if (/^#[0-9A-Fa-f]{6}$/.test(normalized)) {
        rgbCode = normalized
      } else {
        invalid.push(item)
      }
    }

    if (parts[2]) {
      textWhite = parts[2].toLowerCase() === 'w' || parts[2] === 'white'
    }

    colors.push({ name, rgbCode, textWhite })
  }

  return { colors, invalid }
}

export default function MasterDataManager({
  models: initialModels,
  warehouses: initialWarehouses,
  warehouseStats = [],
}: MasterDataManagerProps) {
  const draftId = useId()
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  const [activeTab, setActiveTab] = useState<'warehouse' | 'product'>('warehouse')

  const [warehouseName, setWarehouseName] = useState('')
  const [isWarehouseModalOpen, setIsWarehouseModalOpen] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<{ id: number; name: string } | null>(null)
  const [productDrafts, setProductDrafts] = useState<ProductDraft[]>([
    { id: `${draftId}-draft`, modelName: '', sizeText: '', colorText: '' },
  ])
  const [selectedModelId, setSelectedModelId] = useState<number | ''>('')

  const [sizeName, setSizeName] = useState('')
  const [colorName, setColorName] = useState('')
  const [colorRgbCode, setColorRgbCode] = useState('#000000')
  const [textWhite, setTextWhite] = useState(false)
  const warehouseNameRef = useRef<HTMLInputElement>(null)

  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const selectedModel = initialModels.find((model) => model.id === selectedModelId) ?? null

  const showToast = (next: { type: 'success' | 'error'; text: string }) => {
    setMessage(next)
    setTimeout(() => setMessage(null), 2500)
  }

  useEffect(() => {
    if (isWarehouseModalOpen) {
      warehouseNameRef.current?.focus()
    }
  }, [isWarehouseModalOpen])

  const clearMessage = () => {
    setMessage(null)
  }

  const runWithToast = (
    task: () => Promise<void>,
    successText: string,
    onSuccess?: () => void,
  ) => {
    startTransition(async () => {
      try {
        await task()
        onSuccess?.()
        router.refresh()
        showToast({ type: 'success', text: successText })
      } catch (error) {
        showToast({ type: 'error', text: error instanceof Error ? error.message : '처리에 실패했습니다.' })
      }
    })
  }

  const openWarehouseModal = () => {
    setWarehouseName('')
    setIsWarehouseModalOpen(true)
  }

  const closeWarehouseModal = () => {
    setIsWarehouseModalOpen(false)
  }

  const submitWarehouse = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!warehouseName.trim()) return
    clearMessage()
    runWithToast(async () => {
      await createWarehouse(warehouseName)
      setWarehouseName('')
    }, '창고가 등록되었습니다.', closeWarehouseModal)
  }

  const requestDeleteWarehouse = (warehouseId: number, warehouseName: string) => {
    setDeleteTarget({ id: warehouseId, name: warehouseName })
  }

  const confirmDeleteWarehouse = () => {
    if (!deleteTarget) return
    const targetName = deleteTarget.name

    runWithToast(async () => {
      await deleteWarehouse(deleteTarget.id)
    }, `${targetName} 창고가 삭제되었습니다.`, () => setDeleteTarget(null))
  }

  const cancelDeleteWarehouse = () => {
    setDeleteTarget(null)
  }

  const removeModel = (modelId: number) => {
    runWithToast(async () => {
      await deleteModel(modelId)
      if (selectedModelId === modelId) {
        setSelectedModelId('')
      }
    }, '모델이 삭제되었습니다.')
  }

  const removeSize = (sizeId: number) => {
    runWithToast(async () => {
      await deleteModelSize(sizeId)
    }, '사이즈가 삭제되었습니다.')
  }

  const removeColor = (colorId: number) => {
    runWithToast(async () => {
      await deleteModelColor(colorId)
    }, '색상이 삭제되었습니다.')
  }

  const addProductDraft = () => {
    setProductDrafts((prev) => [
      ...prev,
      { id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`, modelName: '', sizeText: '', colorText: '' },
    ])
  }

  const removeProductDraft = (id: string) => {
    setProductDrafts((prev) =>
      prev.length <= 1 ? prev : prev.filter((draft) => draft.id !== id),
    )
  }

  const updateProductDraft = (id: string, patch: Partial<ProductDraft>) => {
    setProductDrafts((prev) => prev.map((draft) => (draft.id === id ? { ...draft, ...patch } : draft)))
  }

  const submitProductBatch = () => {
    clearMessage()
    const normalizedDrafts = productDrafts
      .map((draft) => {
        const sizes = splitList(draft.sizeText)
        const parsedColors = parseColorText(draft.colorText)
        return {
          name: draft.modelName.trim(),
          sizes,
          colors: parsedColors.colors,
          invalid: parsedColors.invalid,
        }
      })
      .filter((draft) => draft.name.length > 0)

    if (normalizedDrafts.length === 0) return

    const invalid = normalizedDrafts.flatMap((draft) => draft.invalid)
    if (invalid.length > 0) {
      showToast({ type: 'error', text: `색상 코드 형식이 올바르지 않습니다: ${invalid.join(', ')}` })
      return
    }

    runWithToast(
      async () => {
        await createModelsWithSpecs(
          normalizedDrafts.map((draft) => ({
            name: draft.name,
            sizes: draft.sizes,
            colors: draft.colors,
          })),
        )
        setProductDrafts([{ id: `${Date.now()}-draft`, modelName: '', sizeText: '', colorText: '' }])
      },
      `${normalizedDrafts.length}개 모델이 등록되었습니다.`,
    )
  }

  const submitSize = () => {
    if (!selectedModelId || !sizeName.trim()) return
    const nextModelId = selectedModelId
    runWithToast(async () => {
      await createModelSize(nextModelId, sizeName)
      setSizeName('')
    }, '사이즈가 등록되었습니다.')
  }

  const submitColor = () => {
    if (!selectedModelId || !colorName.trim()) return
    const nextModelId = selectedModelId
    runWithToast(async () => {
      await createModelColor(nextModelId, colorName, {
        rgbCode: colorRgbCode,
        textWhite,
      })
      setColorName('')
      setColorRgbCode('#000000')
      setTextWhite(false)
    }, '색상이 등록되었습니다.')
  }

  const warehouseCards = initialWarehouses.map((warehouse) => {
    const stat = warehouseStats.find((item) => item.id === warehouse.id)

    return {
      warehouse,
      stockQty: stat?.stockQty ?? 0,
    }
  })
  const warehouseCount = warehouseCards.length
  const totalWarehouseStock = warehouseCards.reduce((sum, item) => sum + item.stockQty, 0)

  return (
    <div className="space-y-4">
      {message && (
        <div
          className={cx(
            'rounded-xl border px-4 py-3 text-sm font-medium',
            message.type === 'success'
              ? 'border-slate-200 bg-slate-50 text-slate-700'
              : 'border-red-200 bg-red-50 text-red-700',
          )}
          role="status"
          aria-live="polite"
        >
          {message.text}
        </div>
      )}

      <div className={cx(ui.panel, ui.panelBody)}>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setActiveTab('warehouse')}
            className={cx(ui.tab, activeTab === 'warehouse' ? ui.tabActive : '', 'whitespace-nowrap')}
          >
            창고 관리
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('product')}
            className={cx(ui.tab, activeTab === 'product' ? ui.tabActive : '', 'whitespace-nowrap')}
          >
            상품 관리
          </button>
        </div>
      </div>

      {activeTab === 'warehouse' ? (
        <div className={ui.panel}>
          <div className={cx(ui.panelHeader, 'flex flex-wrap items-start justify-between gap-2')}>
            <div>
              <p className={ui.label}>등록된 창고</p>
              <div className="mt-1 flex flex-wrap gap-2">
                <span className="ui-pill ui-pill-muted whitespace-nowrap">창고 {warehouseCount}개</span>
                <span className="ui-pill ui-pill-muted whitespace-nowrap">총 재고 {totalWarehouseStock.toLocaleString()}개</span>
              </div>
            </div>
            <button
              type="button"
              onClick={openWarehouseModal}
              className={cx(ui.buttonPrimary, 'h-10 px-4 whitespace-nowrap')}
            >
              창고 등록
            </button>
          </div>

          <div className="mt-4">
            <div className={cx(ui.tableShell, 'overflow-visible')}>
              <div className="grid grid-cols-[minmax(0,2fr)_minmax(0,1fr)_minmax(0,100px)] border-b border-slate-200 bg-slate-50 px-4 py-3 text-[11px] font-semibold tracking-[0.16em] text-slate-500 uppercase">
                <div>창고명</div>
                <div className="text-right">재고</div>
                <div className="text-right">작업</div>
              </div>

              {warehouseCards.length === 0 ? (
                <div className="px-4 py-8 text-sm text-slate-500">등록된 창고가 없습니다.</div>
              ) : (
                warehouseCards.map(({ warehouse, stockQty }) => (
                  <div
                    key={warehouse.id}
                    className="grid grid-cols-[minmax(0,2fr)_minmax(0,1fr)_minmax(0,100px)] border-b border-slate-200 bg-white px-4 py-3"
                  >
                    <div className="flex items-center gap-2 text-sm text-slate-900">
                      <p>{warehouse.name}</p>
                    </div>
                    <div className="text-right text-sm font-semibold text-slate-900">{stockQty.toLocaleString()}개</div>
                    <div className="text-right">
                      <button
                        type="button"
                        onClick={() => requestDeleteWarehouse(warehouse.id, warehouse.name)}
                        className={cx(ui.buttonGhost, 'h-8 px-2 text-xs')}
                        aria-label={`${warehouse.name} 삭제`}
                      >
                        삭제
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <div className={cx(ui.panel, ui.panelBody)}>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className={ui.label}>상품 일괄 등록</p>
                <p className="mt-1 text-sm text-slate-500">
                  모델 1개당 1줄씩 작성하고 쉼표 또는 줄바꿈으로 사이즈와 색상을 등록할 수 있습니다.
                </p>
                <p className="mt-1 text-xs text-slate-400">
                  색상 형식: <code className="rounded bg-slate-100 px-1 py-0.5">색상명|HEX|W</code> (HEX/모든 옵션은 생략 가능)
                </p>
                <div className="mt-2 flex flex-wrap gap-2">
                  <span className="ui-pill ui-pill-muted whitespace-nowrap">{productDrafts.length}개 초안</span>
                  <span className="ui-pill ui-pill-muted whitespace-nowrap">사이즈는 쉼표/줄바꿈 지원</span>
                  <span className="ui-pill ui-pill-muted whitespace-nowrap">색상은 이름|HEX|W</span>
                </div>
              </div>
              <button
                type="button"
                onClick={addProductDraft}
                className={cx(ui.buttonSecondary, 'h-9 px-3 whitespace-nowrap')}
              >
                모델 행 추가
              </button>
            </div>

            <div className="mt-4 space-y-3">
              {productDrafts.map((draft, index) => {
                const sizeCount = splitList(draft.sizeText).length
                const colorCount = parseColorText(draft.colorText).colors.length

                return (
                  <div key={draft.id} className="rounded-2xl border border-slate-200 p-3">
                    <div className="mb-3 flex items-center justify-between gap-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-sm font-semibold text-slate-900">모델 #{index + 1}</p>
                        <span className="ui-pill ui-pill-muted whitespace-nowrap">{sizeCount}개 사이즈</span>
                        <span className="ui-pill ui-pill-muted whitespace-nowrap">{colorCount}개 색상</span>
                      </div>
                      <button
                        type="button"
                        className={cx(ui.buttonSecondary, 'h-8 px-2 text-sm whitespace-nowrap')}
                        onClick={() => removeProductDraft(draft.id)}
                        disabled={productDrafts.length <= 1}
                      >
                        행 삭제
                      </button>
                    </div>
                    <div className="space-y-3">
                      <input
                        value={draft.modelName}
                        onChange={(e) =>
                          updateProductDraft(draft.id, {
                            modelName: e.target.value,
                          })
                        }
                        placeholder="예: 블루종 베스트"
                        className={ui.control}
                      />
                      <div className="grid gap-3 md:grid-cols-2">
                        <div>
                          <label className={ui.label}>사이즈</label>
                          <textarea
                            rows={3}
                            value={draft.sizeText}
                            onChange={(e) =>
                              updateProductDraft(draft.id, {
                                sizeText: e.target.value,
                              })
                            }
                            placeholder="예: 230, 240, 250"
                            className={ui.control}
                          />
                        </div>
                        <div>
                          <label className={ui.label}>색상</label>
                          <textarea
                            rows={3}
                            value={draft.colorText}
                            onChange={(e) =>
                              updateProductDraft(draft.id, {
                                colorText: e.target.value,
                              })
                            }
                            placeholder="예: 블랙|#000000|W, 화이트|#FFFFFF"
                            className={ui.control}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>

            <div className="mt-4 flex items-center gap-2">
              <button
                type="button"
                onClick={submitProductBatch}
                disabled={isPending}
                className={cx(ui.buttonPrimary, 'h-11 px-4 whitespace-nowrap')}
              >
                모델 일괄 등록
              </button>
              <button
                type="button"
                onClick={() => setProductDrafts([{ id: `${Date.now()}-draft`, modelName: '', sizeText: '', colorText: '' }])}
                className={cx(ui.buttonSecondary, 'h-11 px-4 whitespace-nowrap')}
              >
                전체 초기화
              </button>
            </div>
          </div>

          <div className={cx(ui.panel, ui.panelBody)}>
            <label htmlFor="selected-model" className={ui.label}>
              모델 선택
            </label>
            <select
              id="selected-model"
              aria-label="모델 선택"
              value={selectedModelId}
              onChange={(e) => setSelectedModelId(e.target.value ? Number(e.target.value) : '')}
              className={ui.controlSm}
            >
              <option value="">모델 선택</option>
              {initialModels.map((model) => (
                <option key={model.id} value={model.id}>
                  {model.name}
                </option>
              ))}
            </select>

            {!selectedModel ? (
              <p className="mt-3 text-sm text-slate-500">모델을 먼저 선택하면 사이즈/색상 항목을 추가하거나 삭제할 수 있습니다.</p>
            ) : (
              <div className="mt-4 space-y-4">
                <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-slate-900">{selectedModel.name}</p>
                      <p className="text-sm text-slate-500">사이즈와 색상을 추가하거나 정리할 수 있습니다.</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeModel(selectedModel.id)}
                      className={cx(ui.buttonSecondary, 'px-4 py-2 text-sm whitespace-nowrap')}
                      aria-label={`${selectedModel.name} 삭제`}
                    >
                      모델 삭제
                    </button>
                  </div>
                </div>

                <div>
                  <label htmlFor="size-name" className={ui.label}>
                    사이즈
                  </label>
                  <div className="mt-2 flex gap-2">
                    <input
                      id="size-name"
                      value={sizeName}
                      onChange={(e) => setSizeName(e.target.value)}
                      placeholder="예: S"
                      className={ui.controlSm}
                    />
                    <button
                      type="button"
                      disabled={isPending || !sizeName.trim()}
                      onClick={submitSize}
                      className={cx(ui.buttonSecondary, 'h-11 px-4 whitespace-nowrap')}
                    >
                      저장
                    </button>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {selectedModel.sizes.length === 0 ? (
                      <p className="text-sm text-slate-500">사이즈가 없습니다.</p>
                    ) : (
                      selectedModel.sizes.map((size) => (
                        <div
                          key={size.id}
                          className="inline-flex items-center gap-2 rounded-full border border-slate-200 px-3 py-1 text-sm text-slate-600"
                        >
                          <span>{size.name}</span>
                          <button
                            type="button"
                            onClick={() => removeSize(size.id)}
                            className="text-slate-400 hover:text-slate-900"
                            aria-label={`${size.name} 삭제`}
                          >
                            ×
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                <div>
                  <label htmlFor="color-name" className={ui.label}>
                    색상
                  </label>
                  <div className="mt-2 grid grid-cols-1 gap-2 md:grid-cols-2">
                    <input
                      id="color-name"
                      value={colorName}
                      onChange={(e) => setColorName(e.target.value)}
                      placeholder="예: 다크블루"
                      className={ui.control}
                    />
                    <input
                      value={colorRgbCode}
                      onChange={(e) => setColorRgbCode(e.target.value)}
                      placeholder="#000000"
                      className={ui.control}
                    />
                  </div>
                  <label className="mt-2 inline-flex items-center gap-2 text-sm text-slate-600">
                    <input
                      type="checkbox"
                      checked={textWhite}
                      onChange={(e) => setTextWhite(e.target.checked)}
                    />
                    텍스트 화이트
                  </label>
                  <div className="mt-2 flex gap-2">
                    <button
                      type="button"
                      disabled={isPending || !colorName.trim()}
                      onClick={submitColor}
                      className={cx(ui.buttonSecondary, 'h-11 px-4 whitespace-nowrap')}
                    >
                      저장
                    </button>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {selectedModel.colors.length === 0 ? (
                      <p className="text-sm text-slate-500">색상이 없습니다.</p>
                    ) : (
                      selectedModel.colors.map((color) => (
                        <div
                          key={color.id}
                          className="inline-flex items-center gap-1 rounded-full border border-slate-200 px-3 py-1 text-sm text-slate-600"
                        >
                          <span
                            className="h-2.5 w-2.5 rounded-full border border-slate-300"
                            style={{ backgroundColor: color.rgbCode }}
                          />
                          <span>{color.name}</span>
                          <button
                            type="button"
                            onClick={() => removeColor(color.id)}
                            className="text-slate-400 hover:text-slate-900"
                            aria-label={`${color.name} 삭제`}
                          >
                            ×
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
      {isWarehouseModalOpen ? (
        <div
          className="fixed inset-0 z-40 flex items-center justify-center bg-slate-900/55 p-4"
          onClick={closeWarehouseModal}
          role="presentation"
        >
          <div
            className={cx(ui.panel, 'w-full max-w-md')}
            role="dialog"
            aria-modal="true"
            aria-labelledby="warehouse-add-title"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="px-5 py-4">
              <h2 id="warehouse-add-title" className="text-lg font-semibold text-slate-950">
                창고 등록
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                창고명을 입력해 저장 후 재고/입출고 집계에 포함됩니다.
              </p>
            </div>
            <form onSubmit={submitWarehouse} className="border-t border-slate-200 px-5 py-4">
              <label htmlFor="warehouse-name-modal" className={ui.label}>
                창고 이름
              </label>
              <input
                id="warehouse-name-modal"
                ref={warehouseNameRef}
                value={warehouseName}
                onChange={(event) => setWarehouseName(event.target.value)}
                placeholder="예: 대전 2센터 A구역"
                className={ui.control}
              />

              <div className="mt-4 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={closeWarehouseModal}
                  className={cx(ui.buttonSecondary, 'h-10 px-3 whitespace-nowrap')}
                >
                  취소
                </button>
                <button
                  type="submit"
                  disabled={isPending || !warehouseName.trim()}
                  className={cx(ui.buttonPrimary, 'h-10 px-3 whitespace-nowrap')}
                >
                  등록
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      {deleteTarget ? (
        <div
          className="fixed inset-0 z-40 flex items-center justify-center bg-slate-900/55 p-4"
          onClick={cancelDeleteWarehouse}
          role="presentation"
        >
          <div
            className={cx(ui.panel, 'w-full max-w-sm')}
            role="dialog"
            aria-modal="true"
            aria-labelledby="warehouse-delete-title"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="px-5 py-4">
              <h2 id="warehouse-delete-title" className="text-lg font-semibold text-slate-950">
                창고 삭제 확인
              </h2>
              <p className="mt-2 text-sm text-slate-600">
                {`"${deleteTarget.name}" 창고를 정말 삭제할까요?`}
              </p>
              <p className="mt-2 text-xs text-slate-500">삭제 시 현재 입출고 내역은 보존되며, 창고 자체 데이터만 제거됩니다.</p>
              <div className="mt-4 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={cancelDeleteWarehouse}
                  className={cx(ui.buttonSecondary, 'h-10 px-3 whitespace-nowrap')}
                >
                  취소
                </button>
                <button
                  type="button"
                  onClick={confirmDeleteWarehouse}
                  disabled={isPending}
                  className={cx(ui.buttonPrimary, 'h-10 px-3 whitespace-nowrap')}
                >
                  삭제
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}

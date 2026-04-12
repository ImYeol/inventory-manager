'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { cx, ui } from '../../components/ui'
import { createModel, createModelColor, createModelSize, createWarehouse } from '@/lib/actions'

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

type MasterDataManagerProps = {
  models: ModelType[]
  warehouses: WarehouseLookup[]
}

export default function MasterDataManager({ models: initialModels, warehouses: initialWarehouses }: MasterDataManagerProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  const [activeTab, setActiveTab] = useState<'warehouse' | 'product'>('warehouse')

  const [warehouseName, setWarehouseName] = useState('')
  const [modelName, setModelName] = useState('')
  const [selectedModelId, setSelectedModelId] = useState<number | ''>('')

  const [sizeName, setSizeName] = useState('')
  const [colorName, setColorName] = useState('')
  const [colorRgbCode, setColorRgbCode] = useState('#000000')
  const [textWhite, setTextWhite] = useState(false)

  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const selectedModel = initialModels.find((model) => model.id === selectedModelId) ?? null

  const showToast = (next: { type: 'success' | 'error'; text: string }) => {
    setMessage(next)
    setTimeout(() => setMessage(null), 2500)
  }

  const clearMessage = () => {
    setMessage(null)
  }

  const submitWarehouse = () => {
    if (!warehouseName.trim()) return
    startTransition(async () => {
      try {
        await createWarehouse(warehouseName)
        setWarehouseName('')
        router.refresh()
        clearMessage()
        showToast({ type: 'success', text: '창고가 등록되었습니다.' })
      } catch (error) {
        showToast({ type: 'error', text: error instanceof Error ? error.message : '등록에 실패했습니다.' })
      }
    })
  }

  const submitModel = () => {
    if (!modelName.trim()) return
    startTransition(async () => {
      try {
        await createModel(modelName)
        setModelName('')
        router.refresh()
        showToast({ type: 'success', text: '모델이 등록되었습니다.' })
      } catch (error) {
        showToast({ type: 'error', text: error instanceof Error ? error.message : '등록에 실패했습니다.' })
      }
    })
  }

  const submitSize = () => {
    if (!selectedModelId || !sizeName.trim()) return
    const nextModelId = selectedModelId
    startTransition(async () => {
      try {
        await createModelSize(nextModelId, sizeName)
        setSizeName('')
        router.refresh()
        showToast({ type: 'success', text: '사이즈가 등록되었습니다.' })
      } catch (error) {
        showToast({ type: 'error', text: error instanceof Error ? error.message : '등록에 실패했습니다.' })
      }
    })
  }

  const submitColor = () => {
    if (!selectedModelId || !colorName.trim()) return
    const nextModelId = selectedModelId
    startTransition(async () => {
      try {
        await createModelColor(nextModelId, colorName, {
          rgbCode: colorRgbCode,
          textWhite,
        })
        setColorName('')
        setColorRgbCode('#000000')
        setTextWhite(false)
        router.refresh()
        showToast({ type: 'success', text: '색상이 등록되었습니다.' })
      } catch (error) {
        showToast({ type: 'error', text: error instanceof Error ? error.message : '등록에 실패했습니다.' })
      }
    })
  }

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
        >
          {message.text}
        </div>
      )}

      <div className={cx(ui.panel, ui.panelBody)}>
        <div className="flex items-center gap-2">
          <button type="button" onClick={() => setActiveTab('warehouse')} className={cx(ui.tab, activeTab === 'warehouse' ? ui.tabActive : '')}>
            창고 관리
          </button>
          <button type="button" onClick={() => setActiveTab('product')} className={cx(ui.tab, activeTab === 'product' ? ui.tabActive : '')}>
            상품 관리
          </button>
        </div>
      </div>

      {activeTab === 'warehouse' ? (
        <div className="grid gap-4 md:grid-cols-2">
          <div className={cx(ui.panel, ui.panelBody)}>
            <label className={ui.label}>창고 등록</label>
            <div className="mt-2 flex gap-2">
              <input
                value={warehouseName}
                onChange={(e) => setWarehouseName(e.target.value)}
                placeholder="예: 본사 창고"
                className={ui.controlSm}
              />
              <button
                type="button"
                disabled={isPending || !warehouseName.trim()}
                onClick={submitWarehouse}
                className={cx(ui.buttonPrimary, 'h-11 px-4')}
              >
                저장
              </button>
            </div>
          </div>

          <div className={cx(ui.panel, ui.panelBody)}>
            <label className={ui.label}>등록된 창고</label>
            <div className="mt-2 flex flex-wrap gap-2">
              {initialWarehouses.length === 0 ? (
                <p className="text-sm text-slate-500">등록된 창고가 없습니다.</p>
              ) : (
                initialWarehouses.map((warehouse) => (
                  <span
                    key={warehouse.id}
                    className="rounded-full border border-slate-200 px-3 py-1 text-sm text-slate-600"
                  >
                    {warehouse.name}
                  </span>
                ))
              )}
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <div className={cx(ui.panel, ui.panelBody)}>
            <label className={ui.label}>모델 등록</label>
            <div className="mt-2 flex gap-2">
              <input
                value={modelName}
                onChange={(e) => setModelName(e.target.value)}
                placeholder="예: 블루종 베스트"
                className={ui.controlSm}
              />
              <button
                type="button"
                disabled={isPending || !modelName.trim()}
                onClick={submitModel}
                className={cx(ui.buttonPrimary, 'h-11 px-4')}
              >
                모델 저장
              </button>
            </div>
          </div>

          <div className={cx(ui.panel, ui.panelBody)}>
            <label className={ui.label}>모델 선택</label>
            <select
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
              <p className="mt-3 text-sm text-slate-500">모델을 먼저 선택하면 사이즈/색상 항목을 추가할 수 있습니다.</p>
            ) : (
              <div className="mt-4 space-y-4">
                <div>
                  <label className={ui.label}>사이즈</label>
                  <div className="mt-2 flex gap-2">
                    <input
                      value={sizeName}
                      onChange={(e) => setSizeName(e.target.value)}
                      placeholder="예: S"
                      className={ui.controlSm}
                    />
                    <button
                      type="button"
                      disabled={isPending || !sizeName.trim()}
                      onClick={submitSize}
                      className={cx(ui.buttonSecondary, 'h-11 px-4')}
                    >
                      저장
                    </button>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {selectedModel.sizes.length === 0 ? (
                      <p className="text-sm text-slate-500">사이즈가 없습니다.</p>
                    ) : (
                      selectedModel.sizes.map((size) => (
                        <span key={size.id} className="rounded-full border border-slate-200 px-3 py-1 text-sm text-slate-600">
                          {size.name}
                        </span>
                      ))
                    )}
                  </div>
                </div>

                <div>
                  <label className={ui.label}>색상</label>
                  <div className="mt-2 grid grid-cols-1 gap-2 md:grid-cols-2">
                    <input
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
                      className={cx(ui.buttonSecondary, 'h-11 px-4')}
                    >
                      저장
                    </button>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {selectedModel.colors.length === 0 ? (
                      <p className="text-sm text-slate-500">색상이 없습니다.</p>
                    ) : (
                      selectedModel.colors.map((color) => (
                        <span
                          key={color.id}
                          className="inline-flex items-center gap-1 rounded-full border border-slate-200 px-3 py-1 text-sm text-slate-600"
                        >
                          <span
                            className="h-2.5 w-2.5 rounded-full border border-slate-300"
                            style={{ backgroundColor: color.rgbCode }}
                          />
                          {color.name}
                        </span>
                      ))
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

'use client'

import { useEffect, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { createModel, createModelColor, createModelSize, createWarehouse } from '@/lib/actions'
import { cx, ui } from '../../components/ui'
import { type SetupProgress } from '@/lib/data'

type SizeType = {
  id: number
  name: string
  sortOrder: number
  modelId: number
}

type ColorType = {
  id: number
  name: string
  rgbCode: string
  textWhite: boolean
  sortOrder: number
  modelId: number
}

type InventoryItem = {
  id: number
  modelId: number
  sizeId: number
  colorId: number
  warehouseId: number
  warehouseName: string
  quantity: number
}

type ModelType = {
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

type SetupWizardProps = {
  models: ModelType[]
  warehouses: WarehouseLookup[]
  setupState: SetupProgress
}

type Step = 1 | 2 | 3 | 4

function getStepByState(hasWarehouse: boolean, hasModel: boolean, allModelsHaveSpec: boolean): Step {
  if (hasWarehouse && hasModel && allModelsHaveSpec) return 4
  if (hasModel) return 3
  if (hasWarehouse) return 2
  return 1
}

export default function SetupWizard({ models, warehouses, setupState }: SetupWizardProps) {
  const router = useRouter()
  const [step, setStep] = useState<Step>(getStepByState(setupState.hasWarehouse, setupState.hasModel, setupState.allModelsHaveSpec))
  const [message, setMessage] = useState<{ type: 'ok' | 'error'; text: string } | null>(null)
  const [isPending, startTransition] = useTransition()

  const [warehouseName, setWarehouseName] = useState('')
  const [modelName, setModelName] = useState('')
  const [selectedModelId, setSelectedModelId] = useState<number | ''>(models[0]?.id ?? '')
  const [sizeName, setSizeName] = useState('')
  const [colorName, setColorName] = useState('')
  const [colorRgbCode, setColorRgbCode] = useState('#000000')
  const [textWhite, setTextWhite] = useState(false)

  useEffect(() => {
    const nextStep = getStepByState(warehouses.length > 0, models.length > 0, allModelsHaveSpec())
    setStep((current) => {
      if (current === 4 && !nextStep) return 4
      if (current > nextStep) return current
      return nextStep
    })
  }, [models, warehouses, setupState.allModelsHaveSpec])

  useEffect(() => {
    if (!models.some((model) => model.id === selectedModelId)) {
      setSelectedModelId(models[0]?.id ?? '')
    }
  }, [models, selectedModelId])

  const allModelsHaveSpec = () =>
    models.length > 0 &&
    models.every((model) => model.sizes.length > 0 && model.colors.length > 0)

  const canFinishSetup = warehouses.length > 0 && models.length > 0 && allModelsHaveSpec()

  const showToast = (next: { type: 'ok' | 'error'; text: string }) => {
    setMessage(next)
    setTimeout(() => setMessage(null), 2500)
  }

  const submitWarehouse = () => {
    if (!warehouseName.trim()) return
    startTransition(async () => {
      try {
        await createWarehouse(warehouseName)
        setWarehouseName('')
        showToast({ type: 'ok', text: '창고가 등록되었습니다.' })
        router.refresh()
      } catch (error) {
        showToast({
          type: 'error',
          text: error instanceof Error ? error.message : '창고 등록에 실패했습니다.',
        })
      }
    })
  }

  const submitModel = () => {
    if (!modelName.trim()) return
    startTransition(async () => {
      try {
        await createModel(modelName)
        setModelName('')
        showToast({ type: 'ok', text: '모델이 등록되었습니다.' })
        router.refresh()
      } catch (error) {
        showToast({
          type: 'error',
          text: error instanceof Error ? error.message : '모델 등록에 실패했습니다.',
        })
      }
    })
  }

  const submitSize = () => {
    if (!selectedModelId || !sizeName.trim()) return
    const modelId = selectedModelId
    startTransition(async () => {
      try {
        await createModelSize(modelId, sizeName)
        setSizeName('')
        showToast({ type: 'ok', text: '사이즈가 등록되었습니다.' })
        router.refresh()
      } catch (error) {
        showToast({
          type: 'error',
          text: error instanceof Error ? error.message : '사이즈 등록에 실패했습니다.',
        })
      }
    })
  }

  const submitColor = () => {
    if (!selectedModelId || !colorName.trim()) return
    const modelId = selectedModelId
    startTransition(async () => {
      try {
        await createModelColor(modelId, colorName, {
          rgbCode: colorRgbCode,
          textWhite,
        })
        setColorName('')
        setColorRgbCode('#000000')
        setTextWhite(false)
        showToast({ type: 'ok', text: '색상이 등록되었습니다.' })
        router.refresh()
      } catch (error) {
        showToast({
          type: 'error',
          text: error instanceof Error ? error.message : '색상 등록에 실패했습니다.',
        })
      }
    })
  }

  const selectedModel = models.find((model) => model.id === selectedModelId) ?? null

  return (
    <div className="space-y-4">
      {message && (
        <div
          className={cx(
            'rounded-xl border px-4 py-3 text-sm font-medium',
            message.type === 'ok'
              ? 'border-slate-200 bg-slate-50 text-slate-700'
              : 'border-red-200 bg-red-50 text-red-700',
          )}
        >
          {message.text}
        </div>
      )}

      <div className={ui.panel}>
        <div className="flex gap-2 px-4 py-3 flex-wrap">
          <button
            type="button"
            onClick={() => setStep(1)}
            className={cx(ui.tab, step === 1 ? ui.tabActive : '')}
          >
            1. 창고 등록
          </button>
          <button
            type="button"
            onClick={() => setStep(2)}
            className={cx(ui.tab, step === 2 ? ui.tabActive : '')}
          >
            2. 모델 등록
          </button>
          <button
            type="button"
            onClick={() => setStep(3)}
            className={cx(ui.tab, step === 3 ? ui.tabActive : '')}
          >
            3. 사이즈/색상 등록
          </button>
          <button
            type="button"
            onClick={() => canFinishSetup && setStep(4)}
            disabled={!canFinishSetup}
            className={cx(ui.tab, step === 4 ? ui.tabActive : '', !canFinishSetup ? 'pointer-events-none opacity-50' : '')}
          >
            4. 완료
          </button>
        </div>
      </div>

      {step === 1 && (
        <div className="grid gap-4 md:grid-cols-2">
          <div className={cx(ui.panel, ui.panelBody)}>
            <label className={ui.label}>창고 등록</label>
            <div className="mt-2 flex gap-2">
              <input
                value={warehouseName}
                onChange={(event) => setWarehouseName(event.target.value)}
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
            {warehouses.length === 0 ? (
              <p className="mt-2 text-sm text-slate-500">등록된 창고가 없습니다.</p>
            ) : (
              <div className="mt-2 flex flex-wrap gap-2">
                {warehouses.map((warehouse) => (
                  <span
                    key={warehouse.id}
                    className="rounded-full border border-slate-200 px-3 py-1 text-sm text-slate-600"
                  >
                    {warehouse.name}
                  </span>
                ))}
              </div>
            )}
            <div className="mt-3">
              <button
                type="button"
                onClick={() => setStep(2)}
                disabled={warehouses.length === 0}
                className={cx(ui.buttonSecondary, 'text-sm', warehouses.length === 0 ? 'opacity-50' : '')}
              >
                다음: 모델 등록
              </button>
            </div>
          </div>
        </div>
      )}

      {step === 2 && (
        <div className={ui.panel}>
          <div className="px-4 py-4">
            <label className={ui.label}>모델 등록</label>
            <div className="mt-2 flex gap-2">
              <input
                value={modelName}
                onChange={(event) => setModelName(event.target.value)}
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

            {models.length > 0 ? (
              <div className="mt-3">
                <p className="text-sm text-slate-500">
                  현재 등록된 모델 {models.length}개
                </p>
              </div>
            ) : (
              <p className="mt-2 text-sm text-slate-500">모델이 없습니다.</p>
            )}

            <div className="mt-4">
              <button
                type="button"
                onClick={() => setStep(3)}
                disabled={models.length === 0}
                className={cx(ui.buttonSecondary, 'text-sm', models.length === 0 ? 'opacity-50' : '')}
              >
                다음: 사이즈/색상 등록
              </button>
            </div>
          </div>
        </div>
      )}

      {step === 3 && (
        <div className={cx(ui.panel, ui.panelBody)}>
          <div className="mb-2 flex items-center justify-between">
            <label className={ui.label}>모델 선택</label>
            <span className="text-sm text-slate-500">
              모든 모델이 사이즈/색상까지 등록되어야 완료됩니다.
            </span>
          </div>
          <select
            value={selectedModelId}
            onChange={(event) =>
              setSelectedModelId(event.target.value ? Number(event.target.value) : '')
            }
            className={ui.controlSm}
          >
            <option value="">모델 선택</option>
            {models.map((model) => {
              const incomplete = model.sizes.length === 0 || model.colors.length === 0
              return (
                <option key={model.id} value={model.id}>
                  {model.name} {incomplete ? '(미완료)' : ''}
                </option>
              )
            })}
          </select>

          {!selectedModel ? (
            <p className="mt-2 text-sm text-slate-500">모델을 먼저 선택하세요.</p>
          ) : (
            <div className="mt-4 space-y-4">
              <div>
                <label className={ui.label}>사이즈</label>
                <div className="mt-2 flex gap-2">
                  <input
                    value={sizeName}
                    onChange={(event) => setSizeName(event.target.value)}
                    placeholder="예: S"
                    className={ui.controlSm}
                  />
                  <button
                    type="button"
                    disabled={isPending || !sizeName.trim() || !selectedModel}
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
                      <span
                        key={size.id}
                        className="rounded-full border border-slate-200 px-3 py-1 text-sm text-slate-600"
                      >
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
                    onChange={(event) => setColorName(event.target.value)}
                    placeholder="예: 다크블루"
                    className={ui.control}
                  />
                  <input
                    value={colorRgbCode}
                    onChange={(event) => setColorRgbCode(event.target.value)}
                    placeholder="#000000"
                    className={ui.control}
                  />
                </div>
                <label className="mt-2 inline-flex items-center gap-2 text-sm text-slate-600">
                  <input
                    type="checkbox"
                    checked={textWhite}
                    onChange={(event) => setTextWhite(event.target.checked)}
                  />
                  텍스트 화이트
                </label>
                <div className="mt-2 flex gap-2">
                  <button
                    type="button"
                    disabled={isPending || !colorName.trim() || !selectedModel}
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
              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => {
                    if (canFinishSetup) setStep(4)
                  }}
                  disabled={isPending || !canFinishSetup}
                  className={cx(ui.buttonPrimary, canFinishSetup ? '' : 'opacity-50 cursor-not-allowed')}
                >
                  다음: 완료 처리
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {step === 4 && (
        <div className={ui.panel}>
          <div className="px-4 py-4">
            <h3 className="text-base font-semibold text-slate-900">초기 설정이 완료되었습니다.</h3>
            <p className="mt-2 text-sm text-slate-600">
              창고, 모델, 사이즈/색상 정보가 등록되어 입출고를 시작할 수 있습니다.
            </p>
            <button
              type="button"
              onClick={() => {
                router.push('/inout')
              }}
              className={cx(ui.buttonPrimary, 'mt-4')}
            >
              입출고로 이동
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

'use client'

import { useEffect, useRef, useState, useTransition, type FormEvent } from 'react'
import { useRouter } from 'next/navigation'

import { BasicDataTable } from '@/components/ui/basic-data-table'
import { Badge, StatusBadge } from '@/components/ui/badge-1'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Modal } from '@/components/ui/modal'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ActionToolbar } from '@/components/ui/toolbar'
import { cx, ui } from '../../components/ui'
import {
  createModel,
  createModelColor,
  createModelSize,
  createWarehouse,
  deleteModel,
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
  skuCount?: number
  stockQty: number
  inboundQty?: number
  outboundQty?: number
  latestInbound?: { quantity: number; date: string } | null
  latestOutbound?: { quantity: number; date: string } | null
  latestMovementDate?: string | null
}

type MasterDataManagerProps = {
  models: ModelType[]
  warehouses: WarehouseLookup[]
  warehouseStats?: WarehouseStat[]
}

type ColorSpec = {
  name: string
  rgbCode: string
  textWhite: boolean
}

type TabKey = 'product' | 'warehouse'

type ModelDraft = {
  name: string
  sizeText: string
  colorText: string
  defaultTextWhite: boolean
}

type PendingModelSetup = {
  name: string
  sizes: string[]
  colors: ColorSpec[]
}

type ProductRow = ModelType

type WarehouseRow = {
  warehouse: WarehouseLookup
  skuCount: number
  stockQty: number
  inboundQty: number
  outboundQty: number
  latestInbound: { quantity: number; date: string } | null
  latestOutbound: { quantity: number; date: string } | null
  latestMovementDate: string | null
}

function splitList(value: string) {
  return value
    .split(/[\n,]/)
    .map((entry) => entry.trim())
    .filter(Boolean)
}

function parseColorText(value: string, defaultTextWhite: boolean) {
  const raw = splitList(value)
  const colors: ColorSpec[] = []
  const invalid: string[] = []

  for (const item of raw) {
    const parts = item
      .split('|')
      .map((part) => part.trim())
      .filter(Boolean)
    const name = parts[0] ?? ''
    if (!name) continue

    let rgbCode = '#000000'
    let textWhite = defaultTextWhite

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
      textWhite = parts[2].toLowerCase() === 'w' || parts[2].toLowerCase() === 'white'
    }

    colors.push({ name, rgbCode, textWhite })
  }

  return { colors, invalid }
}

function formatDate(value?: string | null) {
  if (!value) return '없음'

  return new Intl.DateTimeFormat('ko-KR', {
    dateStyle: 'medium',
  }).format(new Date(value))
}

function createModelDraft(): ModelDraft {
  return {
    name: '',
    sizeText: '',
    colorText: '',
    defaultTextWhite: false,
  }
}

function describeColorTone(textWhite: boolean) {
  return textWhite ? '흰색' : '검정'
}

export default function MasterDataManager({
  models: initialModels,
  warehouses: initialWarehouses,
  warehouseStats = [],
}: MasterDataManagerProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [activeTab, setActiveTab] = useState<TabKey>('product')
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const [isWarehouseModalOpen, setIsWarehouseModalOpen] = useState(false)
  const [warehouseName, setWarehouseName] = useState('')
  const warehouseNameRef = useRef<HTMLInputElement>(null)

  const [deleteWarehouseTarget, setDeleteWarehouseTarget] = useState<{ id: number; name: string } | null>(null)
  const [deleteModelTarget, setDeleteModelTarget] = useState<{ id: number; name: string } | null>(null)

  const [isModelModalOpen, setIsModelModalOpen] = useState(false)
  const [modelDraft, setModelDraft] = useState<ModelDraft>(createModelDraft())
  const [pendingModelSetup, setPendingModelSetup] = useState<PendingModelSetup | null>(null)
  const [isApplyingModelSetup, setIsApplyingModelSetup] = useState(false)
  const [isCreatingModel, setIsCreatingModel] = useState(false)

  const showToast = (next: { type: 'success' | 'error'; text: string }) => {
    setMessage(next)
    window.setTimeout(() => setMessage(null), 2500)
  }

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

  useEffect(() => {
    if (!isWarehouseModalOpen) {
      return
    }

    warehouseNameRef.current?.focus()
  }, [isWarehouseModalOpen])

  useEffect(() => {
    if (!pendingModelSetup || isApplyingModelSetup) {
      return
    }

    const nextModel = [...initialModels]
      .filter((model) => model.name === pendingModelSetup.name)
      .sort((left, right) => right.id - left.id)[0]

    if (!nextModel) {
      return
    }

    setIsApplyingModelSetup(true)

    void (async () => {
      try {
        for (const sizeName of pendingModelSetup.sizes) {
          await createModelSize(nextModel.id, sizeName)
        }

        for (const color of pendingModelSetup.colors) {
          await createModelColor(nextModel.id, color.name, {
            rgbCode: color.rgbCode,
            textWhite: color.textWhite,
          })
        }

        showToast({ type: 'success', text: '모델이 등록되었습니다.' })
        setModelDraft(createModelDraft())
        setIsModelModalOpen(false)
        router.refresh()
      } catch (error) {
        showToast({ type: 'error', text: error instanceof Error ? error.message : '처리에 실패했습니다.' })
      } finally {
        setPendingModelSetup(null)
        setIsCreatingModel(false)
        setIsApplyingModelSetup(false)
      }
    })()
  }, [initialModels, isApplyingModelSetup, pendingModelSetup, router])

  const openWarehouseModal = () => {
    clearMessage()
    setWarehouseName('')
    setIsWarehouseModalOpen(true)
  }

  const closeWarehouseModal = () => {
    setIsWarehouseModalOpen(false)
  }

  const openModelModal = () => {
    clearMessage()
    setModelDraft(createModelDraft())
    setIsModelModalOpen(true)
  }

  const closeModelModal = () => {
    if (isCreatingModel || isApplyingModelSetup) {
      return
    }

    setIsModelModalOpen(false)
  }

  const commitWarehouse = () => {
    if (!warehouseName.trim()) return

    clearMessage()
    runWithToast(
      async () => {
        await createWarehouse(warehouseName)
        setWarehouseName('')
      },
      '창고가 등록되었습니다.',
      closeWarehouseModal,
    )
  }

  const submitWarehouse = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    commitWarehouse()
  }

  const requestDeleteWarehouse = (warehouseId: number, warehouseName: string) => {
    setDeleteWarehouseTarget({ id: warehouseId, name: warehouseName })
  }

  const confirmDeleteWarehouse = () => {
    if (!deleteWarehouseTarget) return

    runWithToast(
      async () => {
        await deleteWarehouse(deleteWarehouseTarget.id)
      },
      `${deleteWarehouseTarget.name} 창고가 삭제되었습니다.`,
      () => setDeleteWarehouseTarget(null),
    )
  }

  const requestDeleteModel = (modelId: number, modelName: string) => {
    setDeleteModelTarget({ id: modelId, name: modelName })
  }

  const confirmDeleteModel = () => {
    if (!deleteModelTarget) return

    runWithToast(
      async () => {
        await deleteModel(deleteModelTarget.id)
      },
      `${deleteModelTarget.name} 모델이 삭제되었습니다.`,
      () => setDeleteModelTarget(null),
    )
  }

  const commitModel = () => {
    const name = modelDraft.name.trim()
    if (!name) return

    const sizes = splitList(modelDraft.sizeText)
    const parsedColors = parseColorText(modelDraft.colorText, modelDraft.defaultTextWhite)
    if (parsedColors.invalid.length > 0) {
      showToast({ type: 'error', text: `색상 코드 형식이 올바르지 않습니다: ${parsedColors.invalid.join(', ')}` })
      return
    }

    clearMessage()
    setPendingModelSetup({
      name,
      sizes,
      colors: parsedColors.colors,
    })
    setIsCreatingModel(true)

    startTransition(async () => {
      try {
        await createModel(name)
        router.refresh()
      } catch (error) {
        setPendingModelSetup(null)
        setIsCreatingModel(false)
        showToast({ type: 'error', text: error instanceof Error ? error.message : '처리에 실패했습니다.' })
      }
    })
  }

  const submitModel = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    commitModel()
  }

  const warehouseRows: WarehouseRow[] = initialWarehouses.map((warehouse) => {
    const stat = warehouseStats.find((item) => item.id === warehouse.id)

    return {
      warehouse,
      skuCount: stat?.skuCount ?? 0,
      stockQty: stat?.stockQty ?? 0,
      inboundQty: stat?.inboundQty ?? 0,
      outboundQty: stat?.outboundQty ?? 0,
      latestInbound: stat?.latestInbound ?? null,
      latestOutbound: stat?.latestOutbound ?? null,
      latestMovementDate: stat?.latestMovementDate ?? null,
    }
  })

  const modelCount = initialModels.length
  const totalSizes = initialModels.reduce((sum, model) => sum + model.sizes.length, 0)
  const totalColors = initialModels.reduce((sum, model) => sum + model.colors.length, 0)
  const warehouseCount = warehouseRows.length
  const totalWarehouseStock = warehouseRows.reduce((sum, item) => sum + item.stockQty, 0)
  const totalWarehouseSku = warehouseRows.reduce((sum, item) => sum + item.skuCount, 0)

  return (
    <div className="space-y-4">
      {message ? (
        <div
          className={cx(
            ui.surfaceMuted,
            'px-4 py-3 text-sm font-medium',
            message.type === 'success'
              ? 'text-slate-700'
              : 'text-red-700',
          )}
          role="status"
          aria-live="polite"
        >
          {message.text}
        </div>
      ) : null}

      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as TabKey)} className="mt-4 space-y-4">
        <TabsList aria-label="상품 관리 보기 전환">
          <TabsTrigger value="product">상품</TabsTrigger>
          <TabsTrigger value="warehouse">창고</TabsTrigger>
        </TabsList>

        <TabsContent value="product" className="m-0">
          <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <ActionToolbar>
              <StatusBadge tone="neutral">{modelCount}개 모델</StatusBadge>
              <StatusBadge tone="neutral">{totalSizes}개 사이즈</StatusBadge>
              <StatusBadge tone="neutral">{totalColors}개 색상</StatusBadge>
            </ActionToolbar>

            <ActionToolbar>
              <Button type="button" variant="secondary" size="sm" className="h-10 px-3" onClick={openModelModal}>
                모델 등록
              </Button>
            </ActionToolbar>
          </div>

          <BasicDataTable<ProductRow>
            columns={[
              { key: 'name', label: '모델' },
              { key: 'sizes', label: '사이즈' },
              { key: 'colors', label: '색상' },
              { key: 'actions', label: '작업', align: 'right' },
            ]}
            rows={initialModels}
            rowKey={(row) => row.id}
            emptyState="등록된 상품이 없습니다."
            renderCell={(row, columnKey) => {
              if (columnKey === 'name') {
                return <span className="font-medium text-slate-950">{row.name}</span>
              }

              if (columnKey === 'sizes') {
                return row.sizes.length === 0 ? (
                  <span className="text-sm text-slate-500">없음</span>
                ) : (
                  <div className="flex flex-wrap gap-1.5">
                    {row.sizes.map((size) => (
                      <StatusBadge key={size.id} tone="neutral">
                        {size.name}
                      </StatusBadge>
                    ))}
                  </div>
                )
              }

              if (columnKey === 'colors') {
                return row.colors.length === 0 ? (
                  <span className="text-sm text-slate-500">없음</span>
                ) : (
                  <div className="flex flex-wrap gap-1.5">
                    {row.colors.map((color) => (
                      <Badge
                        key={color.id}
                        tone="info"
                        title={`${color.rgbCode}${color.textWhite ? ' / 흰색 텍스트' : ' / 검정 텍스트'}`}
                      >
                        {color.name}
                      </Badge>
                    ))}
                  </div>
                )
              }

              if (columnKey === 'actions') {
                return (
                  <div className="inline-flex gap-2">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-8 px-2"
                      onClick={() => requestDeleteModel(row.id, row.name)}
                      aria-label={`${row.name} 삭제`}
                    >
                      삭제
                    </Button>
                  </div>
                )
              }

              return null
            }}
          />
        </TabsContent>

        <TabsContent value="warehouse" className="m-0">
          <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <ActionToolbar>
              <StatusBadge tone="neutral">{warehouseCount}개 창고</StatusBadge>
              <StatusBadge tone="neutral">SKU {totalWarehouseSku.toLocaleString()}개</StatusBadge>
              <StatusBadge tone="neutral">총 재고 {totalWarehouseStock.toLocaleString()}개</StatusBadge>
            </ActionToolbar>

            <ActionToolbar>
              <Button type="button" variant="secondary" size="sm" className="h-10 px-3" onClick={openWarehouseModal}>
                창고 등록
              </Button>
            </ActionToolbar>
          </div>

          <BasicDataTable<WarehouseRow>
            columns={[
              { key: 'warehouse', label: '창고' },
              { key: 'skuCount', label: 'SKU', align: 'right' },
              { key: 'stockQty', label: '현재 재고', align: 'right' },
              { key: 'movement', label: '최근 변동' },
              { key: 'actions', label: '작업', align: 'right' },
            ]}
            rows={warehouseRows}
            rowKey={(row) => row.warehouse.id}
            emptyState="등록된 창고가 없습니다."
            renderCell={(row, columnKey) => {
              if (columnKey === 'warehouse') {
                return <span className="font-medium text-slate-950">{row.warehouse.name}</span>
              }

              if (columnKey === 'skuCount') {
                return <span className="font-mono tabular-nums text-slate-600">{row.skuCount.toLocaleString()}</span>
              }

              if (columnKey === 'stockQty') {
                return <span className="font-semibold text-slate-950">{row.stockQty.toLocaleString()}</span>
              }

              if (columnKey === 'movement') {
                return (
                  <div className="space-y-0.5 text-sm text-slate-600">
                    <p>입고 {row.latestInbound ? `${row.latestInbound.quantity} / ${formatDate(row.latestInbound.date)}` : '없음'}</p>
                    <p>출고 {row.latestOutbound ? `${row.latestOutbound.quantity} / ${formatDate(row.latestOutbound.date)}` : '없음'}</p>
                    <p className="text-xs text-slate-400">최근 {formatDate(row.latestMovementDate)}</p>
                  </div>
                )
              }

              if (columnKey === 'actions') {
                return (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-8 px-2"
                    onClick={() => requestDeleteWarehouse(row.warehouse.id, row.warehouse.name)}
                    aria-label={`${row.warehouse.name} 삭제`}
                  >
                    삭제
                  </Button>
                )
              }

              return null
            }}
          />
        </TabsContent>
      </Tabs>

      <Modal
        open={isWarehouseModalOpen}
        title="창고 등록"
        description="창고명만 입력해 빠르게 추가합니다."
        onOpenChange={(open) => setIsWarehouseModalOpen(open)}
        footer={
          <div className="flex items-center justify-end gap-2">
            <Button type="button" variant="secondary" onClick={closeWarehouseModal}>
              취소
            </Button>
            <Button type="button" onClick={commitWarehouse} disabled={isPending || !warehouseName.trim()}>
              등록
            </Button>
          </div>
        }
      >
        <form id="warehouse-form" onSubmit={submitWarehouse} className="space-y-3">
          <div className="space-y-2">
            <label htmlFor="warehouse-name" className={ui.label}>
              창고명
            </label>
            <Input
              ref={warehouseNameRef}
              id="warehouse-name"
              value={warehouseName}
              onChange={(event) => setWarehouseName(event.target.value)}
              placeholder="예: 대전 2센터 A구역"
            />
          </div>
        </form>
      </Modal>

      <Modal
        open={Boolean(deleteWarehouseTarget)}
        title="창고 삭제 확인"
        description={deleteWarehouseTarget ? `${deleteWarehouseTarget.name} 창고를 삭제합니다.` : undefined}
        onOpenChange={(open) => {
          if (!open) setDeleteWarehouseTarget(null)
        }}
        footer={
          <div className="flex items-center justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => setDeleteWarehouseTarget(null)}>
              취소
            </Button>
            <Button type="button" variant="destructive" onClick={confirmDeleteWarehouse} disabled={!deleteWarehouseTarget}>
              삭제
            </Button>
          </div>
        }
      >
        <p className="text-sm leading-6 text-slate-600">삭제 후에는 창고 재고와 연결된 내역이 더 이상 이 표에서 보이지 않습니다.</p>
      </Modal>

      <Modal
        open={Boolean(deleteModelTarget)}
        title="모델 삭제 확인"
        description={deleteModelTarget ? `${deleteModelTarget.name} 모델을 삭제합니다.` : undefined}
        onOpenChange={(open) => {
          if (!open) setDeleteModelTarget(null)
        }}
        footer={
          <div className="flex items-center justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => setDeleteModelTarget(null)}>
              취소
            </Button>
            <Button type="button" variant="destructive" onClick={confirmDeleteModel} disabled={!deleteModelTarget}>
              삭제
            </Button>
          </div>
        }
      >
        <p className="text-sm leading-6 text-slate-600">모델을 삭제하면 연결된 사이즈와 색상도 함께 정리됩니다.</p>
      </Modal>

      <Modal
        open={isModelModalOpen}
        title="모델 등록"
        description="모델명과 초기 사이즈, 색상을 한 번에 등록합니다."
        onOpenChange={(open) => {
          if (!open) closeModelModal()
        }}
        className="max-w-3xl"
        footer={
          <div className="flex items-center justify-end gap-2">
            <Button type="button" variant="secondary" onClick={closeModelModal} disabled={isCreatingModel || isApplyingModelSetup}>
              취소
            </Button>
            <Button
              type="button"
              onClick={commitModel}
              disabled={isCreatingModel || isApplyingModelSetup || !modelDraft.name.trim()}
            >
              {isCreatingModel || isApplyingModelSetup ? '등록 중...' : '등록'}
            </Button>
          </div>
        }
      >
        <form id="model-form" onSubmit={submitModel} className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="model-name" className={ui.label}>
              모델명
            </label>
            <Input
              id="model-name"
              value={modelDraft.name}
              onChange={(event) => setModelDraft((prev) => ({ ...prev, name: event.target.value }))}
              placeholder="예: 블루종 A"
            />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <label htmlFor="model-size-text" className={ui.label}>
                사이즈
              </label>
              <textarea
                id="model-size-text"
                rows={4}
                value={modelDraft.sizeText}
                onChange={(event) => setModelDraft((prev) => ({ ...prev, sizeText: event.target.value }))}
                placeholder="예: S, M, L"
                className={ui.control}
              />
              <p className={ui.helpText}>쉼표나 줄바꿈으로 구분합니다.</p>
            </div>

            <div className="space-y-2">
              <label htmlFor="model-color-text" className={ui.label}>
                색상
              </label>
              <textarea
                id="model-color-text"
                rows={4}
                value={modelDraft.colorText}
                onChange={(event) => setModelDraft((prev) => ({ ...prev, colorText: event.target.value }))}
                placeholder="예: 블랙|#000000|W, 화이트|#FFFFFF"
                className={ui.control}
              />
              <p className={ui.helpText}>형식: 이름|색상값|텍스트 방향. 텍스트 방향이 없으면 기본값을 사용합니다.</p>
            </div>
          </div>

          <div className="flex flex-wrap items-end gap-3">
            <div className="space-y-2">
              <label htmlFor="color-text-default" className={ui.label}>
                색상 기본 텍스트
              </label>
              <Select
                value={modelDraft.defaultTextWhite ? 'white' : 'black'}
                onValueChange={(value) =>
                  setModelDraft((prev) => ({
                    ...prev,
                    defaultTextWhite: value === 'white',
                  }))
                }
              >
                <SelectTrigger id="color-text-default" className="w-44" aria-label="색상 기본 텍스트">
                  <SelectValue placeholder="기본값 선택" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="black">검정</SelectItem>
                  <SelectItem value="white">흰색</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className={cx(ui.surfaceMuted, 'px-3 py-2 text-sm text-slate-600')}>
              기본 텍스트: {describeColorTone(modelDraft.defaultTextWhite)}
            </div>
          </div>
        </form>
      </Modal>
    </div>
  )
}

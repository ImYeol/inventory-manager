'use client'

import type { ReactNode } from 'react'
import { useMemo, useState } from 'react'
import InOutForm from '@/app/(protected)/inout/InOutForm'
import HistoryView from '@/app/(protected)/history/HistoryView'
import { StatusBadge } from '@/components/ui/badge-1'
import { BasicDataTable } from '@/components/ui/basic-data-table'
import { PageHeader, cx, ui } from '@/app/components/ui'

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

type TransactionItem = {
  id: number
  date: string
  type: string
  quantity: number
  warehouseId: number
  warehouseName: string
  createdAt: string
  modelName: string
  sizeName: string
  colorName: string
  colorRgb: string
}

type InventoryRow = {
  key: string
  modelName: string
  colorName: string
  colorRgb: string
  sizeName: string
  warehouseId: number
  warehouseName: string
  quantity: number
}

type InventoryOverviewRow = InventoryRow & {
  latestInbound: string
  latestOutbound: string
  status: { label: string; tone: 'neutral' | 'success' | 'warning' | 'danger' }
}

type WorkspaceTab = 'overview' | 'inbound' | 'outbound' | 'csv' | 'history'

const tabs: Array<{ id: WorkspaceTab; label: string }> = [
  { id: 'overview', label: '개요' },
  { id: 'inbound', label: '입고' },
  { id: 'outbound', label: '출고' },
  { id: 'csv', label: 'CSV' },
  { id: 'history', label: '이력' },
]

function inventoryStatus(quantity: number) {
  if (quantity <= 0) return { label: '품절', tone: 'danger' as const }
  if (quantity <= 5) return { label: '주의', tone: 'warning' as const }
  return { label: '정상', tone: 'success' as const }
}

function movementTone(type: string) {
  if (type === '입고') return 'success' as const
  if (type === '출고') return 'danger' as const
  return 'neutral' as const
}

function PlusIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" aria-hidden="true" className="h-4 w-4">
      <path d="M10 4v12M4 10h12" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" />
    </svg>
  )
}

function MinusIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" aria-hidden="true" className="h-4 w-4">
      <path d="M4 10h12" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" />
    </svg>
  )
}

function UploadIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" aria-hidden="true" className="h-4 w-4">
      <path d="M10 13V4M6.5 7.5 10 4l3.5 3.5" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" />
      <path d="M4 15.5h12" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" />
    </svg>
  )
}

function EntryOverlay({
  open,
  title,
  description,
  onClose,
  children,
}: {
  open: boolean
  title: string
  description: string
  onClose: () => void
  children: ReactNode
}) {
  if (!open) return null

  return (
    <div className="fixed inset-0 z-50">
      <button
        type="button"
        aria-label="입력 창 닫기"
        onClick={onClose}
        className="absolute inset-0 bg-slate-950/45"
      />
      <div className="absolute inset-x-0 bottom-0 top-10 overflow-hidden rounded-t-[28px] border border-slate-200 bg-white shadow-2xl md:inset-x-[max(2rem,calc(50%-32rem))] md:bottom-8 md:top-8 md:rounded-[28px]">
        <div className="flex h-full flex-col">
          <div className="border-b border-slate-200 px-4 py-4 md:px-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-semibold text-slate-950">{title}</p>
                <p className="mt-1 text-sm text-slate-500">{description}</p>
              </div>
              <button type="button" onClick={onClose} className={cx(ui.buttonGhost, 'h-11 min-w-11 px-3')}>
                닫기
              </button>
            </div>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4 md:px-6 md:py-5">{children}</div>
        </div>
      </div>
    </div>
  )
}

export default function InventoryWorkspace({
  models,
  warehouses,
  transactions,
}: {
  models: ModelWithRelations[]
  warehouses: WarehouseLookup[]
  transactions: TransactionItem[]
}) {
  const [selectedWarehouseId, setSelectedWarehouseId] = useState<number | 'all'>(warehouses[0]?.id ?? 'all')
  const [activeTab, setActiveTab] = useState<WorkspaceTab>('overview')
  const [overlayMode, setOverlayMode] = useState<'입고' | '출고' | null>(null)
  const [csvType, setCsvType] = useState<'입고' | '출고'>('입고')

  const normalizedModels = useMemo(
    () =>
      models.map((model) => ({
        id: model.id,
        name: model.name,
        sizes: model.sizes,
        colors: model.colors,
      })),
    [models],
  )

  const rows = useMemo(() => {
    return models.flatMap((model) =>
      model.colors.flatMap((color) =>
        model.sizes.flatMap((size): InventoryRow[] => {
          const matchingInventory = model.inventory.filter((item) => item.colorId === color.id && item.sizeId === size.id)

          return matchingInventory.map((item) => ({
            key: `${item.id}`,
            modelName: model.name,
            colorName: color.name,
            colorRgb: color.rgbCode,
            sizeName: size.name,
            warehouseId: item.warehouseId,
            warehouseName: item.warehouseName,
            quantity: item.quantity,
          }))
        }),
      ),
    )
  }, [models])

  const transactionLookup = useMemo(() => {
    const map = new Map<string, { latestInbound?: string; latestOutbound?: string }>()

    for (const tx of transactions) {
      const key = `${tx.modelName}::${tx.colorName}::${tx.sizeName}::${tx.warehouseId}`
      const current = map.get(key) ?? {}
      if (tx.type === '입고' && !current.latestInbound) current.latestInbound = tx.date
      if (tx.type === '출고' && !current.latestOutbound) current.latestOutbound = tx.date
      map.set(key, current)
    }

    return map
  }, [transactions])

  const overviewRows = useMemo(() => {
    const scopedRows: InventoryOverviewRow[] = rows
      .filter((row) => selectedWarehouseId === 'all' || row.warehouseId === selectedWarehouseId)
      .map((row) => {
        const movement = transactionLookup.get(`${row.modelName}::${row.colorName}::${row.sizeName}::${row.warehouseId}`)
        const status = inventoryStatus(row.quantity)

        return {
          ...row,
          latestInbound: movement?.latestInbound ?? '없음',
          latestOutbound: movement?.latestOutbound ?? '없음',
          status,
        }
      })

    return scopedRows
      .sort((left, right) => right.quantity - left.quantity || left.modelName.localeCompare(right.modelName))
  }, [rows, selectedWarehouseId, transactionLookup])

  const summary = useMemo(() => {
    return {
      totalQuantity: overviewRows.reduce((sum, row) => sum + row.quantity, 0),
      skuCount: overviewRows.length,
      lowStockCount: overviewRows.filter((row) => row.status.tone !== 'success').length,
    }
  }, [overviewRows])

  const recentMovements = useMemo(
    () =>
      transactions
        .filter((tx) => selectedWarehouseId === 'all' || tx.warehouseId === selectedWarehouseId)
        .slice(0, 6),
    [selectedWarehouseId, transactions],
  )

  const selectedWarehouseName =
    selectedWarehouseId === 'all'
      ? '전체 창고'
      : warehouses.find((warehouse) => warehouse.id === selectedWarehouseId)?.name ?? '선택된 창고'

  return (
    <div className={ui.shell}>
      <PageHeader
        title="재고 운영"
        description="선택한 창고를 기준으로 개요, 입고, 출고, CSV, 이력을 한 화면에서 다룹니다."
      />

      <div className="rounded-2xl border border-slate-200 bg-white/90 px-3 py-3 shadow-sm backdrop-blur">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap items-center gap-2">
            <label htmlFor="inventory-warehouse" className="sr-only">
              창고 선택
            </label>
            <select
              id="inventory-warehouse"
              value={selectedWarehouseId}
              onChange={(event) =>
                setSelectedWarehouseId(event.target.value === 'all' ? 'all' : Number(event.target.value))
              }
              className={cx(ui.controlSm, 'min-w-[11rem] bg-white')}
            >
              <option value="all">전체 창고</option>
              {warehouses.map((warehouse) => (
                <option key={warehouse.id} value={warehouse.id}>
                  {warehouse.name}
                </option>
              ))}
            </select>
            <span className="text-xs text-slate-500">{selectedWarehouseName}</span>
          </div>

          <div className="flex flex-wrap gap-1">
            {tabs.map((tab) => {
              const active = activeTab === tab.id
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={cx(active ? ui.tabActive : ui.tab, 'min-h-0 px-2.5')}
                >
                  {tab.label}
                </button>
              )
            })}
          </div>

          <div className="flex flex-wrap items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => setOverlayMode('입고')}
              className={cx(ui.buttonPrimary, 'h-9 gap-1.5 px-3 text-sm')}
            >
              <PlusIcon />
              <span>입고</span>
            </button>
            <button
              type="button"
              onClick={() => setOverlayMode('출고')}
              className={cx(ui.buttonSecondary, 'h-9 gap-1.5 px-3 text-sm')}
            >
              <MinusIcon />
              <span>출고</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('csv')}
              className={cx(ui.buttonGhost, 'h-9 gap-1.5 px-3 text-sm')}
            >
              <UploadIcon />
              <span>CSV</span>
            </button>
          </div>
        </div>

        {activeTab === 'overview' ? (
          <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-slate-200 pt-3 text-xs">
            <StatusBadge tone="info" className="px-2.5 py-1">
              재고 {summary.totalQuantity.toLocaleString()}개
            </StatusBadge>
            <StatusBadge tone="neutral" className="px-2.5 py-1">
              SKU {summary.skuCount.toLocaleString()}개
            </StatusBadge>
            <StatusBadge tone={summary.lowStockCount > 0 ? 'warning' : 'success'} className="px-2.5 py-1">
              주의 {summary.lowStockCount.toLocaleString()}개
            </StatusBadge>
          </div>
        ) : null}
      </div>

      {activeTab === 'overview' ? (
        <div className="mt-4 space-y-3">
          <BasicDataTable
            className="hidden md:block"
            columns={[
              { key: 'model', label: '상품' },
              { key: 'variant', label: '옵션' },
              { key: 'warehouse', label: '창고' },
              { key: 'quantity', label: '현재 재고', align: 'right' },
              { key: 'latestInbound', label: '최근 입고' },
              { key: 'latestOutbound', label: '최근 출고' },
              { key: 'status', label: '상태' },
            ]}
            rows={overviewRows}
            rowKey={(row) => row.key}
            emptyState="조회 조건에 맞는 재고가 없습니다."
            renderCell={(row, columnKey) => {
              if (columnKey === 'model') {
                return <div className="font-semibold text-slate-950">{row.modelName}</div>
              }
              if (columnKey === 'variant') {
                return (
                  <div className="flex items-center gap-2 text-slate-600">
                    <span
                      className="inline-block h-3.5 w-3.5 rounded-full border border-slate-200"
                      style={{ backgroundColor: row.colorRgb }}
                    />
                    <span>
                      {row.colorName} / {row.sizeName}
                    </span>
                  </div>
                )
              }
              if (columnKey === 'warehouse') {
                return row.warehouseName
              }
              if (columnKey === 'quantity') {
                return <span className="font-semibold text-slate-950">{row.quantity}</span>
              }
              if (columnKey === 'latestInbound') {
                return row.latestInbound
              }
              if (columnKey === 'latestOutbound') {
                return row.latestOutbound
              }
              if (columnKey === 'status') {
                return (
                  <StatusBadge tone={row.status.tone} className="px-2.5 py-1">
                    {row.status.label}
                  </StatusBadge>
                )
              }
              return null
            }}
          />

          <div className="space-y-3 md:hidden">
            {overviewRows.length === 0 ? (
              <div className={ui.emptyState}>조회 조건에 맞는 재고가 없습니다.</div>
            ) : (
              overviewRows.map((row) => (
                <div key={row.key} className="surface space-y-3 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-base font-semibold text-slate-950">{row.modelName}</p>
                      <p className="mt-1 text-sm text-slate-500">
                        {row.colorName} / {row.sizeName}
                      </p>
                      <p className="mt-1 text-sm text-slate-500">{row.warehouseName}</p>
                    </div>
                    <StatusBadge tone={row.status.tone} className="px-2.5 py-1">
                      {row.status.label}
                    </StatusBadge>
                  </div>
                  <div className="grid grid-cols-2 gap-3 text-sm text-slate-600">
                    <div>
                      <p className="text-xs text-slate-400">현재 재고</p>
                      <p className="mt-1 text-lg font-semibold text-slate-950">{row.quantity}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-400">최근 입고</p>
                      <p className="mt-1">{row.latestInbound}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-400">최근 출고</p>
                      <p className="mt-1">{row.latestOutbound}</p>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      ) : null}

      {activeTab === 'inbound' || activeTab === 'outbound' ? (
        <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1fr)_22rem]">
          <div className={cx(ui.panel, ui.panelBody, 'space-y-4 p-4 md:p-5')}>
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div>
                <h2 className="text-base font-semibold tracking-tight text-slate-950">
                  {activeTab === 'inbound' ? '빠른 입고' : '빠른 출고'}
                </h2>
                <p className="mt-1 text-sm text-slate-500">선택한 창고 기준으로 여러 SKU를 한 번에 입력합니다.</p>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-slate-50/70 px-4 py-3 text-sm text-slate-600">
              다건 입력, 행 복제, 붙여넣기를 기본으로 유지합니다.
            </div>

            <InOutForm
              models={normalizedModels}
              warehouses={warehouses}
              initialType={activeTab === 'inbound' ? '입고' : '출고'}
              initialWarehouseId={typeof selectedWarehouseId === 'number' ? selectedWarehouseId : warehouses[0]?.id}
              lockedWarehouseId={typeof selectedWarehouseId === 'number' ? selectedWarehouseId : null}
              entryMode={activeTab}
            />
          </div>

          <div className={cx(ui.panel, ui.panelBody, 'p-4')}>
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-sm font-semibold text-slate-900">최근 변동</h3>
              <span className="text-xs text-slate-500">{recentMovements.length}건</span>
            </div>
            <div className="mt-3 space-y-2">
              {recentMovements.length === 0 ? (
                <p className="text-sm text-slate-500">최근 변동 내역이 없습니다.</p>
              ) : (
                recentMovements.map((movement) => (
                  <div key={movement.id} className="flex items-start justify-between gap-3 rounded-2xl border border-slate-200 bg-white px-3 py-3">
                    <div>
                      <p className="text-sm font-semibold text-slate-950">{movement.modelName}</p>
                      <p className="mt-1 text-sm text-slate-500">
                        {movement.colorName} / {movement.sizeName}
                      </p>
                    </div>
                    <div className="text-right">
                      <StatusBadge tone={movementTone(movement.type)} className="px-2.5 py-1">
                        {movement.type}
                      </StatusBadge>
                      <p className="mt-1 text-sm font-semibold text-slate-950">{movement.quantity}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      ) : null}

      {activeTab === 'csv' ? (
        <div className="mt-4 space-y-4">
          <div className={cx(ui.panel, ui.panelBody, 'space-y-4 p-4 md:p-5')}>
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div>
                <h2 className="text-base font-semibold tracking-tight text-slate-950">CSV</h2>
                <p className="mt-1 text-sm text-slate-500">선택한 창고에 대해 파일 또는 붙여넣기로 일괄 반영합니다.</p>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setCsvType('입고')}
                  className={cx(csvType === '입고' ? ui.tabActive : ui.tab, 'min-h-0 rounded-full px-3')}
                >
                  입고 CSV
                </button>
                <button
                  type="button"
                  onClick={() => setCsvType('출고')}
                  className={cx(csvType === '출고' ? ui.tabActive : ui.tab, 'min-h-0 rounded-full px-3')}
                >
                  출고 CSV
                </button>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-slate-50/70 px-4 py-3 text-sm text-slate-600">
              <p className="font-semibold text-slate-900">지원 컬럼</p>
              <p className="mt-1">`모델, 사이즈, 색상, 수량` 순서의 CSV 또는 탭 구분 표를 지원합니다.</p>
            </div>

            <InOutForm
              models={normalizedModels}
              warehouses={warehouses}
              initialType={csvType}
              initialWarehouseId={typeof selectedWarehouseId === 'number' ? selectedWarehouseId : warehouses[0]?.id}
              lockedWarehouseId={typeof selectedWarehouseId === 'number' ? selectedWarehouseId : null}
              entryMode="csv"
            />
          </div>
        </div>
      ) : null}

      {activeTab === 'history' ? (
        <div className="mt-4 space-y-4">
          <div className={cx(ui.panel, ui.panelBody, 'flex items-center justify-between gap-3 px-4 py-3 md:px-5')}>
            <div>
              <h2 className="text-base font-semibold tracking-tight text-slate-950">이력</h2>
              <p className="mt-1 text-sm text-slate-500">선택한 창고의 변동 흐름을 이어서 추적합니다.</p>
            </div>
            <span className={ui.pill}>{selectedWarehouseName}</span>
          </div>
          <HistoryView
            transactions={transactions.map((tx) => ({ ...tx, warehouse: tx.warehouseName }))}
            models={models.map((model) => ({ id: model.id, name: model.name }))}
            warehouses={warehouses}
            controlledWarehouseId={selectedWarehouseId === 'all' ? '' : selectedWarehouseId}
            embedded
          />
        </div>
      ) : null}

      <EntryOverlay
        open={overlayMode !== null}
        title={overlayMode === '입고' ? '빠른 입고 등록' : '빠른 출고 등록'}
        description={`선택한 창고 기준으로 여러 SKU를 한 번에 입력합니다.`}
        onClose={() => setOverlayMode(null)}
      >
        <InOutForm
          models={normalizedModels}
          warehouses={warehouses}
          initialType={overlayMode ?? '입고'}
          initialWarehouseId={typeof selectedWarehouseId === 'number' ? selectedWarehouseId : warehouses[0]?.id}
          lockedWarehouseId={typeof selectedWarehouseId === 'number' ? selectedWarehouseId : null}
          onSubmitted={() => setOverlayMode(null)}
        />
      </EntryOverlay>
    </div>
  )
}

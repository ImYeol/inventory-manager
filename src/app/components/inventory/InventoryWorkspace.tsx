'use client'

import Link from 'next/link'
import type { ReactNode } from 'react'
import { useDeferredValue, useMemo, useState } from 'react'
import InOutForm from '@/app/(protected)/inout/InOutForm'
import HistoryView from '@/app/(protected)/history/HistoryView'
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
  expectedInboundQuantity: number
  latestInbound: string
  latestOutbound: string
  status: { label: string; tone: 'normal' | 'warning' | 'danger' }
}

type WorkspaceTab = 'overview' | 'inbound' | 'outbound' | 'csv' | 'history'

const tabs: Array<{ id: WorkspaceTab; label: string; description: string }> = [
  { id: 'overview', label: '개요', description: '현재 재고와 상태를 창고 기준으로 확인합니다.' },
  { id: 'inbound', label: '입고', description: '빠른 다건 입력으로 입고를 반영합니다.' },
  { id: 'outbound', label: '출고', description: '출고를 창고 컨텍스트 안에서 처리합니다.' },
  { id: 'csv', label: 'CSV', description: '붙여넣기 또는 파일 가져오기로 일괄 반영합니다.' },
  { id: 'history', label: '이력', description: '선택한 창고의 변동 이력을 같은 허브 안에서 조회합니다.' },
]

function inventoryStatus(quantity: number) {
  if (quantity <= 0) return { label: '품절', tone: 'danger' as const }
  if (quantity <= 5) return { label: '주의', tone: 'warning' as const }
  return { label: '정상', tone: 'normal' as const }
}

function statusPillClass(tone: 'normal' | 'warning' | 'danger') {
  if (tone === 'danger') return 'border-red-200 bg-red-50 text-red-700'
  if (tone === 'warning') return 'border-amber-200 bg-amber-50 text-amber-700'
  return 'border-emerald-200 bg-emerald-50 text-emerald-700'
}

function movementTone(type: string) {
  if (type === '입고') return 'border-emerald-200 bg-emerald-50 text-emerald-700'
  if (type === '출고') return 'border-rose-200 bg-rose-50 text-rose-700'
  return 'border-slate-200 bg-slate-100 text-slate-700'
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
  const [statusFilter, setStatusFilter] = useState<'all' | 'normal' | 'warning' | 'danger'>('all')
  const [search, setSearch] = useState('')
  const [overlayMode, setOverlayMode] = useState<'입고' | '출고' | null>(null)
  const [csvType, setCsvType] = useState<'입고' | '출고'>('입고')
  const deferredSearch = useDeferredValue(search)

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
    const searchTerm = deferredSearch.trim().toLowerCase()
    const scopedRows: InventoryOverviewRow[] = rows
      .filter((row) => selectedWarehouseId === 'all' || row.warehouseId === selectedWarehouseId)
      .map((row) => {
        const movement = transactionLookup.get(`${row.modelName}::${row.colorName}::${row.sizeName}::${row.warehouseId}`)
        const status = inventoryStatus(row.quantity)

        return {
          ...row,
          expectedInboundQuantity: 0,
          latestInbound: movement?.latestInbound ?? '없음',
          latestOutbound: movement?.latestOutbound ?? '없음',
          status,
        }
      })

    return scopedRows
      .filter((row) => {
        if (statusFilter !== 'all' && row.status.tone !== statusFilter) return false
        if (!searchTerm) return true
        const target = `${row.modelName} ${row.colorName} ${row.sizeName} ${row.warehouseName}`.toLowerCase()
        return target.includes(searchTerm)
      })
      .sort((left, right) => right.quantity - left.quantity || left.modelName.localeCompare(right.modelName))
  }, [deferredSearch, rows, selectedWarehouseId, statusFilter, transactionLookup])

  const summary = useMemo(() => {
    const relevantTransactions = transactions.filter(
      (tx) => selectedWarehouseId === 'all' || tx.warehouseId === selectedWarehouseId,
    )

    return {
      totalQuantity: overviewRows.reduce((sum, row) => sum + row.quantity, 0),
      skuCount: overviewRows.length,
      lowStockCount: overviewRows.filter((row) => row.status.tone !== 'normal').length,
      todayInbound: relevantTransactions.filter((tx) => tx.type === '입고').slice(0, 20).reduce((sum, tx) => sum + tx.quantity, 0),
      todayOutbound: relevantTransactions.filter((tx) => tx.type === '출고').slice(0, 20).reduce((sum, tx) => sum + tx.quantity, 0),
    }
  }, [overviewRows, selectedWarehouseId, transactions])

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
        kicker="Warehouse Operations"
        title="재고 운영"
        description="창고 컨텍스트 하나로 개요, 입고, 출고, CSV, 이력을 이어서 다루는 운영 허브입니다."
        actions={
          <>
            <button type="button" onClick={() => setOverlayMode('입고')} className={ui.buttonPrimary}>
              빠른 입고
            </button>
            <button type="button" onClick={() => setOverlayMode('출고')} className={ui.buttonSecondary}>
              빠른 출고
            </button>
            <button type="button" onClick={() => setActiveTab('csv')} className={ui.buttonGhost}>
              CSV 이동
            </button>
          </>
        }
      />

      <div className={cx(ui.panel, ui.panelBody, 'space-y-4 md:p-5')}>
        <div className="grid gap-3 md:grid-cols-[minmax(0,16rem)_1fr]">
          <div>
            <label htmlFor="inventory-warehouse" className={ui.label}>
              창고 컨텍스트
            </label>
            <select
              id="inventory-warehouse"
              value={selectedWarehouseId}
              onChange={(event) =>
                setSelectedWarehouseId(event.target.value === 'all' ? 'all' : Number(event.target.value))
              }
              className={ui.controlSm}
            >
              <option value="all">전체 창고</option>
              {warehouses.map((warehouse) => (
                <option key={warehouse.id} value={warehouse.id}>
                  {warehouse.name}
                </option>
              ))}
            </select>
          </div>

          <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-5">
            {tabs.map((tab) => {
              const active = activeTab === tab.id
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={cx(
                    active ? ui.tabActive : ui.tab,
                    'min-h-11 justify-start rounded-2xl px-4 py-3 text-left',
                  )}
                >
                  <span className="block text-sm font-semibold">{tab.label}</span>
                  <span className="mt-1 block text-xs text-slate-500">{tab.description}</span>
                </button>
              )
            })}
          </div>
        </div>
      </div>

      {activeTab === 'overview' ? (
        <div className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {[
              { label: '현재 재고', value: summary.totalQuantity, detail: `${selectedWarehouseName} 기준 수량 합계` },
              { label: '운영 SKU', value: summary.skuCount, detail: '현재 조회 조건에 포함된 조합 수' },
              { label: '주의 항목', value: summary.lowStockCount, detail: '품절 또는 낮은 재고' },
              { label: '금일 흐름', value: `${summary.todayInbound} / ${summary.todayOutbound}`, detail: '입고 / 출고 수량' },
            ].map((card) => (
              <div key={card.label} className={cx(ui.panel, ui.panelBody, 'overflow-hidden')}>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">{card.label}</p>
                <p className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">{card.value}</p>
                <p className="mt-2 text-sm text-slate-500">{card.detail}</p>
              </div>
            ))}
          </div>

          <div className={cx(ui.panel, ui.panelBody, 'space-y-4 md:p-5')}>
            <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
              <div className="grid gap-3 md:grid-cols-[minmax(0,20rem)_minmax(0,10rem)]">
                <div>
                  <label htmlFor="inventory-search" className={ui.label}>
                    검색
                  </label>
                  <input
                    id="inventory-search"
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="모델, 색상, 사이즈, 창고 검색"
                    className={ui.controlSm}
                  />
                </div>
                <div>
                  <label htmlFor="inventory-status" className={ui.label}>
                    상태
                  </label>
                  <select
                    id="inventory-status"
                    value={statusFilter}
                    onChange={(event) =>
                      setStatusFilter(event.target.value as 'all' | 'normal' | 'warning' | 'danger')
                    }
                    className={ui.controlSm}
                  >
                    <option value="all">전체</option>
                    <option value="normal">정상</option>
                    <option value="warning">주의</option>
                    <option value="danger">품절</option>
                  </select>
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                <button type="button" onClick={() => setOverlayMode('입고')} className={ui.buttonPrimary}>
                  빠른 입고
                </button>
                <button type="button" onClick={() => setOverlayMode('출고')} className={ui.buttonSecondary}>
                  빠른 출고
                </button>
                <button type="button" onClick={() => setActiveTab('csv')} className={ui.buttonGhost}>
                  CSV 등록
                </button>
                <Link href="/settings/master-data" className={ui.buttonGhost}>
                  기준 데이터
                </Link>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-3 text-sm text-slate-600">
              선택된 창고: <span className="font-semibold text-slate-950">{selectedWarehouseName}</span>
            </div>

            <div className={cx('hidden md:block', ui.tableShell)}>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="ui-table-head text-left">
                      <th className={ui.tableHeadCell}>상품</th>
                      <th className={ui.tableHeadCell}>옵션</th>
                      <th className={ui.tableHeadCell}>창고</th>
                      <th className={cx(ui.tableHeadCell, 'text-right')}>현재 재고</th>
                      <th className={cx(ui.tableHeadCell, 'text-right')}>예정 입고</th>
                      <th className={ui.tableHeadCell}>최근 입고</th>
                      <th className={ui.tableHeadCell}>최근 출고</th>
                      <th className={ui.tableHeadCell}>상태</th>
                    </tr>
                  </thead>
                  <tbody>
                    {overviewRows.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="px-4 py-12 text-center text-sm text-slate-400">
                          조회 조건에 맞는 재고가 없습니다.
                        </td>
                      </tr>
                    ) : (
                      overviewRows.map((row) => (
                        <tr key={row.key} className="border-t border-slate-100 hover:bg-slate-50/70">
                          <td className={ui.tableCell}>
                            <div className="font-semibold text-slate-950">{row.modelName}</div>
                          </td>
                          <td className={ui.tableCell}>
                            <div className="flex items-center gap-2 text-slate-600">
                              <span
                                className="inline-block h-3.5 w-3.5 rounded-full border border-slate-200"
                                style={{ backgroundColor: row.colorRgb }}
                              />
                              <span>
                                {row.colorName} / {row.sizeName}
                              </span>
                            </div>
                          </td>
                          <td className={ui.tableCell}>{row.warehouseName}</td>
                          <td className={cx(ui.tableCell, 'text-right font-semibold text-slate-950')}>{row.quantity}</td>
                          <td className={cx(ui.tableCell, 'text-right text-slate-500')}>{row.expectedInboundQuantity}</td>
                          <td className={ui.tableCell}>{row.latestInbound}</td>
                          <td className={ui.tableCell}>{row.latestOutbound}</td>
                          <td className={ui.tableCell}>
                            <span className={cx('inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold', statusPillClass(row.status.tone))}>
                              {row.status.label}
                            </span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

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
                      <span className={cx('inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold', statusPillClass(row.status.tone))}>
                        {row.status.label}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-3 text-sm text-slate-600">
                      <div>
                        <p className="text-xs text-slate-400">현재 재고</p>
                        <p className="mt-1 text-lg font-semibold text-slate-950">{row.quantity}</p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-400">예정 입고</p>
                        <p className="mt-1 text-lg font-semibold text-slate-950">{row.expectedInboundQuantity}</p>
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
        </div>
      ) : null}

      {activeTab === 'inbound' || activeTab === 'outbound' ? (
        <div className="space-y-4">
          <div className={cx(ui.panel, ui.panelBody, 'space-y-4 md:p-5')}>
            <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
              <div>
                <h2 className="text-lg font-semibold tracking-tight text-slate-950">
                  {activeTab === 'inbound' ? '빠른 입고 workspace' : '빠른 출고 workspace'}
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  {selectedWarehouseName} 컨텍스트를 유지한 채 여러 행을 한 번에 등록합니다. 데스크톱은 dialog, 모바일은 full-height sheet로 열립니다.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setOverlayMode(activeTab === 'inbound' ? '입고' : '출고')}
                className={activeTab === 'inbound' ? ui.buttonPrimary : ui.buttonSecondary}
              >
                {activeTab === 'inbound' ? '입고 입력 열기' : '출고 입력 열기'}
              </button>
            </div>

            <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
              <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
                <h3 className="text-sm font-semibold text-slate-900">입력 원칙</h3>
                <ul className="mt-3 space-y-2 text-sm text-slate-600">
                  <li>2개 이상 SKU를 빠르게 등록할 때는 overlay 안에서 다건 입력을 유지합니다.</li>
                  <li>행 복제와 표 붙여넣기로 반복 입력을 줄입니다.</li>
                  <li>창고 컨텍스트는 허브와 동일하게 고정됩니다.</li>
                </ul>
              </div>

              <div className="surface p-4">
                <h3 className="text-sm font-semibold text-slate-900">최근 변동</h3>
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
                          <span className={cx('inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold', movementTone(movement.type))}>
                            {movement.type}
                          </span>
                          <p className="mt-1 text-sm font-semibold text-slate-950">{movement.quantity}</p>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {activeTab === 'csv' ? (
        <div className={cx(ui.panel, ui.panelBody, 'space-y-4 md:p-5')}>
          <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
            <div>
              <h2 className="text-lg font-semibold tracking-tight text-slate-950">CSV workspace</h2>
              <p className="mt-1 text-sm text-slate-500">
                선택된 창고에 대해 파일 업로드 또는 복사/붙여넣기 데이터로 일괄 반영합니다. 실제 저장은 기존 트랜잭션 경로를 그대로 사용합니다.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setCsvType('입고')}
                className={cx(csvType === '입고' ? ui.tabActive : ui.tab, 'min-h-11 rounded-2xl px-4')}
              >
                입고 CSV
              </button>
              <button
                type="button"
                onClick={() => setCsvType('출고')}
                className={cx(csvType === '출고' ? ui.tabActive : ui.tab, 'min-h-11 rounded-2xl px-4')}
              >
                출고 CSV
              </button>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4 text-sm text-slate-600">
            <p className="font-semibold text-slate-900">지원 컬럼</p>
            <p className="mt-1">`모델, 사이즈, 색상, 수량` 순서의 CSV 또는 탭 구분 표 데이터를 지원합니다.</p>
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
      ) : null}

      {activeTab === 'history' ? (
        <div className="space-y-4">
          <div className={cx(ui.panel, ui.panelBody, 'md:p-5')}>
            <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
              <div>
                <h2 className="text-lg font-semibold tracking-tight text-slate-950">이력 workspace</h2>
                <p className="mt-1 text-sm text-slate-500">
                  선택된 창고 컨텍스트를 유지한 채 입고, 출고, 재고조정 흐름을 이어서 추적합니다.
                </p>
              </div>
              <span className={ui.pill}>현재 컨텍스트: {selectedWarehouseName}</span>
            </div>
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
        description={`${selectedWarehouseName} 컨텍스트에 맞춰 여러 SKU를 한 번에 입력합니다.`}
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

'use client'

import { useMemo, useState } from 'react'
import { cx, ui } from '../../components/ui'

type TransactionItem = {
  id: number
  date: string
  type: string
  quantity: number
  warehouse: string
  warehouseId: number
  sourceChannel?: string | null
  referenceType?: string | null
  referenceId?: number | null
  memo?: string | null
  createdAt: string
  modelName: string
  sizeName: string
  colorName: string
  colorRgb: string
}

type ModelItem = { id: number; name: string }
type WarehouseItem = { id: number; name: string }

const PAGE_SIZE = 20

const typeStyle: Record<string, string> = {
  입고: 'bg-slate-100 text-slate-700',
  출고: 'bg-slate-200 text-slate-800',
  재고조정: 'bg-slate-100 text-slate-600',
}

function formatSourceChannel(sourceChannel?: string | null) {
  if (sourceChannel === 'manual') return '수동'
  if (sourceChannel === 'csv') return 'CSV'
  if (sourceChannel === 'factory-arrival') return '예정입고 반영'
  return '기본'
}

function formatSourceReference(referenceType?: string | null, referenceId?: number | null) {
  if (referenceType === 'factory_arrival' && referenceId) {
    return `공장 예정입고 #${referenceId}`
  }

  if (referenceType && referenceId) {
    return `${referenceType} #${referenceId}`
  }

  if (referenceType) {
    return referenceType
  }

  if (referenceId) {
    return `참조 #${referenceId}`
  }

  return ''
}

type HistoryViewProps = {
  transactions: TransactionItem[]
  models: ModelItem[]
  warehouses: WarehouseItem[]
  controlledWarehouseId?: number | ''
  embedded?: boolean
}

export default function HistoryView({
  transactions,
  models,
  warehouses,
  controlledWarehouseId,
  embedded = false,
}: HistoryViewProps) {
  const [filterModel, setFilterModel] = useState('')
  const [filterType, setFilterType] = useState('')
  const [filterWarehouseId, setFilterWarehouseId] = useState<number | ''>('')
  const [filterSourceChannel, setFilterSourceChannel] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [page, setPage] = useState(1)

  const effectiveWarehouseId = controlledWarehouseId !== undefined ? controlledWarehouseId : filterWarehouseId

  const filtered = useMemo(() => {
    let result = transactions
    if (filterModel) result = result.filter((item) => item.modelName === filterModel)
    if (filterType) result = result.filter((item) => item.type === filterType)
    if (filterSourceChannel) result = result.filter((item) => item.sourceChannel === filterSourceChannel)
    if (effectiveWarehouseId) result = result.filter((item) => item.warehouseId === effectiveWarehouseId)
    if (dateFrom) result = result.filter((item) => item.createdAt.slice(0, 10) >= dateFrom)
    if (dateTo) result = result.filter((item) => item.createdAt.slice(0, 10) <= dateTo)
    return result
  }, [transactions, filterModel, filterType, filterSourceChannel, effectiveWarehouseId, dateFrom, dateTo])

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const currentPage = Math.min(page, totalPages)
  const paged = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE)

  const resetFilters = () => {
    setFilterModel('')
    setFilterType('')
    setFilterSourceChannel('')
    if (controlledWarehouseId === undefined) {
      setFilterWarehouseId('')
    }
    setDateFrom('')
    setDateTo('')
    setPage(1)
  }

  return (
    <div className="space-y-4">
      {!embedded ? (
        <div className={cx(ui.panel, ui.panelBody, 'space-y-3')}>
          <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
            <div>
              <h2 className="text-sm font-semibold text-slate-900">조회 가이드</h2>
              <p className="mt-1 text-sm leading-6 text-slate-500">
                모델, 창고, 기간 조건을 조합해 특정 입고·출고 이력을 좁혀 보세요. 재고조정도 같은 목록에서 확인할 수 있습니다.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <span className={ui.pill}>조건별 필터</span>
              <span className={ui.pillMuted}>최근순 정렬</span>
            </div>
          </div>
        </div>
      ) : null}

      <div className={cx(ui.panel, ui.panelBody)}>
        <div className={cx('grid grid-cols-1 gap-3', controlledWarehouseId === undefined ? 'sm:grid-cols-2 lg:grid-cols-6' : 'sm:grid-cols-2 lg:grid-cols-5')}>
          <div>
            <label htmlFor="history-model" className={ui.label}>
              모델
            </label>
            <select
              id="history-model"
              value={filterModel}
              onChange={(event) => {
                setFilterModel(event.target.value)
                setPage(1)
              }}
              className={ui.controlSm}
            >
              <option value="">전체</option>
              {models.map((model) => (
                <option key={model.id} value={model.name}>
                  {model.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="history-type" className={ui.label}>
              구분
            </label>
            <select
              id="history-type"
              value={filterType}
              onChange={(event) => {
                setFilterType(event.target.value)
                setPage(1)
              }}
              className={ui.controlSm}
            >
              <option value="">전체</option>
              <option value="입고">입고</option>
              <option value="출고">출고</option>
              <option value="재고조정">재고조정</option>
            </select>
          </div>

          <div>
            <label htmlFor="history-source-channel" className={ui.label}>
              등록 방식
            </label>
            <select
              id="history-source-channel"
              value={filterSourceChannel}
              onChange={(event) => {
                setFilterSourceChannel(event.target.value)
                setPage(1)
              }}
              className={ui.controlSm}
            >
              <option value="">전체</option>
              <option value="manual">수동</option>
              <option value="csv">CSV</option>
              <option value="factory-arrival">예정입고 반영</option>
            </select>
          </div>

          {controlledWarehouseId === undefined ? (
            <div>
              <label htmlFor="history-warehouse" className={ui.label}>
                창고
              </label>
              <select
                id="history-warehouse"
                value={filterWarehouseId}
                onChange={(event) => {
                  setFilterWarehouseId(event.target.value ? Number(event.target.value) : '')
                  setPage(1)
                }}
                className={ui.controlSm}
              >
                <option value="">전체</option>
                {warehouses.map((warehouse) => (
                  <option key={warehouse.id} value={warehouse.id}>
                    {warehouse.name}
                  </option>
                ))}
              </select>
            </div>
          ) : (
            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3">
              <p className="text-xs font-medium text-slate-500">창고 컨텍스트</p>
              <p className="mt-1 text-sm font-semibold text-slate-950">
                {warehouses.find((warehouse) => warehouse.id === controlledWarehouseId)?.name ?? '전체 창고'}
              </p>
            </div>
          )}

          <div>
            <label htmlFor="history-date-from" className={ui.label}>
              시작일
            </label>
            <input
              id="history-date-from"
              type="date"
              value={dateFrom}
              onChange={(event) => {
                setDateFrom(event.target.value)
                setPage(1)
              }}
              className={ui.controlSm}
            />
          </div>

          <div>
            <label htmlFor="history-date-to" className={ui.label}>
              종료일
            </label>
            <input
              id="history-date-to"
              type="date"
              value={dateTo}
              onChange={(event) => {
                setDateTo(event.target.value)
                setPage(1)
              }}
              className={ui.controlSm}
            />
          </div>
        </div>

        {(filterModel || filterType || filterSourceChannel || filterWarehouseId || dateFrom || dateTo) && (
          <button onClick={resetFilters} className="mt-3 text-sm font-medium text-slate-600 hover:text-slate-950">
            필터 초기화
          </button>
        )}

        <div className="mt-2 text-sm text-slate-500">{filtered.length}건 조회됨</div>
      </div>

      <div className={cx('hidden md:block', ui.tableShell)}>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="ui-table-head text-left">
                <th className="px-4 py-3">날짜</th>
                <th className="px-4 py-3">모델</th>
                <th className="px-4 py-3">색상</th>
                <th className="px-4 py-3">사이즈</th>
                <th className="px-4 py-3">구분</th>
                <th className="px-4 py-3">출처 / 참조</th>
                <th className="px-4 py-3 text-right">수량</th>
                <th className="px-4 py-3">창고</th>
              </tr>
            </thead>
            <tbody>
              {paged.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center text-sm text-slate-400">
                    이력이 없습니다.
                  </td>
                </tr>
              ) : (
                paged.map((item) => (
                  <tr key={item.id} className="transition-colors hover:bg-slate-50">
                    <td className="ui-table-cell text-sm text-slate-700">{item.date}</td>
                    <td className="ui-table-cell text-sm font-medium text-slate-800">{item.modelName}</td>
                    <td className="ui-table-cell text-sm text-slate-700">
                      <div className="flex items-center gap-1.5">
                        <span
                          className="inline-block h-3 w-3 flex-shrink-0 rounded-full border border-slate-200"
                          style={{ backgroundColor: item.colorRgb }}
                        />
                        {item.colorName}
                      </div>
                    </td>
                    <td className="ui-table-cell text-sm text-slate-700">{item.sizeName}</td>
                    <td className="ui-table-cell">
                      <span className={`inline-block rounded-full px-2.5 py-1 text-xs font-semibold ${typeStyle[item.type] || 'bg-slate-100 text-slate-600'}`}>
                        {item.type}
                      </span>
                    </td>
                    <td className="ui-table-cell text-sm text-slate-600">
                      <div className="space-y-1">
                        <p>{formatSourceChannel(item.sourceChannel)}</p>
                        {formatSourceReference(item.referenceType, item.referenceId) ? (
                          <p className="text-xs text-slate-400">{formatSourceReference(item.referenceType, item.referenceId)}</p>
                        ) : null}
                        {item.memo ? <p className="text-xs text-slate-500">{item.memo}</p> : null}
                      </div>
                    </td>
                    <td className="ui-table-cell text-right text-sm font-semibold text-slate-800">{item.quantity}</td>
                    <td className="ui-table-cell text-sm text-slate-600">{item.warehouse}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="space-y-2 md:hidden">
        {paged.length === 0 ? (
          <div className={ui.emptyState}>이력이 없습니다.</div>
        ) : (
          paged.map((item) => (
            <div key={item.id} className="surface px-4 py-3">
              <div className="mb-2 flex items-center justify-between">
                <span className="text-sm text-slate-500">{item.date}</span>
                <span className={`inline-block rounded-full px-2.5 py-1 text-xs font-semibold ${typeStyle[item.type] || 'bg-slate-100 text-slate-600'}`}>
                  {item.type}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-base font-semibold text-slate-800">{item.modelName}</p>
                  <div className="mt-0.5 flex items-center gap-1.5 text-sm text-slate-500">
                    <span
                      className="inline-block h-3 w-3 rounded-full border border-slate-200"
                      style={{ backgroundColor: item.colorRgb }}
                    />
                    {item.colorName} / {item.sizeName} / {item.warehouse}
                  </div>
                  <div className="mt-1 space-y-0.5 text-xs text-slate-400">
                    <p>{formatSourceChannel(item.sourceChannel)}</p>
                    {formatSourceReference(item.referenceType, item.referenceId) ? (
                      <p>{formatSourceReference(item.referenceType, item.referenceId)}</p>
                    ) : null}
                    {item.memo ? <p>{item.memo}</p> : null}
                  </div>
                </div>
                <span className="text-xl font-bold text-slate-800">{item.quantity}</span>
              </div>
            </div>
          ))
        )}
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 pt-2">
          <button
            onClick={() => setPage((current) => Math.max(1, current - 1))}
            disabled={currentPage === 1}
            className="h-10 rounded-lg border border-slate-200 px-4 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
          >
            이전
          </button>
          <span className="px-3 text-sm text-slate-600">
            {currentPage} / {totalPages}
          </span>
          <button
            onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
            disabled={currentPage === totalPages}
            className="h-10 rounded-lg border border-slate-200 px-4 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
          >
            다음
          </button>
        </div>
      )}
    </div>
  )
}

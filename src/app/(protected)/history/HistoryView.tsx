'use client'

import { useMemo, useState } from 'react'
import { StatusBadge } from '@/components/ui/badge-1'
import { BasicDataTable } from '@/components/ui/basic-data-table'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
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
type SelectOption = { value: string; label: string; disabled?: boolean }
const EMPTY_SELECT_VALUE = '__empty__'

const PAGE_SIZE = 20

function SelectControl({
  value,
  onValueChange,
  options,
  placeholder,
  id,
  label,
  ariaLabel,
  disabled,
}: {
  value: string
  onValueChange: (value: string | null) => void
  options: SelectOption[]
  placeholder: string
  id?: string
  label?: string
  ariaLabel?: string
  disabled?: boolean
}) {
  return (
    <Select
      value={value === '' ? EMPTY_SELECT_VALUE : value}
      onValueChange={(next) => onValueChange(next === EMPTY_SELECT_VALUE ? null : next)}
      disabled={disabled}
    >
      {label ? (
        <label htmlFor={id} className={ui.label}>
          {label}
        </label>
      ) : null}
      <SelectTrigger id={id} aria-label={ariaLabel} className={ui.controlSm}>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {options.map((option) => (
          <SelectItem
            key={option.value || EMPTY_SELECT_VALUE}
            value={option.value === '' ? EMPTY_SELECT_VALUE : option.value}
            disabled={option.disabled}
          >
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
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
  const tableColumns = [
    { key: 'date', label: '날짜' },
    { key: 'model', label: '모델' },
    { key: 'color', label: '색상' },
    { key: 'size', label: '사이즈' },
    { key: 'type', label: '구분' },
    { key: 'source', label: '출처 / 참조' },
    { key: 'quantity', label: '수량', align: 'right' as const },
    { key: 'warehouse', label: '창고' },
  ]

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
      <div className={cx(ui.panel, ui.panelBody)}>
        {!embedded ? (
          <div className="flex flex-col gap-2 border-b border-slate-100 pb-3 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-sm font-semibold text-slate-900">이력 필터</h2>
              <p className="text-sm leading-6 text-slate-500">
                모델, 창고, 기간을 좁혀 입고·출고·재고조정 이력을 빠르게 확인하세요.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <span className={ui.pill}>조건별 필터</span>
              <span className={ui.pillMuted}>최근순 정렬</span>
            </div>
          </div>
        ) : null}

        <div className={cx('grid grid-cols-1 gap-3', controlledWarehouseId === undefined ? 'sm:grid-cols-2 lg:grid-cols-6' : 'sm:grid-cols-2 lg:grid-cols-5')}>
          <div>
            <SelectControl
              id="history-model"
              label="모델"
              value={filterModel}
              onValueChange={(value) => {
                setFilterModel(value ?? '')
                setPage(1)
              }}
              placeholder="전체"
              options={[{ value: '', label: '전체' }, ...models.map((model) => ({ value: model.name, label: model.name }))]}
            />
          </div>

          <div>
            <SelectControl
              id="history-type"
              label="구분"
              value={filterType}
              onValueChange={(value) => {
                setFilterType(value ?? '')
                setPage(1)
              }}
              placeholder="전체"
              options={[
                { value: '', label: '전체' },
                { value: '입고', label: '입고' },
                { value: '출고', label: '출고' },
                { value: '재고조정', label: '재고조정' },
              ]}
            />
          </div>

          <div>
            <SelectControl
              id="history-source-channel"
              label="등록 방식"
              value={filterSourceChannel}
              onValueChange={(value) => {
                setFilterSourceChannel(value ?? '')
                setPage(1)
              }}
              placeholder="전체"
              options={[
                { value: '', label: '전체' },
                { value: 'manual', label: '수동' },
                { value: 'csv', label: 'CSV' },
                { value: 'factory-arrival', label: '예정입고 반영' },
              ]}
            />
          </div>

          {controlledWarehouseId === undefined ? (
            <div>
              <SelectControl
                id="history-warehouse"
                label="창고"
                value={filterWarehouseId === '' ? '' : String(filterWarehouseId)}
                onValueChange={(value) => {
                  setFilterWarehouseId(value ? Number(value) : '')
                  setPage(1)
                }}
                placeholder="전체"
                options={[{ value: '', label: '전체' }, ...warehouses.map((warehouse) => ({ value: String(warehouse.id), label: warehouse.name }))]}
              />
            </div>
          ) : (
            <div className={cx(ui.controlSm, 'pointer-events-none flex flex-col justify-center bg-slate-50 text-slate-700')}>
              <span className="text-xs font-medium text-slate-500">창고 컨텍스트</span>
              <span className="text-sm font-semibold text-slate-950">
                {warehouses.find((warehouse) => warehouse.id === controlledWarehouseId)?.name ?? '전체 창고'}
              </span>
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

        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-3">
          {(filterModel || filterType || filterSourceChannel || filterWarehouseId || dateFrom || dateTo) ? (
            <button onClick={resetFilters} className="text-sm font-medium text-slate-600 hover:text-slate-950">
              필터 초기화
            </button>
          ) : (
            <span />
          )}
          <div className="text-sm text-slate-500">{filtered.length}건 조회됨</div>
        </div>
      </div>

      <BasicDataTable
        className="hidden md:block"
        columns={tableColumns}
        rows={paged}
        rowKey={(item) => item.id}
        emptyState="이력이 없습니다."
        renderCell={(item, columnKey) => {
          if (columnKey === 'date') return <span className="text-sm text-slate-700">{item.date}</span>
          if (columnKey === 'model') return <span className="text-sm font-medium text-slate-800">{item.modelName}</span>
          if (columnKey === 'color') {
            return (
              <div className="flex items-center gap-1.5 text-sm text-slate-700">
                <span
                  className="inline-block h-3 w-3 flex-shrink-0 rounded-full border border-slate-200"
                  style={{ backgroundColor: item.colorRgb }}
                />
                {item.colorName}
              </div>
            )
          }
          if (columnKey === 'size') return <span className="text-sm text-slate-700">{item.sizeName}</span>
          if (columnKey === 'type') {
            const tone = item.type === '입고' ? 'success' : item.type === '출고' ? 'danger' : 'neutral'
            return <StatusBadge tone={tone}>{item.type}</StatusBadge>
          }
          if (columnKey === 'source') {
            return (
              <div className="space-y-1 text-sm text-slate-600">
                <p>{formatSourceChannel(item.sourceChannel)}</p>
                {formatSourceReference(item.referenceType, item.referenceId) ? (
                  <p className="text-xs text-slate-400">{formatSourceReference(item.referenceType, item.referenceId)}</p>
                ) : null}
                {item.memo ? <p className="text-xs text-slate-500">{item.memo}</p> : null}
              </div>
            )
          }
          if (columnKey === 'quantity') return <span className="text-sm font-semibold text-slate-800">{item.quantity}</span>
          if (columnKey === 'warehouse') return <span className="text-sm text-slate-600">{item.warehouse}</span>
          return null
        }}
      />

      <div className="space-y-2 md:hidden">
        {paged.length === 0 ? (
          <div className={ui.emptyState}>이력이 없습니다.</div>
        ) : (
          paged.map((item) => (
            <div key={item.id} className="surface px-4 py-3">
              <div className="mb-2 flex items-center justify-between">
                <span className="text-sm text-slate-500">{item.date}</span>
                <StatusBadge tone={item.type === '입고' ? 'success' : item.type === '출고' ? 'danger' : 'neutral'}>
                  {item.type}
                </StatusBadge>
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

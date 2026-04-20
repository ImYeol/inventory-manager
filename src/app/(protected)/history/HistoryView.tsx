'use client'

import { useMemo, useState } from 'react'
import { CalendarDays, Search } from 'lucide-react'
import { revertTransaction } from '@/lib/actions'
import type { HistoryTransaction } from '@/lib/data'
import { formatDateLabel } from '@/lib/inventory'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { StatusBadge } from '@/components/ui/badge-1'
import { BasicDataTable } from '@/components/ui/basic-data-table'
import { FilterToolbar } from '@/components/ui/filter-toolbar'
import { Modal } from '@/components/ui/modal'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { cx, ui } from '../../components/ui'

type ModelItem = { id: number; name: string }
type WarehouseItem = { id: number; name: string }
type SelectOption = { value: string; label: string; disabled?: boolean }
type FeedbackState = { type: 'success' | 'error'; text: string } | null

const EMPTY_SELECT_VALUE = '__empty__'
const PAGE_SIZE = 20

export type HistoryFilterState = {
  warehouseId: number | ''
  type: string
  search: string
  dateFrom: string
  dateTo: string
}

const EMPTY_FILTERS: HistoryFilterState = {
  warehouseId: '',
  type: '',
  search: '',
  dateFrom: '',
  dateTo: '',
}

function SelectControl({
  value,
  onValueChange,
  options,
  placeholder,
  id,
  ariaLabel,
  disabled,
}: {
  value: string
  onValueChange: (value: string | null) => void
  options: SelectOption[]
  placeholder: string
  id?: string
  ariaLabel: string
  disabled?: boolean
}) {
  return (
    <Select
      value={value === '' ? EMPTY_SELECT_VALUE : value}
      onValueChange={(next) => onValueChange(next === EMPTY_SELECT_VALUE ? null : next)}
      disabled={disabled}
    >
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
  if (sourceChannel === 'manual' || sourceChannel == null) return '수동'
  if (sourceChannel === 'csv') return 'CSV'
  if (sourceChannel === 'factory-arrival') return '예정입고 반영'
  if (sourceChannel === 'history-revert') return '이력 되돌리기'
  return sourceChannel
}

function formatSourceReference(referenceType?: string | null, referenceId?: number | null) {
  if (referenceType === 'factory_arrival' && referenceId) {
    return `공장 예정입고 #${referenceId}`
  }

  if (referenceType === 'transaction_revert' && referenceId) {
    return `원본 이력 #${referenceId}`
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

function formatCreatedAt(value: string) {
  const date = new Date(value)
  const hours = String(date.getHours()).padStart(2, '0')
  const minutes = String(date.getMinutes()).padStart(2, '0')
  return `${formatDateLabel(value)} ${hours}:${minutes}`
}

type HistoryViewProps = {
  transactions: HistoryTransaction[]
  models: ModelItem[]
  warehouses: WarehouseItem[]
  filters?: HistoryFilterState
  onFiltersChange?: (next: HistoryFilterState) => void
  embedded?: boolean
}

export default function HistoryView({
  transactions,
  models: _models,
  warehouses,
  filters,
  onFiltersChange,
  embedded = false,
}: HistoryViewProps) {
  const [localFilters, setLocalFilters] = useState<HistoryFilterState>(EMPTY_FILTERS)
  const [page, setPage] = useState(1)
  const [pendingRevert, setPendingRevert] = useState<HistoryTransaction | null>(null)
  const [revertMemo, setRevertMemo] = useState('')
  const [revertSubmitting, setRevertSubmitting] = useState(false)
  const [revertError, setRevertError] = useState<string | null>(null)
  const [feedback, setFeedback] = useState<FeedbackState>(null)

  const activeFilters = filters ?? localFilters

  const setFilters = (next: HistoryFilterState | ((current: HistoryFilterState) => HistoryFilterState)) => {
    const resolved = typeof next === 'function' ? next(activeFilters) : next

    if (filters === undefined) {
      setLocalFilters(resolved)
    }

    onFiltersChange?.(resolved)
  }

  const updateFilters = (patch: Partial<HistoryFilterState>) => {
    setFilters((current) => ({
      ...current,
      ...patch,
    }))
    setPage(1)
  }

  const filtered = useMemo(() => {
    let result = transactions
    if (activeFilters.search.trim()) {
      const normalizedSearch = activeFilters.search.trim().toLowerCase()
      result = result.filter((item) => item.modelName.toLowerCase().includes(normalizedSearch))
    }
    if (activeFilters.type) result = result.filter((item) => item.type === activeFilters.type)
    if (activeFilters.warehouseId) result = result.filter((item) => item.warehouseId === activeFilters.warehouseId)
    if (activeFilters.dateFrom) result = result.filter((item) => item.createdAt.slice(0, 10) >= activeFilters.dateFrom)
    if (activeFilters.dateTo) result = result.filter((item) => item.createdAt.slice(0, 10) <= activeFilters.dateTo)
    return result
  }, [transactions, activeFilters])

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const currentPage = Math.min(page, totalPages)
  const paged = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE)
  const searchTitle = _models.length > 0 ? undefined : '등록된 모델이 없습니다.'
  const hasActiveFilters =
    activeFilters.search.trim().length > 0 ||
    activeFilters.type.length > 0 ||
    activeFilters.warehouseId !== '' ||
    activeFilters.dateFrom.length > 0 ||
    activeFilters.dateTo.length > 0

  const tableColumns = [
    { key: 'timestamp', label: '변동 시각' },
    { key: 'type', label: '구분' },
    { key: 'quantity', label: '수량', align: 'right' as const },
    { key: 'model', label: '상품' },
    { key: 'option', label: '옵션' },
    { key: 'source', label: '등록 방식 / 참조' },
    { key: 'warehouse', label: '창고' },
    { key: 'action', label: '작업' },
  ]

  const resetFilters = () => {
    setFilters(EMPTY_FILTERS)
    setPage(1)
  }

  const closeRevertModal = () => {
    setPendingRevert(null)
    setRevertMemo('')
    setRevertError(null)
  }

  const submitRevert = async () => {
    if (!pendingRevert) return

    try {
      setRevertSubmitting(true)
      setRevertError(null)
      await revertTransaction(pendingRevert.id, revertMemo)
      setFeedback({ type: 'success', text: '이력이 되돌려졌습니다.' })
      closeRevertModal()
    } catch (error) {
      setRevertError(error instanceof Error ? error.message : '이력 되돌리기에 실패했습니다.')
      setFeedback({ type: 'error', text: '이력 되돌리기에 실패했습니다.' })
    } finally {
      setRevertSubmitting(false)
    }
  }

  return (
    <div className={embedded ? 'space-y-3' : 'space-y-4'}>
      <FilterToolbar className="gap-3 sm:flex-col sm:flex-nowrap sm:items-stretch sm:justify-start">
        <div
          role="group"
          aria-label="기본 필터"
          className="flex flex-col gap-2.5 lg:flex-row lg:items-center lg:justify-between"
        >
          <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center">
            <div className="sm:w-[11rem]">
              <label htmlFor="history-warehouse" className="sr-only">
                창고
              </label>
              <SelectControl
                id="history-warehouse"
                ariaLabel="창고"
                value={activeFilters.warehouseId === '' ? '' : String(activeFilters.warehouseId)}
                onValueChange={(value) => updateFilters({ warehouseId: value ? Number(value) : '' })}
                placeholder="전체 창고"
                options={[{ value: '', label: '전체 창고' }, ...warehouses.map((warehouse) => ({ value: String(warehouse.id), label: warehouse.name }))]}
              />
            </div>

            <div className="sm:w-[9rem]">
              <SelectControl
                id="history-type"
                ariaLabel="구분"
                value={activeFilters.type}
                onValueChange={(value) => updateFilters({ type: value ?? '' })}
                placeholder="전체 구분"
                options={[
                  { value: '', label: '전체 구분' },
                  { value: '입고', label: '입고' },
                  { value: '출고', label: '출고' },
                  { value: '재고조정', label: '재고조정' },
                ]}
              />
            </div>
          </div>

          <div role="group" aria-label="필터 메타" className="flex items-center gap-2 self-start lg:self-auto">
            {hasActiveFilters ? (
              <Button type="button" variant="ghost" size="sm" onClick={resetFilters} className="h-9 px-2.5 text-sm">
                필터 초기화
              </Button>
            ) : null}
            <span className={cx(ui.statusPillDense, 'h-9 rounded-xl px-3 text-xs font-medium text-slate-600')}>
              조회 {filtered.length}건
            </span>
          </div>
        </div>

        <div role="group" aria-label="조회 필터" className="flex flex-col gap-2.5 lg:flex-row lg:items-center">
          <div data-testid="history-search-field" className="relative w-full sm:w-[12rem] lg:w-[12.5rem]">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <label htmlFor="history-search" className="sr-only">
              모델명 검색
            </label>
            <Input
              id="history-search"
              type="search"
              placeholder="모델명"
              value={activeFilters.search}
              onChange={(event) => updateFilters({ search: event.target.value })}
              className="pl-9"
              title={searchTitle}
            />
          </div>

          <div className="flex flex-col gap-2 rounded-xl border border-[color:var(--border)] bg-white px-3 py-2 sm:flex-row sm:items-center sm:gap-2.5">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-500">
              <CalendarDays className="h-3.5 w-3.5" />
              <span>기간</span>
            </div>
            <div className="flex items-center gap-2">
              <Input
                id="history-date-from"
                aria-label="시작일"
                type="date"
                value={activeFilters.dateFrom}
                onChange={(event) => updateFilters({ dateFrom: event.target.value })}
                className={cx(ui.controlSm, 'h-8 min-w-0 border-0 px-2 shadow-none sm:w-[9.5rem]')}
              />
              <span className="text-xs text-slate-400">-</span>
              <Input
                id="history-date-to"
                aria-label="종료일"
                type="date"
                value={activeFilters.dateTo}
                onChange={(event) => updateFilters({ dateTo: event.target.value })}
                className={cx(ui.controlSm, 'h-8 min-w-0 border-0 px-2 shadow-none sm:w-[9.5rem]')}
              />
            </div>
          </div>
        </div>
      </FilterToolbar>

      {feedback ? (
        <div
          role="status"
          className={cx(
            'rounded-xl border px-3 py-2 text-sm',
            feedback.type === 'success'
              ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
              : 'border-red-200 bg-red-50 text-red-700',
          )}
        >
          {feedback.text}
        </div>
      ) : null}

      <BasicDataTable
        className="hidden md:block"
        columns={tableColumns}
        rows={paged}
        rowKey={(item) => item.id}
        emptyState="이력이 없습니다."
        renderCell={(item, columnKey) => {
          if (columnKey === 'timestamp') return <span className="text-sm text-slate-700">{formatCreatedAt(item.createdAt)}</span>
          if (columnKey === 'type') {
            const tone = item.type === '입고' ? 'success' : item.type === '출고' ? 'danger' : 'neutral'
            return <StatusBadge tone={tone}>{item.type}</StatusBadge>
          }
          if (columnKey === 'quantity') {
            return <span className="text-sm font-semibold text-slate-800">{item.quantity}</span>
          }
          if (columnKey === 'model') return <span className="text-sm font-medium text-slate-900">{item.modelName}</span>
          if (columnKey === 'option') {
            return (
              <div className="flex items-center gap-1.5 text-sm text-slate-700">
                <span
                  className="inline-block h-3 w-3 flex-shrink-0 rounded-full border border-slate-200"
                  style={{ backgroundColor: item.colorRgb }}
                />
                <span>
                  {item.colorName} / {item.sizeName}
                </span>
              </div>
            )
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
          if (columnKey === 'warehouse') return <span className="text-sm text-slate-600">{item.warehouse}</span>
          if (columnKey === 'action') {
            if (!item.canRevert) {
              return <span className="text-xs font-medium text-slate-400">{item.revertDisabledReason}</span>
            }

            return (
              <Button
                type="button"
                variant="secondary"
                size="sm"
                className="h-9 px-3"
                onClick={() => {
                  setPendingRevert(item)
                  setRevertMemo('')
                  setRevertError(null)
                  setFeedback(null)
                }}
              >
                되돌리기
              </Button>
            )
          }
          return null
        }}
      />

      <div className="space-y-2 md:hidden">
        {paged.length === 0 ? (
          <div className={ui.emptyState}>이력이 없습니다.</div>
        ) : (
          paged.map((item) => (
            <div key={item.id} className={cx(ui.surface, 'space-y-3 px-4 py-3')}>
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-1">
                  <p className="text-sm text-slate-500">{formatCreatedAt(item.createdAt)}</p>
                  <p className="text-base font-semibold text-slate-900">{item.modelName}</p>
                </div>
                <div className="flex items-center gap-2">
                  <StatusBadge tone={item.type === '입고' ? 'success' : item.type === '출고' ? 'danger' : 'neutral'}>
                    {item.type}
                  </StatusBadge>
                  <span className="text-lg font-bold text-slate-900">{item.quantity}</span>
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center gap-1.5 text-sm text-slate-600">
                  <span
                    className="inline-block h-3 w-3 rounded-full border border-slate-200"
                    style={{ backgroundColor: item.colorRgb }}
                  />
                  <span>
                    {item.colorName} / {item.sizeName} / {item.warehouse}
                  </span>
                </div>
                <div className="space-y-0.5 text-xs text-slate-500">
                  <p>{formatSourceChannel(item.sourceChannel)}</p>
                  {formatSourceReference(item.referenceType, item.referenceId) ? (
                    <p>{formatSourceReference(item.referenceType, item.referenceId)}</p>
                  ) : null}
                  {item.memo ? <p>{item.memo}</p> : null}
                </div>
              </div>

              <div className="flex items-center justify-between gap-3 border-t border-slate-100 pt-3">
                {item.canRevert ? (
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    className="h-9 px-3"
                    onClick={() => {
                      setPendingRevert(item)
                      setRevertMemo('')
                      setRevertError(null)
                      setFeedback(null)
                    }}
                  >
                    되돌리기
                  </Button>
                ) : (
                  <span className="text-xs font-medium text-slate-400">{item.revertDisabledReason}</span>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 pt-2">
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={() => setPage((current) => Math.max(1, current - 1))}
            disabled={currentPage === 1}
            className="h-10 px-4"
          >
            이전
          </Button>
          <span className="px-3 text-sm text-slate-600">
            {currentPage} / {totalPages}
          </span>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
            disabled={currentPage === totalPages}
            className="h-10 px-4"
          >
            다음
          </Button>
        </div>
      )}

      <Modal
        open={pendingRevert !== null}
        title="이력 되돌리기 확인"
        description="원본 이력을 삭제하지 않고 보정 이력을 추가합니다."
        onOpenChange={(open) => {
          if (!open) closeRevertModal()
        }}
        footer={
          <>
            <Button type="button" variant="secondary" onClick={closeRevertModal} disabled={revertSubmitting}>
              취소
            </Button>
            <Button type="button" onClick={submitRevert} disabled={pendingRevert === null || revertSubmitting}>
              되돌리기
            </Button>
          </>
        }
      >
        {pendingRevert ? (
          <div className="space-y-4">
            <div className="rounded-2xl border border-[color:var(--border)] bg-[color:var(--surface-muted)] px-4 py-3">
              <p className="text-base font-semibold text-slate-950">{pendingRevert.modelName}</p>
              <p className="mt-1 text-sm text-slate-600">
                {pendingRevert.colorName} / {pendingRevert.sizeName} / {pendingRevert.warehouse}
              </p>
              <p className="mt-2 text-sm text-slate-500">
                {pendingRevert.type} {pendingRevert.quantity}개
              </p>
            </div>

            <div className="rounded-2xl border border-[color:var(--border)] bg-white px-4 py-3">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">보정 미리보기</p>
              <p className="mt-2 text-sm text-slate-700">{pendingRevert.revertSummary}</p>
            </div>

            <div>
              <label htmlFor="history-revert-memo" className={ui.label}>
                되돌리기 메모
              </label>
              <Input
                id="history-revert-memo"
                value={revertMemo}
                onChange={(event) => setRevertMemo(event.target.value)}
                placeholder="선택 입력"
              />
            </div>

            {revertError ? <p className="text-sm text-red-600">{revertError}</p> : null}
          </div>
        ) : null}
      </Modal>
    </div>
  )
}

'use client'

import { useMemo, useState } from 'react'
import type { ColumnDef } from '@tanstack/react-table'
import { revertTransaction } from '@/lib/actions'
import type { HistoryTransaction } from '@/lib/data'
import { formatDateLabel } from '@/lib/inventory'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { StatusBadge } from '@/components/ui/badge-1'
import { DataTable } from '@/components/ui/data-table'
import { ActionRow, FilterToolbar, QueryRow, ResponsiveFilterControls } from '@/components/ui/filter-toolbar'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  DialogDescription,
  DialogTitle,
  WorkDialog,
  WorkDialogBody,
  WorkDialogContent,
  WorkDialogFooter,
  WorkDialogHeader,
} from '@/components/ui/dialog'
import { cx, ui } from '../../components/ui'

type ModelItem = { id: number; name: string }
type WarehouseItem = { id: number; name: string }
type SelectOption = { value: string; label: string; disabled?: boolean }
type FeedbackState = { type: 'success' | 'error'; text: string } | null

const EMPTY_SELECT_VALUE = '__empty__'

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
  if (referenceType === 'factory_arrival' && referenceId) return `공장 예정입고 #${referenceId}`
  if (referenceType === 'transaction_revert' && referenceId) return `원본 이력 #${referenceId}`
  if (referenceType && referenceId) return `${referenceType} #${referenceId}`
  if (referenceType) return referenceType
  if (referenceId) return `참조 #${referenceId}`
  return ''
}

function formatCreatedAt(value: string) {
  const date = new Date(value)
  const hours = String(date.getHours()).padStart(2, '0')
  const minutes = String(date.getMinutes()).padStart(2, '0')
  return `${formatDateLabel(value)} ${hours}:${minutes}`
}

function formatSource(item: HistoryTransaction) {
  return [formatSourceChannel(item.sourceChannel), formatSourceReference(item.referenceType, item.referenceId), item.memo]
    .filter(Boolean)
    .join(' · ')
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
  models,
  warehouses,
  filters,
  onFiltersChange,
  embedded = false,
}: HistoryViewProps) {
  const [localFilters, setLocalFilters] = useState<HistoryFilterState>(EMPTY_FILTERS)
  const [pendingRevert, setPendingRevert] = useState<HistoryTransaction | null>(null)
  const [revertMemo, setRevertMemo] = useState('')
  const [revertSubmitting, setRevertSubmitting] = useState(false)
  const [revertError, setRevertError] = useState<string | null>(null)
  const [feedback, setFeedback] = useState<FeedbackState>(null)

  const activeFilters = filters ?? localFilters
  const setFilters = (next: HistoryFilterState | ((current: HistoryFilterState) => HistoryFilterState)) => {
    const resolved = typeof next === 'function' ? next(activeFilters) : next
    if (filters === undefined) setLocalFilters(resolved)
    onFiltersChange?.(resolved)
  }
  const updateFilters = (patch: Partial<HistoryFilterState>) => setFilters((current) => ({ ...current, ...patch }))

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

  const hasActiveFilters = Boolean(
    activeFilters.search.trim() ||
      activeFilters.type ||
      activeFilters.warehouseId !== '' ||
      activeFilters.dateFrom ||
      activeFilters.dateTo,
  )

  const resetFilters = () => setFilters(EMPTY_FILTERS)
  const openRevertDialog = (item: HistoryTransaction) => {
    setPendingRevert(item)
    setRevertMemo('')
    setRevertError(null)
    setFeedback(null)
  }
  const closeRevertDialog = () => {
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
      closeRevertDialog()
    } catch (error) {
      setRevertError(error instanceof Error ? error.message : '이력 되돌리기에 실패했습니다.')
      setFeedback({ type: 'error', text: '이력 되돌리기에 실패했습니다.' })
    } finally {
      setRevertSubmitting(false)
    }
  }

  const historyColumns: ColumnDef<HistoryTransaction, unknown>[] = [
    {
      id: 'timestamp',
      header: '변동 시각',
      accessorFn: (item) => item.createdAt,
      meta: { priority: 'high', truncate: 'secondary' },
      cell: ({ row }) => <span className="text-sm text-[color:var(--muted-foreground)]">{formatCreatedAt(row.original.createdAt)}</span>,
    },
    {
      accessorKey: 'type',
      header: '구분',
      meta: { role: 'status', minWidth: 'status', priority: 'high' },
      cell: ({ row }) => {
        const tone = row.original.type === '입고' ? 'success' : row.original.type === '출고' ? 'danger' : 'neutral'
        return <StatusBadge tone={tone}>{row.original.type}</StatusBadge>
      },
    },
    {
      accessorKey: 'quantity',
      header: '수량',
      meta: { role: 'numeric', minWidth: 'numeric', align: 'right', priority: 'high', cellClassName: 'font-semibold text-[color:var(--foreground)]' },
    },
    {
      accessorKey: 'modelName',
      header: '상품',
      meta: { role: 'identity', minWidth: 'identity', priority: 'high', truncate: 'primary', cellClassName: 'font-medium text-[color:var(--foreground)]' },
    },
    {
      id: 'option',
      header: '옵션',
      enableSorting: false,
      meta: { role: 'text', priority: 'medium', truncate: 'secondary' },
      accessorFn: (item) => `${item.colorName} / ${item.sizeName}`,
      cell: ({ row }) => (
        <div className="flex min-w-0 items-center gap-1.5 text-sm text-[color:var(--muted-foreground)]">
          <span
            aria-hidden="true"
            className="inline-block size-3 shrink-0 rounded-full border border-[color:var(--border)]"
            style={{ backgroundColor: row.original.colorRgb }}
          />
          <span className="truncate" title={`${row.original.colorName} / ${row.original.sizeName}`}>
            {row.original.colorName} / {row.original.sizeName}
          </span>
        </div>
      ),
    },
    {
      id: 'source',
      header: '등록 방식 / 참조',
      enableSorting: false,
      meta: { role: 'text', priority: 'low', truncate: 'secondary' },
      accessorFn: (item) => formatSource(item),
      cell: ({ row }) => <span className="text-sm text-[color:var(--muted-foreground)]">{formatSource(row.original)}</span>,
    },
    {
      accessorKey: 'warehouse',
      header: '창고',
      meta: { role: 'text', priority: 'medium', truncate: 'secondary' },
      cell: ({ getValue }) => <span className="text-sm text-[color:var(--muted-foreground)]">{getValue<string>()}</span>,
    },
    {
      id: 'action',
      header: '작업',
      enableSorting: false,
      enableHiding: false,
      meta: { role: 'action', priority: 'high' },
      cell: ({ row }) => {
        const item = row.original
        return item.canRevert ? (
          <Button type="button" variant="secondary" size="sm" onClick={() => openRevertDialog(item)}>
            되돌리기
          </Button>
        ) : (
          <span className="text-xs font-medium text-[color:var(--muted-foreground)]">{item.revertDisabledReason}</span>
        )
      },
    },
  ]

  const queryRow = (
    <div data-testid="history-query-row">
      <QueryRow className="overflow-visible">
      <div role="group" aria-label="조회 필터" className="flex min-w-0 flex-1 items-center gap-2">
        <div data-testid="history-search-field" className="min-w-0 flex-1">
          <label htmlFor="history-search" className="sr-only">모델명 검색</label>
          <Input
            id="history-search"
            type="search"
            placeholder="모델명 검색"
            value={activeFilters.search}
            onChange={(event) => updateFilters({ search: event.target.value })}
            className="w-full"
            title={models.length === 0 ? '등록된 모델이 없습니다.' : undefined}
          />
        </div>
        <ResponsiveFilterControls>
          <div role="group" aria-label="기본 필터" className="flex items-center gap-2">
            <SelectControl
              id="history-warehouse"
              ariaLabel="창고"
              value={activeFilters.warehouseId === '' ? '' : String(activeFilters.warehouseId)}
              onValueChange={(value) => updateFilters({ warehouseId: value ? Number(value) : '' })}
              placeholder="전체 창고"
              options={[{ value: '', label: '전체 창고' }, ...warehouses.map((warehouse) => ({ value: String(warehouse.id), label: warehouse.name }))]}
            />
            <SelectControl
              id="history-type"
              ariaLabel="구분"
              value={activeFilters.type}
              onValueChange={(value) => updateFilters({ type: value ?? '' })}
              placeholder="전체 구분"
              options={[{ value: '', label: '전체 구분' }, { value: '입고', label: '입고' }, { value: '출고', label: '출고' }, { value: '재고조정', label: '재고조정' }]}
            />
            <Input aria-label="시작일" type="date" value={activeFilters.dateFrom} onChange={(event) => updateFilters({ dateFrom: event.target.value })} className="w-[9.5rem]" />
            <Input aria-label="종료일" type="date" value={activeFilters.dateTo} onChange={(event) => updateFilters({ dateTo: event.target.value })} className="w-[9.5rem]" />
          </div>
        </ResponsiveFilterControls>
      </div>
      </QueryRow>
    </div>
  )

  const actionRow = (
    <div data-testid="history-action-row">
      <ActionRow>
      <div role="group" aria-label="필터 메타" className="flex items-center gap-2">
        <span className={cx(ui.dataMeta, 'whitespace-nowrap')}>조회 {filtered.length}건</span>
      </div>
      </ActionRow>
    </div>
  )

  return (
    <div className={embedded ? 'space-y-3' : 'space-y-4'}>
      {feedback ? <div role="status" className={cx('rounded-[var(--radius-control)] border px-3 py-2 text-sm', feedback.type === 'success' ? 'border-[color:var(--hue-success)] bg-[color:var(--surface-muted)] text-[color:var(--success-foreground)]' : 'border-[color:var(--hue-danger)] bg-[color:var(--surface-muted)] text-[color:var(--danger-foreground)]')}>{feedback.text}</div> : null}
      {embedded ? <FilterToolbar>{actionRow}{queryRow}</FilterToolbar> : null}
      <DataTable
        columns={historyColumns}
        rows={filtered}
        tableAriaLabel="이력"
        emptyState="이력이 없습니다."
        dataEmptyState="아직 기록된 이력이 없습니다."
        filteredEmptyState="조건에 맞는 이력이 없습니다."
        emptyStateKind={hasActiveFilters ? 'filtered' : 'dataset'}
        onResetFilters={resetFilters}
        initialPageSize={20}
        mode={embedded ? 'bare' : 'standalone'}
        queryRow={embedded ? undefined : queryRow}
        actionRow={embedded ? undefined : actionRow}
      />

      <WorkDialog open={pendingRevert !== null} onOpenChange={(open) => { if (!open) closeRevertDialog() }}>
        <WorkDialogContent>
          <WorkDialogHeader>
            <DialogTitle>이력 되돌리기 확인</DialogTitle>
            <DialogDescription>원본 이력을 삭제하지 않고 보정 이력을 추가합니다.</DialogDescription>
          </WorkDialogHeader>
          <WorkDialogBody>
            {pendingRevert ? (
              <div className="flex flex-col gap-4">
                <div className="rounded-[var(--radius-card)] border border-[color:var(--border)] bg-[color:var(--surface-muted)] px-4 py-3">
                  <p className="truncate text-base font-semibold text-[color:var(--foreground)]" title={pendingRevert.modelName}>{pendingRevert.modelName}</p>
                  <p className="mt-1 truncate text-sm text-[color:var(--muted-foreground)]">{pendingRevert.colorName} / {pendingRevert.sizeName} / {pendingRevert.warehouse}</p>
                  <p className="mt-2 text-sm text-[color:var(--muted-foreground)]">{pendingRevert.type} {pendingRevert.quantity}개</p>
                </div>
                <div className="rounded-[var(--radius-card)] border border-[color:var(--border)] bg-[color:var(--surface)] px-4 py-3">
                  <p className="text-xs font-semibold text-[color:var(--muted-foreground)]">보정 미리보기</p>
                  <p className="mt-2 text-sm text-[color:var(--muted-foreground)]">{pendingRevert.revertSummary}</p>
                </div>
                <div>
                  <label htmlFor="history-revert-memo" className={ui.label}>되돌리기 메모</label>
                  <Input id="history-revert-memo" value={revertMemo} onChange={(event) => setRevertMemo(event.target.value)} placeholder="선택 입력" />
                </div>
                {revertError ? <p role="alert" className="text-sm text-[color:var(--danger-foreground)]">{revertError}</p> : null}
              </div>
            ) : null}
          </WorkDialogBody>
          <WorkDialogFooter>
            <Button type="button" variant="secondary" onClick={closeRevertDialog} disabled={revertSubmitting}>취소</Button>
            <Button type="button" onClick={submitRevert} disabled={pendingRevert === null || revertSubmitting}>되돌리기</Button>
          </WorkDialogFooter>
        </WorkDialogContent>
      </WorkDialog>
    </div>
  )
}

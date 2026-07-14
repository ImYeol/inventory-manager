'use client'

import Link from 'next/link'
import { useEffect, useRef, useState, useTransition } from 'react'
import { History } from 'lucide-react'
import { StatusBadge } from '@/components/ui/badge-1'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import InventoryTrendChart from '@/app/(protected)/analytics/charts/InventoryTrendChart'
import TransactionBarChart from '@/app/(protected)/analytics/charts/TransactionBarChart'
import WarehouseCompareChart from '@/app/(protected)/analytics/charts/WarehouseCompareChart'
import {
  getInventoryHistory,
  getTransactionTrend,
  getWarehouseComparison,
  type InventoryHistoryItem,
  type TrendItem,
  type WarehouseCompareItem,
} from '@/lib/actions/analytics'
import { cx, ui } from './ui'

type DashboardMetric = {
  label: string
  value: string
  description: string
  href: string
  ariaLabel?: string
}

type WarehouseSummary = {
  id: number
  name: string
  quantity: number
}

type RecentActivity = {
  id: number
  date: string
  type: string
  modelName: string
  colorName: string
  sizeName: string
  warehouseName: string
  quantity: number
}

type ModelOption = {
  id: number
  name: string
}

type DashboardViewProps = {
  metrics: DashboardMetric[]
  warehouses: WarehouseSummary[]
  recentActivities: RecentActivity[]
  models: ModelOption[]
  initialInventoryHistory: InventoryHistoryItem[]
  initialTransactionTrend: TrendItem[]
  initialWarehouseComparison: WarehouseCompareItem[]
}

type Period = 'daily' | 'monthly' | 'yearly'

const periodLabels: Record<Period, string> = {
  daily: '일별',
  monthly: '월별',
  yearly: '연도별',
}

const activityTone = (type: string) => {
  if (type === '입고') return 'success'
  if (type === '출고') return 'danger'
  return 'neutral'
}

type RangePreset = '7d' | '30d' | '90d' | 'ytd' | 'all' | 'custom'

const rangePresetOptions: { value: RangePreset; label: string }[] = [
  { value: '7d', label: '최근 7일' },
  { value: '30d', label: '30일' },
  { value: '90d', label: '90일' },
  { value: 'ytd', label: '올해' },
  { value: 'all', label: '전체' },
  { value: 'custom', label: '직접 지정' },
]

function toISODate(date: Date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function computePresetRange(preset: RangePreset): { from: string; to: string } {
  if (preset === 'all' || preset === 'custom') return { from: '', to: '' }

  const today = new Date()
  const to = toISODate(today)

  if (preset === 'ytd') {
    return { from: `${today.getFullYear()}-01-01`, to }
  }

  const days = preset === '7d' ? 6 : preset === '30d' ? 29 : 89
  const from = new Date(today)
  from.setDate(from.getDate() - days)
  return { from: toISODate(from), to }
}

function DashboardControls({
  models,
  selectedModel,
  onModelChange,
  period,
  onPeriodChange,
  preset,
  onPresetChange,
  dateFrom,
  dateTo,
  onDateFromChange,
  onDateToChange,
}: {
  models: ModelOption[]
  selectedModel: number | undefined
  onModelChange: (next: number | undefined) => void
  period: Period
  onPeriodChange: (next: Period) => void
  preset: RangePreset
  onPresetChange: (next: RangePreset) => void
  dateFrom: string
  dateTo: string
  onDateFromChange: (next: string) => void
  onDateToChange: (next: string) => void
}) {
  return (
    <section className="ui-data-surface">
      <div className="flex flex-wrap items-center gap-x-5 gap-y-3 px-3.5 py-3">
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-[color:var(--muted-foreground)]">모델</span>
          <Select
            value={selectedModel !== undefined ? String(selectedModel) : 'all'}
            onValueChange={(value) => onModelChange(value === 'all' ? undefined : Number(value))}
          >
            <SelectTrigger aria-label="모델 필터" className={cx(ui.controlSm, 'w-[9.5rem]')}>
              <SelectValue placeholder="전체" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">전체</SelectItem>
              {models.map((model) => (
                <SelectItem key={model.id} value={String(model.id)}>
                  {model.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-[color:var(--muted-foreground)]">단위</span>
          <Select value={period} onValueChange={(next) => onPeriodChange(next as Period)}>
            <SelectTrigger aria-label="집계 단위" className={cx(ui.controlSm, 'w-[6.5rem]')}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {(Object.keys(periodLabels) as Period[]).map((option) => (
                <SelectItem key={option} value={option}>
                  {periodLabels[option]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className={cx(ui.tabsList, 'ml-auto')} role="group" aria-label="기간 범위">
          {rangePresetOptions.map((option) => {
            const active = preset === option.value
            return (
              <button
                key={option.value}
                type="button"
                aria-pressed={active}
                onClick={() => onPresetChange(option.value)}
                className={cx(active ? ui.tabActive : ui.tab, 'px-3 text-xs')}
              >
                {option.label}
              </button>
            )
          })}
        </div>
      </div>

      {preset === 'custom' ? (
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-[color:var(--border-strong)] bg-[color-mix(in_srgb,var(--surface-muted)_45%,white)] px-3.5 py-2.5">
          <div className="flex items-center gap-2">
            <label htmlFor="dashboard-from" className="text-xs font-medium text-[color:var(--muted-foreground)]">
              시작일
            </label>
            <input
              id="dashboard-from"
              type="date"
              value={dateFrom}
              max={dateTo || undefined}
              onChange={(event) => onDateFromChange(event.target.value)}
              className={cx(ui.controlSm, 'w-[9.5rem]')}
            />
          </div>
          <div className="flex items-center gap-2">
            <label htmlFor="dashboard-to" className="text-xs font-medium text-[color:var(--muted-foreground)]">
              종료일
            </label>
            <input
              id="dashboard-to"
              type="date"
              value={dateTo}
              min={dateFrom || undefined}
              onChange={(event) => onDateToChange(event.target.value)}
              className={cx(ui.controlSm, 'w-[9.5rem]')}
            />
          </div>
        </div>
      ) : null}
    </section>
  )
}

function ChartCardHeader({ title, description, loading }: { title: string; description: string; loading: boolean }) {
  return (
    <CardHeader className="flex flex-row items-start justify-between gap-3">
      <div className="min-w-0">
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </div>
      <StatusBadge tone={loading ? 'warning' : 'neutral'}>{loading ? '갱신 중' : '최신'}</StatusBadge>
    </CardHeader>
  )
}

type SharedFilters = {
  selectedModel: number | undefined
  period: Period
  dateFrom: string
  dateTo: string
}

function TrendCard({ filters, initialData }: { filters: SharedFilters; initialData: InventoryHistoryItem[] }) {
  const { selectedModel, period, dateFrom, dateTo } = filters
  const [data, setData] = useState(initialData)
  const [loading, startTransition] = useTransition()
  const didMount = useRef(false)

  useEffect(() => {
    if (!didMount.current) {
      didMount.current = true
      return
    }

    startTransition(async () => {
      const next = await getInventoryHistory(period, selectedModel, dateFrom || undefined, dateTo || undefined)
      setData(next)
    })
  }, [period, selectedModel, dateFrom, dateTo])

  return (
    <Card variant="strong" className="h-full overflow-hidden">
      <ChartCardHeader title="재고 추이" description="선택한 조건의 재고 흐름을 시간 축으로 확인합니다." loading={loading} />
      <CardContent className="px-3 py-3">
        <InventoryTrendChart data={data} />
      </CardContent>
    </Card>
  )
}

function FlowCard({ filters, initialData }: { filters: SharedFilters; initialData: TrendItem[] }) {
  const { selectedModel, period, dateFrom, dateTo } = filters
  const [data, setData] = useState(initialData)
  const [loading, startTransition] = useTransition()
  const didMount = useRef(false)

  useEffect(() => {
    if (!didMount.current) {
      didMount.current = true
      return
    }

    startTransition(async () => {
      const next = await getTransactionTrend(period, selectedModel, dateFrom || undefined, dateTo || undefined)
      setData(next)
    })
  }, [period, selectedModel, dateFrom, dateTo])

  return (
    <Card variant="strong" className="h-full overflow-hidden">
      <ChartCardHeader title="입출고 현황" description="입고와 출고를 기간별로 나란히 봅니다." loading={loading} />
      <CardContent className="px-3 py-3">
        <TransactionBarChart data={data} />
      </CardContent>
    </Card>
  )
}

function WarehouseCard({ filters, initialData }: { filters: SharedFilters; initialData: WarehouseCompareItem[] }) {
  const { selectedModel, dateFrom, dateTo } = filters
  const [data, setData] = useState(initialData)
  const [loading, startTransition] = useTransition()
  const didMount = useRef(false)

  useEffect(() => {
    if (!didMount.current) {
      didMount.current = true
      return
    }

    startTransition(async () => {
      const next = await getWarehouseComparison(selectedModel, dateFrom || undefined, dateTo || undefined)
      setData(next)
    })
  }, [selectedModel, dateFrom, dateTo])

  return (
    <Card variant="strong" className="h-full overflow-hidden">
      <ChartCardHeader title="창고별 비교" description="선택한 기간에서 창고별 순변동을 비교합니다." loading={loading} />
      <CardContent className="px-3 py-3">
        <WarehouseCompareChart data={data} />
      </CardContent>
    </Card>
  )
}

export default function DashboardView({
  metrics,
  warehouses,
  recentActivities,
  models,
  initialInventoryHistory,
  initialTransactionTrend,
  initialWarehouseComparison,
}: DashboardViewProps) {
  const maxWarehouseQty = Math.max(...warehouses.map((warehouse) => warehouse.quantity), 1)

  const [selectedModel, setSelectedModel] = useState<number | undefined>()
  const [period, setPeriod] = useState<Period>('monthly')
  const [preset, setPreset] = useState<RangePreset>('all')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')

  const handlePresetChange = (next: RangePreset) => {
    setPreset(next)
    if (next !== 'custom') {
      const range = computePresetRange(next)
      setDateFrom(range.from)
      setDateTo(range.to)
    }
  }

  const filters: SharedFilters = { selectedModel, period, dateFrom, dateTo }

  return (
    <div className="space-y-4">
      <div className="grid gap-3 md:grid-cols-3">
        {metrics.map((metric) => (
          <Card key={metric.label} variant="strong" className="overflow-hidden">
            <Link
              href={metric.href}
              aria-label={metric.ariaLabel ?? metric.label}
              className="block h-full rounded-[inherit] px-3.5 py-3 transition-colors hover:bg-[color:var(--surface-muted)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--focus-ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-[color:var(--surface)] md:px-4 md:py-3.5"
            >
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[color:var(--muted-foreground)]">{metric.label}</p>
              <div className="mt-2 flex items-end justify-between gap-3">
                <p className="text-2xl font-semibold tracking-tight text-[color:var(--foreground)]">{metric.value}</p>
                <span className="max-w-[11rem] text-right text-xs leading-5 text-[color:var(--muted-foreground)]">{metric.description}</span>
              </div>
            </Link>
          </Card>
        ))}
      </div>

      <DashboardControls
        models={models}
        selectedModel={selectedModel}
        onModelChange={setSelectedModel}
        period={period}
        onPeriodChange={setPeriod}
        preset={preset}
        onPresetChange={handlePresetChange}
        dateFrom={dateFrom}
        dateTo={dateTo}
        onDateFromChange={setDateFrom}
        onDateToChange={setDateTo}
      />

      <div className="grid gap-4 xl:grid-cols-3">
        <TrendCard filters={filters} initialData={initialInventoryHistory} />
        <FlowCard filters={filters} initialData={initialTransactionTrend} />
        <WarehouseCard filters={filters} initialData={initialWarehouseComparison} />
      </div>

      <Card variant="strong" className="overflow-hidden">
        <CardHeader className="flex flex-row items-start justify-between gap-3 px-4 py-3">
          <div>
            <CardTitle>창고별 재고</CardTitle>
            <CardDescription>창고별 현재 재고를 바로 훑습니다.</CardDescription>
          </div>
          <StatusBadge tone="neutral">{warehouses.length}개 창고</StatusBadge>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table aria-label="창고별 재고">
              <TableHeader>
                <TableRow>
                  <TableHead>창고</TableHead>
                  <TableHead className="text-right">현재 재고</TableHead>
                  <TableHead className="w-[45%]">비중</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {warehouses.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={3} className="py-8 text-center text-sm text-[color:var(--muted-foreground)]">
                      등록된 창고가 없습니다.
                    </TableCell>
                  </TableRow>
                ) : (
                  warehouses.map((warehouse) => {
                    const percent = Math.round((warehouse.quantity / maxWarehouseQty) * 100)

                    return (
                      <TableRow key={warehouse.id}>
                        <TableCell className="font-medium text-[color:var(--foreground)]">{warehouse.name}</TableCell>
                        <TableCell className="text-right font-semibold text-[color:var(--foreground)]">{warehouse.quantity}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div className="h-2 flex-1 overflow-hidden rounded-full bg-[color:var(--surface-muted)]">
                              <div className="h-full rounded-full bg-[color:var(--foreground)]" style={{ width: `${percent}%` }} />
                            </div>
                            <span className="w-10 text-right text-xs font-medium text-[color:var(--muted-foreground)]">{percent}%</span>
                          </div>
                        </TableCell>
                      </TableRow>
                    )
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Card variant="strong" className="overflow-hidden">
        <CardHeader className="flex flex-row items-start justify-between gap-3 px-4 py-3">
          <div>
            <CardTitle>최근 처리 이력</CardTitle>
            <CardDescription>마지막 작업만 빠르게 훑을 수 있게 정리했습니다.</CardDescription>
          </div>
          <Link href="/history" className={cx(ui.buttonSecondary, 'h-9 px-3')}>
            <History className="mr-2 h-4 w-4" />
            이력 보기
          </Link>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table aria-label="최근 처리 이력">
              <TableHeader>
                <TableRow>
                  <TableHead>유형</TableHead>
                  <TableHead>상품</TableHead>
                  <TableHead>옵션</TableHead>
                  <TableHead>창고</TableHead>
                  <TableHead className="text-right">수량</TableHead>
                  <TableHead className="text-right">일자</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentActivities.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="py-8 text-center text-sm text-[color:var(--muted-foreground)]">
                      최근 처리 이력이 없습니다.
                    </TableCell>
                  </TableRow>
                ) : (
                  recentActivities.map((activity) => (
                    <TableRow key={activity.id}>
                      <TableCell>
                        <StatusBadge tone={activityTone(activity.type)}>{activity.type}</StatusBadge>
                      </TableCell>
                      <TableCell className="font-medium text-[color:var(--foreground)]">{activity.modelName}</TableCell>
                      <TableCell>
                        {activity.colorName} / {activity.sizeName}
                      </TableCell>
                      <TableCell>{activity.warehouseName}</TableCell>
                      <TableCell className="text-right font-semibold text-[color:var(--foreground)]">{activity.quantity}</TableCell>
                      <TableCell className="text-right text-[color:var(--muted-foreground)]">{activity.date}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

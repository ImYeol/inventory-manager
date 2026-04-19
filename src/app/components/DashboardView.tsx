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

type AttentionItem = {
  id: number
  name: string
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
  attentionItems: AttentionItem[]
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

function ControlStrip({
  idPrefix,
  title,
  models,
  period,
  showPeriod,
  selectedModel,
  dateFrom,
  dateTo,
  onPeriodChange,
  onModelChange,
  onDateFromChange,
  onDateToChange,
  loading,
}: {
  idPrefix: string
  title: string
  models: ModelOption[]
  period?: Period
  showPeriod?: boolean
  selectedModel: number | undefined
  dateFrom: string
  dateTo: string
  onPeriodChange?: (next: Period) => void
  onModelChange: (next: number | undefined) => void
  onDateFromChange: (next: string) => void
  onDateToChange: (next: string) => void
  loading: boolean
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-3">
      <div className={cx('grid gap-3', showPeriod ? 'lg:grid-cols-4' : 'lg:grid-cols-3')}>
        {showPeriod ? (
          <div className="space-y-2">
            <label className={ui.label}>{title} 기간</label>
            <div className="flex flex-wrap gap-1.5">
              {(Object.keys(periodLabels) as Period[]).map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => onPeriodChange?.(option)}
                  className={cx('h-9 px-3', period === option ? ui.tabActive : ui.tab)}
                  aria-pressed={period === option}
                >
                  {periodLabels[option]}
                </button>
              ))}
            </div>
          </div>
        ) : null}

        <div className="space-y-2">
          <label id={`${idPrefix}-model-label`} className={ui.label}>
            {title} 모델
          </label>
          <Select
            value={selectedModel !== undefined ? String(selectedModel) : 'all'}
            onValueChange={(value) => onModelChange(value === 'all' ? undefined : Number(value))}
          >
            <SelectTrigger aria-labelledby={`${idPrefix}-model-label`} className={ui.controlSm}>
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

        <div className="space-y-2">
          <label htmlFor={`${idPrefix}-from`} className={ui.label}>
            {title} 시작일
          </label>
          <input
            id={`${idPrefix}-from`}
            type="date"
            value={dateFrom}
            onChange={(event) => onDateFromChange(event.target.value)}
            className={ui.controlSm}
          />
        </div>

        <div className="space-y-2">
          <label htmlFor={`${idPrefix}-to`} className={ui.label}>
            {title} 종료일
          </label>
          <input
            id={`${idPrefix}-to`}
            type="date"
            value={dateTo}
            onChange={(event) => onDateToChange(event.target.value)}
            className={ui.controlSm}
          />
        </div>
      </div>

      <div className="mt-2 flex items-center justify-between gap-2">
        <p className={ui.helpText}>필터 변경 시 해당 차트만 다시 계산합니다.</p>
        <StatusBadge tone={loading ? 'warning' : 'neutral'}>{loading ? '갱신 중' : '최신'}</StatusBadge>
      </div>
    </div>
  )
}

function TrendCard({
  models,
  initialData,
}: {
  models: ModelOption[]
  initialData: InventoryHistoryItem[]
}) {
  const [period, setPeriod] = useState<Period>('monthly')
  const [selectedModel, setSelectedModel] = useState<number | undefined>()
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
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
    <Card className="h-full">
      <CardHeader>
        <CardTitle>재고 추이</CardTitle>
        <CardDescription>선택한 조건의 재고 흐름을 시간 축으로 확인합니다.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <ControlStrip
          idPrefix="trend"
          title="재고 추이"
          models={models}
          period={period}
          selectedModel={selectedModel}
          dateFrom={dateFrom}
          dateTo={dateTo}
          onPeriodChange={setPeriod}
          onModelChange={setSelectedModel}
          onDateFromChange={setDateFrom}
          onDateToChange={setDateTo}
          loading={loading}
        />
        <InventoryTrendChart data={data} />
      </CardContent>
    </Card>
  )
}

function FlowCard({
  models,
  initialData,
}: {
  models: ModelOption[]
  initialData: TrendItem[]
}) {
  const [period, setPeriod] = useState<Period>('monthly')
  const [selectedModel, setSelectedModel] = useState<number | undefined>()
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
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
    <Card className="h-full">
      <CardHeader>
        <CardTitle>입출고 현황</CardTitle>
        <CardDescription>입고와 출고를 기간별로 나란히 봅니다.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <ControlStrip
          idPrefix="flow"
          title="입출고 현황"
          models={models}
          period={period}
          selectedModel={selectedModel}
          dateFrom={dateFrom}
          dateTo={dateTo}
          onPeriodChange={setPeriod}
          onModelChange={setSelectedModel}
          onDateFromChange={setDateFrom}
          onDateToChange={setDateTo}
          loading={loading}
        />
        <TransactionBarChart data={data} />
      </CardContent>
    </Card>
  )
}

function WarehouseCard({
  models,
  initialData,
}: {
  models: ModelOption[]
  initialData: WarehouseCompareItem[]
}) {
  const [selectedModel, setSelectedModel] = useState<number | undefined>()
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
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
    <Card className="h-full">
      <CardHeader>
        <CardTitle>창고별 비교</CardTitle>
        <CardDescription>선택한 기간에서 창고별 순변동을 비교합니다.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <ControlStrip
          idPrefix="warehouse"
          title="창고별 비교"
          models={models}
          showPeriod={false}
          selectedModel={selectedModel}
          dateFrom={dateFrom}
          dateTo={dateTo}
          onModelChange={setSelectedModel}
          onDateFromChange={setDateFrom}
          onDateToChange={setDateTo}
          loading={loading}
        />
        <WarehouseCompareChart data={data} />
      </CardContent>
    </Card>
  )
}

export default function DashboardView({
  metrics,
  warehouses,
  recentActivities,
  attentionItems,
  models,
  initialInventoryHistory,
  initialTransactionTrend,
  initialWarehouseComparison,
}: DashboardViewProps) {
  const maxWarehouseQty = Math.max(...warehouses.map((warehouse) => warehouse.quantity), 1)

  return (
    <div className="space-y-4">
      <Card variant="strong">
        <CardContent className="p-4 md:p-5">
          <div className="grid gap-3 xl:grid-cols-4">
            {metrics.map((metric) => (
              <Card key={metric.label} variant="strong" className="overflow-hidden">
                <Link
                  href={metric.href}
                  aria-label={metric.ariaLabel ?? metric.label}
                  className="block h-full rounded-[inherit] px-4 py-3 transition-colors hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--focus-ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-white md:px-5 md:py-4"
                >
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">{metric.label}</p>
                  <div className="mt-2 flex items-end justify-between gap-3">
                    <p className="text-2xl font-semibold tracking-tight text-slate-950">{metric.value}</p>
                    <span className="max-w-[11rem] text-right text-xs leading-5 text-slate-500">{metric.description}</span>
                  </div>
                </Link>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 xl:grid-cols-3">
        <TrendCard models={models} initialData={initialInventoryHistory} />
        <FlowCard models={models} initialData={initialTransactionTrend} />
        <WarehouseCard models={models} initialData={initialWarehouseComparison} />
      </div>

      <div className="grid gap-4 xl:grid-cols-[0.92fr_1.08fr]">
        <Card>
          <CardHeader className="flex flex-row items-start justify-between gap-3">
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
                      <TableCell colSpan={3} className="py-8 text-center text-sm text-slate-500">
                        등록된 창고가 없습니다.
                      </TableCell>
                    </TableRow>
                  ) : (
                    warehouses.map((warehouse) => {
                      const percent = Math.round((warehouse.quantity / maxWarehouseQty) * 100)

                      return (
                        <TableRow key={warehouse.id}>
                          <TableCell className="font-medium text-slate-950">{warehouse.name}</TableCell>
                          <TableCell className="text-right font-semibold text-slate-950">{warehouse.quantity}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-100">
                                <div className="h-full rounded-full bg-slate-900" style={{ width: `${percent}%` }} />
                              </div>
                              <span className="w-10 text-right text-xs font-medium text-slate-500">{percent}%</span>
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

        <Card>
          <CardHeader className="flex flex-row items-start justify-between gap-3">
            <div>
              <CardTitle>주의 품목</CardTitle>
              <CardDescription>재고가 낮은 항목만 먼저 확인합니다.</CardDescription>
            </div>
            <StatusBadge tone="warning">{attentionItems.length}개</StatusBadge>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table aria-label="주의 품목">
                <TableHeader>
                  <TableRow>
                    <TableHead>상품</TableHead>
                    <TableHead className="text-right">재고</TableHead>
                    <TableHead>상태</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {attentionItems.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={3} className="py-8 text-center text-sm text-slate-500">
                        현재 부족 또는 품절 품목이 없습니다.
                      </TableCell>
                    </TableRow>
                  ) : (
                    attentionItems.slice(0, 5).map((item) => (
                      <TableRow key={item.id}>
                        <TableCell className="font-medium text-slate-950">{item.name}</TableCell>
                        <TableCell className="text-right font-semibold text-amber-700">{item.quantity}</TableCell>
                        <TableCell>
                          <StatusBadge tone="warning">우선 확인</StatusBadge>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-start justify-between gap-3">
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
                    <TableCell colSpan={6} className="py-8 text-center text-sm text-slate-500">
                      최근 처리 이력이 없습니다.
                    </TableCell>
                  </TableRow>
                ) : (
                  recentActivities.map((activity) => (
                    <TableRow key={activity.id}>
                      <TableCell>
                        <StatusBadge tone={activityTone(activity.type)}>{activity.type}</StatusBadge>
                      </TableCell>
                      <TableCell className="font-medium text-slate-950">{activity.modelName}</TableCell>
                      <TableCell>
                        {activity.colorName} / {activity.sizeName}
                      </TableCell>
                      <TableCell>{activity.warehouseName}</TableCell>
                      <TableCell className="text-right font-semibold text-slate-950">{activity.quantity}</TableCell>
                      <TableCell className="text-right text-slate-500">{activity.date}</TableCell>
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

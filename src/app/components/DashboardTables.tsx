'use client'

import { useMemo, useState } from 'react'
import type { ColumnDef } from '@tanstack/react-table'
import { StatusBadge } from '@/components/ui/badge-1'
import { DataTable } from '@/components/ui/data-table'
import { TruncatedText } from '@/components/ui/truncated-text'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import type { OperationsDashboardData } from '@/lib/actions/dashboard'

type WarehouseSummary = OperationsDashboardData['warehouses'][number]
type ExceptionSummary = OperationsDashboardData['exceptions'][number]
type SourcingSummary = OperationsDashboardData['upcomingSourcing'][number]
type FlowPoint = OperationsDashboardData['flow'][number]

const channelMeta = {
  coupang: { label: '쿠팡', tone: 'info' as const },
  naver: { label: '네이버', tone: 'success' as const },
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat('ko-KR', { month: 'short', day: 'numeric' }).format(new Date(`${value}T00:00:00`))
}

const warehouseColumns: ColumnDef<WarehouseSummary, unknown>[] = [
  {
    id: 'name',
    header: '창고',
    accessorFn: (warehouse) => warehouse.name,
    meta: { role: 'identity', minWidth: 'identity', truncate: 'primary' },
    cell: ({ getValue }) => <TruncatedText value={getValue<string>()}>{getValue<string>()}</TruncatedText>,
  },
  { id: 'onHand', header: '실재고', accessorFn: (warehouse) => warehouse.onHand, meta: { role: 'numeric', align: 'right' } },
  { id: 'committed', header: '예약', accessorFn: (warehouse) => warehouse.committed, meta: { role: 'numeric', align: 'right' } },
  {
    id: 'available',
    header: '가용',
    accessorFn: (warehouse) => warehouse.available,
    meta: { role: 'numeric', align: 'right', cellClassName: 'font-semibold text-[color:var(--foreground)]' },
  },
]

const exceptionColumns: ColumnDef<ExceptionSummary, unknown>[] = [
  {
    id: 'channel',
    header: '채널',
    enableSorting: false,
    meta: { role: 'status', align: 'center' },
    cell: ({ row }) => <StatusBadge tone={channelMeta[row.original.channel].tone}>{channelMeta[row.original.channel].label}</StatusBadge>,
  },
  {
    id: 'externalOrderId',
    header: '주문번호',
    accessorFn: (item) => item.externalOrderId,
    meta: { role: 'identity', minWidth: 'identity', truncate: 'primary' },
    cell: ({ getValue }) => <TruncatedText value={getValue<string>()} variant="primary">{getValue<string>()}</TruncatedText>,
  },
  {
    id: 'customerName',
    header: '수취인',
    accessorFn: (item) => item.customerName,
    meta: { truncate: 'secondary' },
    cell: ({ getValue }) => <TruncatedText value={getValue<string>()}>{getValue<string>()}</TruncatedText>,
  },
  { id: 'reason', header: '사유', enableSorting: false, meta: { role: 'status', align: 'center' }, cell: ({ row }) => <StatusBadge tone="warning">{row.original.reason}</StatusBadge> },
]

const sourcingColumns: ColumnDef<SourcingSummary, unknown>[] = [
  { id: 'expectedDate', header: '도착 예정', accessorFn: (item) => item.expectedDate, meta: { role: 'text' }, cell: ({ getValue }) => <span className="font-medium">{formatDate(getValue<string>())}</span> },
  {
    id: 'factoryName',
    header: '공장',
    accessorFn: (item) => item.factoryName,
    meta: { role: 'identity', minWidth: 'identity', truncate: 'primary' },
    cell: ({ getValue }) => <TruncatedText value={getValue<string>()} variant="primary">{getValue<string>()}</TruncatedText>,
  },
  { id: 'referenceCode', header: '발주 참조', accessorFn: (item) => item.referenceCode ?? '-', meta: { truncate: 'secondary' }, cell: ({ getValue }) => <TruncatedText value={getValue<string>()}>{getValue<string>()}</TruncatedText> },
  { id: 'remainingQuantity', header: '미입고', accessorFn: (item) => item.remainingQuantity, meta: { role: 'numeric', align: 'right', cellClassName: 'font-semibold text-[color:var(--foreground)]' }, cell: ({ getValue }) => `${getValue<number>()}개` },
]

export function DashboardWarehouseTable({ rows }: { rows: WarehouseSummary[] }) {
  return <DataTable bare tableAriaLabel="창고별 재고 상태" columns={warehouseColumns} rows={rows} emptyState="등록된 창고가 없습니다." />
}

export function DashboardExceptionTable({ rows }: { rows: ExceptionSummary[] }) {
  return <DataTable bare tableAriaLabel="처리해야 할 주문 예외" columns={exceptionColumns} rows={rows} emptyState="확인할 주문 예외가 없습니다." />
}

export function DashboardSourcingTable({ rows }: { rows: SourcingSummary[] }) {
  return <DataTable bare tableAriaLabel="곧 도착할 소싱" columns={sourcingColumns} rows={rows} emptyState="예정된 소싱 입고가 없습니다." />
}

function ChartSelect({ label, value, onValueChange, items }: { label: string; value: string; onValueChange: (value: string) => void; items: Array<{ value: string; label: string }> }) {
  return (
    <label className="flex shrink-0 items-center gap-2 text-xs text-[color:var(--muted-foreground)]">
      <span className="sr-only">{label}</span>
      <Select value={value} onValueChange={onValueChange}>
        <SelectTrigger aria-label={label} className="h-9 w-fit min-w-20 px-3 text-xs">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {items.map((item) => <SelectItem key={item.value} value={item.value}>{item.label}</SelectItem>)}
        </SelectContent>
      </Select>
    </label>
  )
}

function ChartFrame({ title, description, controls, children }: { title: string; description: string; controls: React.ReactNode; children: React.ReactNode }) {
  return (
    <Card variant="strong" className="min-w-0">
      <CardHeader className="gap-3 px-4 py-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0"><CardTitle>{title}</CardTitle><CardDescription>{description}</CardDescription></div>
          <div className="flex shrink-0 items-center gap-2">{controls}</div>
        </div>
      </CardHeader>
      <CardContent className="px-4 pb-4 pt-0">{children}</CardContent>
    </Card>
  )
}

function FlowBars({ rows, mode }: { rows: FlowPoint[]; mode: 'all' | 'inbound' | 'outbound' }) {
  const max = Math.max(...rows.flatMap((row) => mode === 'all' ? [row.inbound, row.outbound] : [row[mode]]), 1)
  return (
    <div className="flex h-44 items-end gap-1 border-b border-[color:var(--border)]" role="img" aria-label="거래 추이 막대 차트">
      {rows.map((row) => (
        <div key={row.date} className="flex min-w-0 flex-1 flex-col items-center gap-1" aria-label={`${row.label} 입고 ${row.inbound}, 출고 ${row.outbound}`}>
          <div className="flex h-32 w-full items-end justify-center gap-0.5">
            {(mode === 'all' || mode === 'inbound') && <div className="w-2 rounded-t-sm bg-[color:var(--accent)]" style={{ height: `${Math.max((row.inbound / max) * 100, row.inbound ? 5 : 0)}%` }} />}
            {(mode === 'all' || mode === 'outbound') && <div className="w-2 rounded-t-sm bg-[color:var(--muted-foreground)]" style={{ height: `${Math.max((row.outbound / max) * 100, row.outbound ? 5 : 0)}%` }} />}
          </div>
          <span className="truncate text-[10px] text-[color:var(--muted-foreground)]">{row.label}</span>
        </div>
      ))}
    </div>
  )
}

function InventoryLine({ rows }: { rows: Array<{ label: string; quantity: number }> }) {
  const max = Math.max(...rows.map((row) => row.quantity), 1)
  return (
    <div className="flex h-44 items-end gap-1 border-b border-[color:var(--border)]" role="img" aria-label="재고 추이 선형 차트">
      {rows.map((row) => <div key={row.label} className="flex min-w-0 flex-1 flex-col items-center gap-1"><div className="flex h-32 w-full items-end"><div className="w-full rounded-t-sm bg-[color:var(--info-foreground)]" style={{ height: `${Math.max((row.quantity / max) * 100, row.quantity ? 5 : 0)}%` }} /></div><span className="truncate text-[10px] text-[color:var(--muted-foreground)]">{row.label}</span></div>)}
    </div>
  )
}

function WarehouseBars({ rows, metric }: { rows: WarehouseSummary[]; metric: 'available' | 'onHand' | 'committed' }) {
  const max = Math.max(...rows.map((row) => row[metric]), 1)
  return (
    <div data-testid="warehouse-comparison-plot" className="flex min-h-44 flex-col justify-center gap-3 px-[var(--space-4)] py-[var(--space-3)]" role="img" aria-label="창고별 변동 비교 막대 차트">
      {rows.slice(0, 6).map((row) => <div key={row.id} className="grid grid-cols-[minmax(6rem,8rem)_minmax(0,1fr)_auto] items-center gap-3 text-xs"><TruncatedText value={row.name}>{row.name}</TruncatedText><div className="h-3 min-w-0 rounded-sm bg-[color:var(--surface-muted)]"><div className="h-full min-w-8 rounded-sm bg-[color:var(--accent)]" style={{ width: `${(row[metric] / max) * 100}%` }} /></div><span className="font-medium tabular-nums" aria-label={`${row.name} ${row[metric]}개`}>{row[metric]}</span></div>)}
    </div>
  )
}

export function DashboardAnalysis({ flow, warehouses }: { flow: FlowPoint[]; warehouses: WarehouseSummary[] }) {
  const [transactionPeriod, setTransactionPeriod] = useState('14')
  const [inventoryPeriod, setInventoryPeriod] = useState('14')
  const [transactionMode, setTransactionMode] = useState<'all' | 'inbound' | 'outbound'>('all')
  const [warehouseMetric, setWarehouseMetric] = useState<'available' | 'onHand' | 'committed'>('available')
  const transactionFlow = useMemo(() => flow.slice(-Number(transactionPeriod)), [flow, transactionPeriod])
  const inventoryFlow = useMemo(() => flow.slice(-Number(inventoryPeriod)), [flow, inventoryPeriod])
  const inventoryRows = useMemo(() => {
    return inventoryFlow.reduce<Array<{ label: string; quantity: number }>>((rows, row) => {
      const previous = rows.at(-1)?.quantity ?? 0
      return [...rows, { label: row.label, quantity: Math.max(previous + row.inbound - row.outbound, 0) }]
    }, [])
  }, [inventoryFlow])

  return (
    <section aria-labelledby="dashboard-analysis-heading" className="flex flex-col gap-3">
      <div><h2 id="dashboard-analysis-heading" className="text-base font-semibold text-[color:var(--foreground)]">현황과 추세</h2><p className="mt-1 text-sm text-[color:var(--muted-foreground)]">운영 큐를 처리한 뒤 거래·재고·창고 변동을 확인합니다.</p></div>
      <div className="grid gap-4 xl:grid-cols-2">
        <ChartFrame title="거래 추이" description="최근 입고와 출고 수량의 흐름입니다." controls={<><ChartSelect label="거래 기간" value={transactionPeriod} onValueChange={setTransactionPeriod} items={[{ value: '7', label: '최근 7일' }, { value: '14', label: '최근 14일' }]} /><ChartSelect label="거래 유형" value={transactionMode} onValueChange={(value) => setTransactionMode(value as typeof transactionMode)} items={[{ value: 'all', label: '전체' }, { value: 'inbound', label: '입고' }, { value: 'outbound', label: '출고' }]} /></>}><FlowBars rows={transactionFlow} mode={transactionMode} /></ChartFrame>
        <ChartFrame title="재고 추이" description="선택 기간의 입출고 누적 변동입니다." controls={<ChartSelect label="재고 기간" value={inventoryPeriod} onValueChange={setInventoryPeriod} items={[{ value: '7', label: '최근 7일' }, { value: '14', label: '최근 14일' }]} />}><InventoryLine rows={inventoryRows} /></ChartFrame>
      </div>
      <ChartFrame title="창고별 변동 비교" description="창고별 재고 기준을 비교합니다." controls={<ChartSelect label="창고 기준" value={warehouseMetric} onValueChange={(value) => setWarehouseMetric(value as typeof warehouseMetric)} items={[{ value: 'available', label: '가용 재고' }, { value: 'onHand', label: '실재고' }, { value: 'committed', label: '예약 재고' }]} />}><WarehouseBars rows={warehouses} metric={warehouseMetric} /></ChartFrame>
    </section>
  )
}

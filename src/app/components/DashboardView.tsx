import Link from 'next/link'
import { AlertTriangle, ArrowDownToLine, ArrowUpFromLine, PackageCheck } from 'lucide-react'
import { StatusBadge } from '@/components/ui/badge-1'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import type { OperationsDashboardData } from '@/lib/actions/dashboard'
import { cx, ui } from './ui'

const metricItems = [
  { key: 'newOrders', label: '신규 주문', href: '/orders?view=new', icon: ArrowDownToLine },
  { key: 'readyToFulfill', label: '출고 준비', href: '/orders?view=ready', icon: PackageCheck },
  { key: 'needsAttention', label: '확인 필요', href: '/orders?view=exception', icon: AlertTriangle },
  { key: 'dispatchedToday', label: '오늘 발송', href: '/orders?view=fulfilled', icon: ArrowUpFromLine },
] as const

const channelMeta = {
  coupang: { label: '쿠팡', tone: 'info' as const },
  naver: { label: '네이버', tone: 'success' as const },
}

function EmptyRow({ colSpan, children }: { colSpan: number; children: string }) {
  return (
    <TableRow>
      <TableCell colSpan={colSpan} className="py-8 text-center text-sm text-[color:var(--muted-foreground)]">
        {children}
      </TableCell>
    </TableRow>
  )
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat('ko-KR', { month: 'short', day: 'numeric' }).format(new Date(`${value}T00:00:00`))
}

export default function DashboardView({ metrics, flow, warehouses, exceptions, upcomingSourcing }: OperationsDashboardData) {
  const maxFlow = Math.max(...flow.flatMap((item) => [item.inbound, item.outbound]), 1)

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {metricItems.map((item) => {
          const Icon = item.icon
          const value = metrics[item.key]
          return (
            <Card key={item.key} variant="strong" className="overflow-hidden">
              <Link
                href={item.href}
                aria-label={`${item.label} ${value}건`}
                className="block rounded-[inherit] px-4 py-3.5 transition-colors hover:bg-[color:var(--surface-muted)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--focus-ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-[color:var(--surface)]"
              >
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold text-[color:var(--muted-foreground)]">{item.label}</p>
                    <p className="mt-1 text-2xl font-semibold tracking-tight text-[color:var(--foreground)]">{value}건</p>
                  </div>
                  <span aria-hidden="true" className="shrink-0 text-[color:var(--muted-foreground)]">
                    <Icon className="h-4 w-4" />
                  </span>
                </div>
              </Link>
            </Card>
          )
        })}
      </div>

      <Card variant="strong" className="overflow-hidden">
        <CardHeader className="px-4 py-3">
          <CardTitle>최근 14일 입출고</CardTitle>
          <CardDescription>입고와 실제 출고 수량의 흐름입니다.</CardDescription>
        </CardHeader>
        <CardContent className="px-4 pb-4 pt-1">
          <div className="flex h-40 items-end gap-2 border-b border-[color:var(--border)]" role="img" aria-label="최근 14일 입출고 추이">
            {flow.map((item) => (
              <div key={item.date} className="flex min-w-0 flex-1 flex-col items-center gap-1" aria-label={`${item.label} 입고 ${item.inbound}, 출고 ${item.outbound}`}>
                <div className="flex h-28 w-full items-end justify-center gap-1">
                  <div className="w-[35%] min-w-1 rounded-t-sm bg-[color:var(--success)]" style={{ height: `${Math.max((item.inbound / maxFlow) * 100, item.inbound ? 5 : 0)}%` }} />
                  <div className="w-[35%] min-w-1 rounded-t-sm bg-[color:var(--foreground)]" style={{ height: `${Math.max((item.outbound / maxFlow) * 100, item.outbound ? 5 : 0)}%` }} />
                </div>
                <span className="truncate text-[10px] text-[color:var(--muted-foreground)]">{item.label}</span>
              </div>
            ))}
          </div>
          <div className="mt-3 flex items-center justify-end gap-4 text-xs text-[color:var(--muted-foreground)]">
            <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-sm bg-[color:var(--success)]" />입고</span>
            <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-sm bg-[color:var(--foreground)]" />출고</span>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 xl:grid-cols-2">
        <Card variant="strong" className="overflow-hidden">
          <CardHeader className="flex flex-row items-start justify-between gap-3 px-4 py-3">
            <div><CardTitle>창고별 재고</CardTitle><CardDescription>예약을 제외한 실제 출고 가능 수량입니다.</CardDescription></div>
            <Link href="/inventory" className={cx(ui.buttonSecondary, 'h-8 px-3 text-xs')}>재고 보기</Link>
          </CardHeader>
          <CardContent className="p-0">
            <Table aria-label="창고별 재고 상태">
              <TableHeader><TableRow><TableHead>창고</TableHead><TableHead className="text-right">실재고</TableHead><TableHead className="text-right">예약</TableHead><TableHead className="text-right">가용</TableHead></TableRow></TableHeader>
              <TableBody>
                {warehouses.length === 0 ? <EmptyRow colSpan={4}>등록된 창고가 없습니다.</EmptyRow> : warehouses.map((warehouse) => (
                  <TableRow key={warehouse.id}><TableCell className="font-medium">{warehouse.name}</TableCell><TableCell className="text-right">{warehouse.onHand}</TableCell><TableCell className="text-right">{warehouse.committed}</TableCell><TableCell className="text-right font-semibold text-[color:var(--foreground)]">{warehouse.available}</TableCell></TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card variant="strong" className="overflow-hidden">
          <CardHeader className="flex flex-row items-start justify-between gap-3 px-4 py-3">
            <div><CardTitle>처리해야 할 주문 예외</CardTitle><CardDescription>자동 예약하지 못한 주문만 표시합니다.</CardDescription></div>
            <Link href="/orders?view=exception" className={cx(ui.buttonSecondary, 'h-8 px-3 text-xs')}>주문 보기</Link>
          </CardHeader>
          <CardContent className="p-0">
            <Table aria-label="처리해야 할 주문 예외">
              <TableHeader><TableRow><TableHead>채널</TableHead><TableHead>주문번호</TableHead><TableHead>수취인</TableHead><TableHead>사유</TableHead></TableRow></TableHeader>
              <TableBody>
                {exceptions.length === 0 ? <EmptyRow colSpan={4}>확인할 주문 예외가 없습니다.</EmptyRow> : exceptions.map((item) => (
                  <TableRow key={item.id}><TableCell><StatusBadge tone={channelMeta[item.channel].tone}>{channelMeta[item.channel].label}</StatusBadge></TableCell><TableCell className="font-medium">{item.externalOrderId}</TableCell><TableCell>{item.customerName}</TableCell><TableCell><StatusBadge tone="warning">{item.reason}</StatusBadge></TableCell></TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      <Card variant="strong" className="overflow-hidden">
        <CardHeader className="flex flex-row items-start justify-between gap-3 px-4 py-3">
          <div><CardTitle>곧 도착할 소싱</CardTitle><CardDescription>도착 예정일이 가까운 미입고 수량입니다.</CardDescription></div>
          <Link href="/sourcing/arrivals" className={cx(ui.buttonSecondary, 'h-8 px-3 text-xs')}>소싱 보기</Link>
        </CardHeader>
        <CardContent className="p-0">
          <Table aria-label="곧 도착할 소싱">
            <TableHeader><TableRow><TableHead>도착 예정</TableHead><TableHead>공장</TableHead><TableHead>발주 참조</TableHead><TableHead className="text-right">미입고</TableHead></TableRow></TableHeader>
            <TableBody>
              {upcomingSourcing.length === 0 ? <EmptyRow colSpan={4}>예정된 소싱 입고가 없습니다.</EmptyRow> : upcomingSourcing.map((item) => (
                <TableRow key={item.id}><TableCell className="font-medium">{formatDate(item.expectedDate)}</TableCell><TableCell>{item.factoryName}</TableCell><TableCell>{item.referenceCode ?? '-'}</TableCell><TableCell className="text-right font-semibold text-[color:var(--foreground)]">{item.remainingQuantity}개</TableCell></TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}

import Link from 'next/link'
import { AlertTriangle, ArrowDownToLine, ArrowUpFromLine, PackageCheck } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import type { OperationsDashboardData } from '@/lib/actions/dashboard'
import { cx, ui } from './ui'

const metricItems = [
  { key: 'newOrders', label: '신규 주문', href: '/orders?view=new', icon: ArrowDownToLine },
  { key: 'readyToFulfill', label: '출고 준비', href: '/orders?view=ready', icon: PackageCheck },
  { key: 'needsAttention', label: '확인 필요', href: '/orders?view=exception', icon: AlertTriangle },
  { key: 'dispatchedToday', label: '오늘 발송', href: '/orders?view=fulfilled', icon: ArrowUpFromLine },
] as const

import { DashboardAnalysis, DashboardExceptionTable, DashboardSourcingTable, DashboardWarehouseTable } from './DashboardTables'

export default function DashboardView({ metrics, flow, warehouses, exceptions, upcomingSourcing }: OperationsDashboardData) {
  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {metricItems.map((item) => {
          const Icon = item.icon
          const value = metrics[item.key]
          return (
            <Card key={item.key} variant="strong" className="overflow-hidden">
              <Link
                href={item.href}
                aria-label={`${item.label} ${value}건`}
                className="block px-4 py-3.5 transition-colors hover:bg-[color:var(--surface-muted)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--focus-ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-[color:var(--surface)]"
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

      <div className="grid gap-4 xl:grid-cols-2">
        <Card variant="strong">
          <CardHeader className="flex flex-row items-start justify-between gap-3 px-4 py-3">
            <div><CardTitle>창고별 재고</CardTitle><CardDescription>예약을 제외한 실제 출고 가능 수량입니다.</CardDescription></div>
            <Link href="/inventory" className={cx(ui.buttonSecondary, 'h-8 px-3 text-xs')}>재고 보기</Link>
          </CardHeader>
          <CardContent contentLayout="continuous">
            <DashboardWarehouseTable rows={warehouses} />
          </CardContent>
        </Card>

        <Card variant="strong">
          <CardHeader className="flex flex-row items-start justify-between gap-3 px-4 py-3">
            <div><CardTitle>처리해야 할 주문 예외</CardTitle><CardDescription>자동 예약하지 못한 주문만 표시합니다.</CardDescription></div>
            <Link href="/orders?view=exception" className={cx(ui.buttonSecondary, 'h-8 px-3 text-xs')}>주문 보기</Link>
          </CardHeader>
          <CardContent contentLayout="continuous">
            <DashboardExceptionTable rows={exceptions} />
          </CardContent>
        </Card>
      </div>

      <Card variant="strong">
        <CardHeader className="flex flex-row items-start justify-between gap-3 px-4 py-3">
          <div><CardTitle>곧 도착할 소싱</CardTitle><CardDescription>도착 예정일이 가까운 미입고 수량입니다.</CardDescription></div>
          <Link href="/sourcing/arrivals" className={cx(ui.buttonSecondary, 'h-8 px-3 text-xs')}>소싱 보기</Link>
        </CardHeader>
        <CardContent contentLayout="continuous">
          <DashboardSourcingTable rows={upcomingSourcing} />
        </CardContent>
      </Card>

      <DashboardAnalysis flow={flow} warehouses={warehouses} />
    </div>
  )
}

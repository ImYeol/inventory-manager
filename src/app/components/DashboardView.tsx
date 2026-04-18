import Link from 'next/link'
import { Boxes, Database, History } from 'lucide-react'
import { StatusBadge } from '@/components/ui/badge-1'
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

type DashboardViewProps = {
  metrics: DashboardMetric[]
  warehouses: WarehouseSummary[]
  recentActivities: RecentActivity[]
  attentionItems: AttentionItem[]
}

const quickStart = [
  {
    title: '재고 운영',
    href: '/inventory',
    icon: <Boxes className="h-4 w-4" />,
  },
  {
    title: '기준 데이터',
    href: '/settings/master-data',
    icon: <Database className="h-4 w-4" />,
  },
  {
    title: '이력',
    href: '/history',
    icon: <History className="h-4 w-4" />,
  },
]

export default function DashboardView({
  metrics,
  warehouses,
  recentActivities,
  attentionItems,
}: DashboardViewProps) {
  const maxWarehouseQty = Math.max(...warehouses.map((warehouse) => warehouse.quantity), 1)

  return (
    <div className="space-y-5">
      <div className={cx(ui.panel, ui.panelBody, 'p-4')}>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {metrics.map((metric) => (
            <Link
              key={metric.label}
              href={metric.href}
              aria-label={metric.ariaLabel ?? metric.label}
              className="rounded-2xl border border-slate-200 bg-white px-4 py-3 transition-shadow hover:shadow-sm"
            >
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">{metric.label}</p>
              <div className="mt-2 flex items-end justify-between gap-3">
                <p className="text-2xl font-semibold tracking-tight text-slate-950">{metric.value}</p>
                <span className="text-xs text-slate-500">{metric.description}</span>
              </div>
            </Link>
          ))}
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          {quickStart.map((item) => (
            <Link key={item.title} href={item.href} className={cx(ui.buttonSecondary, 'h-11 gap-2 whitespace-nowrap px-3')}>
              {item.icon}
              {item.title}
            </Link>
          ))}
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
        <div className={ui.panel}>
          <div className={ui.panelHeader}>
            <h2 className="text-sm font-semibold text-slate-700">창고별 재고</h2>
          </div>
          <div className="space-y-3 p-4">
            {warehouses.length === 0 ? (
              <p className="text-sm text-slate-500">등록된 창고가 없습니다.</p>
            ) : (
              warehouses.map((warehouse) => (
                <div key={warehouse.id} className="space-y-1.5">
                  <div className="flex items-center justify-between text-sm text-slate-600">
                    <span>{warehouse.name}</span>
                    <span className={ui.number}>{warehouse.quantity}</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                    <div
                      className="h-full rounded-full bg-slate-900"
                      style={{ width: `${(warehouse.quantity / maxWarehouseQty) * 100}%` }}
                    />
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className={ui.panel}>
          <div className={ui.panelHeader}>
            <h2 className="text-sm font-semibold text-slate-700">주의 품목</h2>
          </div>
          <div className="p-4">
            {attentionItems.length === 0 ? (
              <p className="text-sm text-slate-500">현재 부족 또는 품절 품목이 없습니다.</p>
            ) : (
              <div className="space-y-2">
                {attentionItems.slice(0, 4).map((item) => (
                  <div key={item.id} className="flex items-center justify-between rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
                    <span className="truncate pr-3">{item.name}</span>
                    <span className={ui.number}>{item.quantity}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
          <div className="border-t border-slate-100 px-4 py-3">
            <Link href="/inventory" aria-label="운영 포인트: 재고현황" className="text-sm font-medium text-slate-700 underline underline-offset-4">
              재고현황 보기
            </Link>
          </div>
        </div>
      </div>

      <Link href="/history" className={cx(ui.panel, 'block transition-shadow hover:shadow-sm')}>
        <div className={ui.panelHeader}>
          <h2 className="text-sm font-semibold text-slate-700">최근 처리 이력</h2>
        </div>
        <div className="divide-y divide-slate-100">
          {recentActivities.length === 0 ? (
            <div className={ui.emptyState}>최근 처리 이력이 없습니다.</div>
          ) : (
            recentActivities.map((activity) => (
              <div key={activity.id} className="flex flex-col gap-3 px-4 py-4 md:flex-row md:items-center">
                <div className="flex items-center gap-3">
                  <StatusBadge
                    tone={activity.type === '입고' ? 'success' : activity.type === '출고' ? 'danger' : 'neutral'}
                    className="px-2.5 py-1"
                  >
                    {activity.type}
                  </StatusBadge>
                  <div>
                    <p className="text-sm font-medium text-slate-900">{activity.modelName}</p>
                    <p className="text-sm text-slate-500">
                      {activity.colorName} / {activity.sizeName} / {activity.warehouseName}
                    </p>
                  </div>
                </div>
                <div className="md:ml-auto md:text-right">
                  <p className="text-sm font-semibold text-slate-900">{activity.quantity}</p>
                  <p className="text-xs text-slate-500">{activity.date}</p>
                </div>
              </div>
            ))
          )}
        </div>
      </Link>
    </div>
  )
}

import Link from 'next/link'
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
    title: '재고 등록',
    description: '입고와 출고는 일괄 입력 화면에서 처리한 뒤 재고현황에서 결과를 확인합니다.',
    href: '/inventory',
    label: '재고현황 보기',
  },
  {
    title: '품목 준비',
    description: '새 모델, 색상, 사이즈, 창고가 필요하면 기준 데이터에서 먼저 등록합니다.',
    href: '/master-data',
    label: '기준 데이터 관리',
  },
  {
    title: '흐름 추적',
    description: '특정 날짜와 모델 기준으로 입출고 이력을 빠르게 조회합니다.',
    href: '/history',
    label: '이력조회 열기',
  },
]

function typeTone(type: string) {
  if (type === '입고') return 'bg-emerald-50 text-emerald-700 border-emerald-100'
  if (type === '출고') return 'bg-rose-50 text-rose-700 border-rose-100'
  return 'bg-slate-100 text-slate-700 border-slate-200'
}

export default function DashboardView({
  metrics,
  warehouses,
  recentActivities,
  attentionItems,
}: DashboardViewProps) {
  const maxWarehouseQty = Math.max(...warehouses.map((warehouse) => warehouse.quantity), 1)

  return (
    <div className="space-y-6">
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {metrics.map((metric) => (
          <Link
            key={metric.label}
            href={metric.href}
            aria-label={metric.ariaLabel ?? metric.label}
            className={cx(ui.panel, ui.panelBody, 'space-y-2 transition-shadow hover:shadow-sm')}
          >
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">{metric.label}</p>
            <p className="text-3xl font-semibold tracking-tight text-slate-950">{metric.value}</p>
            <p className="text-sm leading-6 text-slate-500">{metric.description}</p>
          </Link>
        ))}
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.4fr_1fr]">
        <div className={ui.panel}>
          <div className={ui.panelHeader}>
            <h2 className="text-sm font-semibold text-slate-700">빠른 시작</h2>
          </div>
          <div className="grid gap-3 p-4 md:grid-cols-3">
            {quickStart.map((item) => (
              <Link
                key={item.title}
                href={item.href}
                aria-label={item.label}
                className="rounded-2xl border border-slate-200 bg-white p-4 transition-shadow hover:shadow-sm"
              >
                <p className="text-sm font-semibold text-slate-900">{item.title}</p>
                <p className="mt-2 text-sm leading-6 text-slate-500">{item.description}</p>
                <span className="mt-4 inline-flex text-sm font-medium text-slate-900 underline underline-offset-4">
                  {item.label}
                </span>
              </Link>
            ))}
          </div>
        </div>

        <Link href="/inventory" aria-label="운영 포인트: 재고현황" className={cx(ui.panel, 'block transition-shadow hover:shadow-sm')}>
          <div className={ui.panelHeader}>
            <h2 className="text-sm font-semibold text-slate-700">운영 포인트</h2>
          </div>
          <div className="space-y-4 p-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">창고별 재고</p>
              <div className="mt-3 space-y-3">
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

            <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-amber-700">주의 품목</p>
              {attentionItems.length === 0 ? (
                <p className="mt-2 text-sm text-amber-800">현재 부족 또는 품절 품목이 없습니다.</p>
              ) : (
                <div className="mt-3 space-y-2">
                  {attentionItems.slice(0, 4).map((item) => (
                    <div key={item.id} className="flex items-center justify-between text-sm text-amber-900">
                      <span>{item.name}</span>
                      <span className={ui.number}>{item.quantity}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </Link>
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
                  <span className={cx('inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold', typeTone(activity.type))}>
                    {activity.type}
                  </span>
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

import { formatDateLabel } from '@/lib/inventory'
import { getAnalyticsData, getTransactionsWithRelations } from '@/lib/data'
import DashboardView from '../components/DashboardView'
import { PageHeader, ui } from '../components/ui'
import {
  getInventoryHistory,
  getTransactionTrend,
  getWarehouseComparison,
} from '@/lib/actions/analytics'

export const dynamic = 'force-dynamic'

export default async function Home() {
  const [
    { inventorySummary, warehouses, catalog, models },
    { transactions },
    initialInventoryHistory,
    initialTransactionTrend,
    initialWarehouseComparison,
  ] = await Promise.all([
    getAnalyticsData(),
    getTransactionsWithRelations(),
    getInventoryHistory('monthly'),
    getTransactionTrend('monthly'),
    getWarehouseComparison(),
  ])

  const todayLabel = formatDateLabel(new Date())
  const totalQuantity = inventorySummary.reduce((sum, item) => sum + item.total, 0)
  const todayInbound = transactions
    .filter((item) => item.date === todayLabel && item.type === '입고')
    .reduce((sum, item) => sum + item.quantity, 0)
  const todayOutbound = transactions
    .filter((item) => item.date === todayLabel && item.type === '출고')
    .reduce((sum, item) => sum + item.quantity, 0)
  const warehouseTotals = warehouses.map((warehouse) => ({
    id: warehouse.id,
    name: warehouse.name,
    quantity: catalog.reduce(
      (sum, model) =>
        sum +
        model.inventory
          .filter((item) => item.warehouseId === warehouse.id)
          .reduce((inventorySum, item) => inventorySum + item.quantity, 0),
      0,
    ),
  }))
  const metrics = [
    {
      label: '신규 주문',
      value: String(totalQuantity),
      description: `현재 판매 재고 ${totalQuantity}개를 기준으로 확인합니다.`,
      href: '/orders',
      ariaLabel: '신규 주문 KPI',
    },
    {
      label: '출고 준비',
      value: String(todayInbound),
      description: '주문 예약과 출고 대기 건을 주문에서 처리합니다.',
      href: '/orders',
      ariaLabel: '출고 준비 KPI',
    },
    {
      label: '오늘 발송',
      value: String(todayOutbound),
      description: '오늘 반영된 출고 수량입니다.',
      href: '/orders',
      ariaLabel: '오늘 발송 KPI',
    },
  ]

  return (
    <div className={ui.shell}>
      <PageHeader
        title="대시보드"
        description="주문·재고·입고 예정의 오늘 할 일을 봅니다."
      />
      <DashboardView
        metrics={metrics}
        warehouses={warehouseTotals}
        recentActivities={transactions.slice(0, 6)}
        models={models}
        initialInventoryHistory={initialInventoryHistory}
        initialTransactionTrend={initialTransactionTrend}
        initialWarehouseComparison={initialWarehouseComparison}
      />
    </div>
  )
}

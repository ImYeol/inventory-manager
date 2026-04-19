import { getAnalyticsData, getTransactionsWithRelations } from '@/lib/data'
import DashboardView from '../components/DashboardView'
import { PageHeader, ui } from '../components/ui'
import { formatDateLabel } from '@/lib/inventory'

export const dynamic = 'force-dynamic'

export default async function Home() {
  const [{ inventorySummary, warehouses, catalog }, { transactions }] = await Promise.all([
    getAnalyticsData(),
    getTransactionsWithRelations(),
  ])

  const todayLabel = formatDateLabel(new Date())
  const totalQuantity = inventorySummary.reduce((sum, item) => sum + item.total, 0)
  const todayInbound = transactions
    .filter((item) => item.date === todayLabel && item.type === '입고')
    .reduce((sum, item) => sum + item.quantity, 0)
  const todayOutbound = transactions
    .filter((item) => item.date === todayLabel && item.type === '출고')
    .reduce((sum, item) => sum + item.quantity, 0)
  const attentionItems = catalog
    .map((model) => ({
      id: model.id,
      name: model.name,
      quantity: model.inventory.reduce((sum, item) => sum + item.quantity, 0),
    }))
    .filter((item) => item.quantity <= 10)
    .sort((a, b) => a.quantity - b.quantity)
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
      label: '전체 재고',
      value: String(totalQuantity),
      description: `${inventorySummary.length}개 모델 기준 현재 보유 수량입니다.`,
      href: '/inventory',
      ariaLabel: '전체 재고 KPI',
    },
    {
      label: '오늘 입고',
      value: String(todayInbound),
      description: '금일 등록된 입고 수량 합계입니다.',
      href: '/history',
      ariaLabel: '오늘 입고 KPI',
    },
    {
      label: '오늘 출고',
      value: String(todayOutbound),
      description: '금일 등록된 출고 수량 합계입니다.',
      href: '/history',
      ariaLabel: '오늘 출고 KPI',
    },
    {
      label: '주의 품목',
      value: String(attentionItems.length),
      description: '재고가 10개 이하인 모델을 우선 확인하세요.',
      href: '/inventory',
      ariaLabel: '주의 품목 KPI',
    },
  ]

  return (
    <div className={ui.shell}>
      <PageHeader
        title="대시보드"
        description="재고 운영 상태와 최근 흐름을 한 화면에서 확인합니다."
      />
      <DashboardView
        metrics={metrics}
        warehouses={warehouseTotals}
        attentionItems={attentionItems}
        recentActivities={transactions.slice(0, 6)}
      />
    </div>
  )
}

import { PageHeader, ui } from '../../components/ui'
import { getOrdersWorkspaceData } from '@/lib/actions/order-sync'
import OrdersWorkspace from './OrdersWorkspace'
import type { OrderView } from './OrdersWorkspace'

export const dynamic = 'force-dynamic'

const viewMap: Record<string, OrderView> = {
  new: '신규',
  ready: '출고 준비',
  exception: '확인 필요',
  fulfilled: '발송 완료',
}

export default async function OrdersPage({ searchParams }: { searchParams?: Promise<{ view?: string }> } = {}) {
  const orders = await getOrdersWorkspaceData()
  const view = viewMap[(await searchParams)?.view ?? 'new'] ?? '신규'
  return <div className={ui.shell}><PageHeader title="주문" /><OrdersWorkspace orders={orders as never} initialView={view} /></div>
}

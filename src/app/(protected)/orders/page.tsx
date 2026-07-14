import { PageHeader, ui } from '../../components/ui'
import { getOrdersWorkspaceData } from '@/lib/actions/order-sync'
import OrdersWorkspace from './OrdersWorkspace'

export const dynamic = 'force-dynamic'

export default async function OrdersPage() {
  const orders = await getOrdersWorkspaceData()
  return <div className={ui.shell}><PageHeader title="주문" /><OrdersWorkspace orders={orders as never} /></div>
}

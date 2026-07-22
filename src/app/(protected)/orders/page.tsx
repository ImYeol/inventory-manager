import { PageHeader, ui } from '../../components/ui'
import { getOrdersWorkspaceData } from '@/lib/actions/order-sync'
import { listTrackingPresets } from '@/lib/actions/tracking-import'
import { getCatalogData, getProductWorkspaceData } from '@/lib/data'
import OrdersWorkspace from './OrdersWorkspace'
import type { OrderView } from './OrdersWorkspace'

export const dynamic = 'force-dynamic'

const viewMap: Record<string, OrderView> = {
  new: '신규',
  ready: '출고 준비',
  exception: '확인 필요',
  fulfilled: '발송 완료',
}

export default async function OrdersPage({ searchParams }: { searchParams?: Promise<{ view?: string }> }) {
  const [orders, catalog, productWorkspace, trackingPresets] = await Promise.all([
    getOrdersWorkspaceData(),
    getCatalogData(),
    getProductWorkspaceData(),
    listTrackingPresets(),
  ])
  const view = viewMap[(await searchParams)?.view ?? 'new'] ?? '신규'
  const variants = productWorkspace.variants.map((variant) => ({
    id: String(variant.id),
    modelId: 0,
    sizeId: 0,
    colorId: 0,
    modelName: variant.modelName,
    sizeName: variant.sizeName,
    colorName: variant.colorName,
    sellerSku: variant.sellerSku,
    channels: {},
  }))

  return (
    <div className={ui.shell}>
      <PageHeader title="주문" />
      <OrdersWorkspace orders={orders as never} variants={variants} warehouses={catalog.warehouses} initialView={view} trackingPresets={trackingPresets} />
    </div>
  )
}

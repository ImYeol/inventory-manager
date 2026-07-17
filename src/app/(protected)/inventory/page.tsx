import { getActiveInboundTemplates, getCatalogData, getFactoriesData, getProductWorkspaceData, getTransactionsWithRelations } from '@/lib/data'
import InventoryWorkspace from '@/app/components/inventory/InventoryWorkspace'

export const dynamic = 'force-dynamic'

export default async function InventoryPage() {
  const [{ models, warehouses }, { transactions }, workspace, { factories }, inboundTemplates] = await Promise.all([
    getCatalogData(),
    getTransactionsWithRelations(),
    getProductWorkspaceData(),
    getFactoriesData(),
    getActiveInboundTemplates(),
  ])

  return <InventoryWorkspace
    models={models}
    warehouses={warehouses}
    transactions={transactions}
    variants={workspace.variants}
    channelProductRefs={workspace.channelProductRefs}
    suppliers={factories.filter((factory) => factory.isActive).map((factory) => ({ id: factory.id, name: factory.name }))}
    inboundTemplates={inboundTemplates}
    incomingByVariant={Object.fromEntries(workspace.variants.map((variant) => [
      `${variant.modelId}:${variant.sizeId}:${variant.colorId}`,
      variant.incoming,
    ]))}
  />
}

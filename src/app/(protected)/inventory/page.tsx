import { getCatalogData, getProductWorkspaceData, getTransactionsWithRelations } from '@/lib/data'
import InventoryWorkspace from '@/app/components/inventory/InventoryWorkspace'

export const dynamic = 'force-dynamic'

export default async function InventoryPage() {
  const [{ models, warehouses }, { transactions }, workspace] = await Promise.all([
    getCatalogData(),
    getTransactionsWithRelations(),
    getProductWorkspaceData(),
  ])

  return <InventoryWorkspace
    models={models}
    warehouses={warehouses}
    transactions={transactions}
    variants={workspace.variants}
    channelProductRefs={workspace.channelProductRefs}
  />
}

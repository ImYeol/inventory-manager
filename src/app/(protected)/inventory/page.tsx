import { getCatalogData, getTransactionsWithRelations } from '@/lib/data'
import InventoryWorkspace from '@/app/components/inventory/InventoryWorkspace'

export const dynamic = 'force-dynamic'

export default async function InventoryPage() {
  const [{ models, warehouses }, { transactions }] = await Promise.all([getCatalogData(), getTransactionsWithRelations()])

  return <InventoryWorkspace models={models} warehouses={warehouses} transactions={transactions} />
}

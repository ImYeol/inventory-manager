import { getCatalogData, getTransactionsWithRelations } from '@/lib/data'
import MasterDataManager from './MasterDataManager'
import { PageHeader, ui } from '../../components/ui'

export const dynamic = 'force-dynamic'

export default async function MasterDataPage() {
  const [{ models, warehouses }, txData] = await Promise.all([
    getCatalogData(),
    getTransactionsWithRelations(),
  ])

  const warehouseStats = warehouses.map((warehouse) => {
    const warehouseInventory = models.reduce(
      (sum, model) =>
        sum +
        model.inventory
          .filter((item) => item.warehouseId === warehouse.id)
          .reduce((inventorySum, item) => inventorySum + item.quantity, 0),
      0,
    )

    const warehouseTransactions = txData.transactions.filter((transaction) => transaction.warehouseId === warehouse.id)
    const latestInbound = warehouseTransactions.find((transaction) => transaction.type === '입고') ?? null
    const latestOutbound = warehouseTransactions.find((transaction) => transaction.type === '출고') ?? null
    const latestMovement = warehouseTransactions[0] ?? null

    return {
      id: warehouse.id,
      name: warehouse.name,
      stockQty: warehouseInventory,
      inboundQty: warehouseTransactions
        .filter((transaction) => transaction.type === '입고')
        .reduce((sum, transaction) => sum + transaction.quantity, 0),
      outboundQty: warehouseTransactions
        .filter((transaction) => transaction.type === '출고')
        .reduce((sum, transaction) => sum + transaction.quantity, 0),
      latestInbound: latestInbound
        ? { quantity: latestInbound.quantity, date: latestInbound.date }
        : null,
      latestOutbound: latestOutbound
        ? { quantity: latestOutbound.quantity, date: latestOutbound.date }
        : null,
      latestMovementDate: latestMovement?.date ?? null,
    }
  })

  return (
    <div className={ui.shell}>
      <PageHeader
        kicker="Master"
        title="기준 데이터"
        description="창고 운영 단위를 정리하고 상품 기준값을 등록해 재고 흐름이 흔들리지 않도록 관리합니다."
      />
      <MasterDataManager models={models} warehouses={warehouses} warehouseStats={warehouseStats} />
    </div>
  )
}

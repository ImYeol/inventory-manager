import Link from 'next/link'
import { formatDateLabel } from '@/lib/inventory'
import { getCatalogData, getTransactionsWithRelations } from '@/lib/data'
import InventoryView from '../../components/InventoryView'
import { PageHeader, cx, ui } from '../../components/ui'

export const dynamic = 'force-dynamic'

type Movement = {
  modelName: string
  colorName: string
  sizeName: string
  type: '입고' | '출고'
  quantity: number
  date: string
  warehouseName: string
}

export default async function InventoryPage() {
  const [{ models, warehouses }, txData] = await Promise.all([getCatalogData(), getTransactionsWithRelations()])
  const transactions = txData.transactions

  const todayLabel = formatDateLabel(new Date())
  const totalQuantity = models.reduce(
    (sum, model) => sum + model.inventory.reduce((modelSum, item) => modelSum + item.quantity, 0),
    0,
  )
  const todayIn = transactions
    .filter((tx) => tx.type === '입고' && tx.date === todayLabel)
    .reduce((sum, tx) => sum + tx.quantity, 0)
  const todayOut = transactions
    .filter((tx) => tx.type === '출고' && tx.date === todayLabel)
    .reduce((sum, tx) => sum + tx.quantity, 0)

  const warehouseSummary = warehouses.map((warehouse) => ({
    name: warehouse.name,
    quantity: models.reduce(
      (sum, model) =>
        sum +
        model.inventory
          .filter((item) => item.warehouseId === warehouse.id)
          .reduce((modelSum, item) => modelSum + item.quantity, 0),
      0,
    ),
  }))
  const maxWarehouseQuantity = Math.max(...warehouseSummary.map((item) => item.quantity), 1)

  const recentMovements = transactions
    .filter((tx) => tx.type === '입고' || tx.type === '출고')
    .slice(0, 8)
    .map((tx): Movement => ({
      modelName: tx.modelName,
      colorName: tx.colorName,
      sizeName: tx.sizeName,
      type: tx.type,
      quantity: tx.quantity,
      date: tx.date,
      warehouseName: tx.warehouseName,
    }))

  const hasModels = models.length > 0
  return (
    <div className={ui.shell}>
      <PageHeader
        kicker="Inventory"
        title="재고현황"
        description="입고/출고 내역과 재고 수량을 한 화면에서 확인하고, 창고별 집계를 빠르게 파악할 수 있습니다."
        actions={
          <div className="flex flex-nowrap items-center gap-2 overflow-x-auto pb-1">
            <Link href="/master-data" className={cx(ui.buttonSecondary, 'whitespace-nowrap')}>
              상품 등록
            </Link>
            <Link href="/inout" className={cx(ui.buttonPrimary, 'whitespace-nowrap')}>
              입고 · 출고 등록
            </Link>
          </div>
        }
      />

      <div className="mb-8 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {[
          { label: '현재 재고', value: totalQuantity, description: '전체 보유 수량' },
          { label: '오늘 입고', value: todayIn, description: '금일 입고 합계' },
          { label: '오늘 출고', value: todayOut, description: '금일 출고 합계' },
        ].map((item) => (
          <div key={item.label} className={cx(ui.panel, ui.panelBody, 'overflow-hidden')}>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">{item.label}</p>
            <p className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">{item.value}</p>
            <p className="mt-2 text-sm text-slate-500">{item.description}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <div className={cx(ui.panel, 'overflow-hidden')}>
          <div className={ui.panelHeader}>
            <h2 className="text-sm font-semibold text-slate-700">최근 입출고</h2>
          </div>
          <div className="divide-y divide-slate-100">
            {recentMovements.length === 0 ? (
              <div className={ui.emptyState}>최근 입출고 이력이 없습니다.</div>
            ) : (
              recentMovements.map((movement, index) => (
                <div
                  key={`${movement.modelName}-${movement.sizeName}-${movement.colorName}-${index}`}
                  className={cx(
                    'flex flex-col gap-2 px-5 py-4 md:flex-row md:items-center',
                    movement.type === '입고'
                      ? 'border-l-4 border-emerald-300/80 bg-emerald-50/35'
                      : 'border-l-4 border-rose-300/80 bg-rose-50/35',
                  )}
                >
                  <div className="flex items-center gap-3">
                    <span
                      className={cx(
                        'inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold',
                        movement.type === '입고'
                          ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                          : 'border-rose-200 bg-rose-50 text-rose-700',
                      )}
                    >
                      {movement.type}
                    </span>
                    <div>
                      <p className="text-sm font-semibold text-slate-900">{movement.modelName}</p>
                      <p className="text-sm text-slate-500">
                        {movement.colorName} / {movement.sizeName} / {movement.warehouseName}
                      </p>
                    </div>
                  </div>
                  <div className="md:ml-auto">
                    <p className={cx('text-sm font-semibold', movement.type === '입고' ? 'text-emerald-700' : 'text-rose-700')}>
                      {movement.type === '입고' ? '+' : '-'}
                      {movement.quantity}
                    </p>
                    <p className="text-xs text-slate-500">{movement.date}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className={cx(ui.panel, 'overflow-hidden')}>
          <div className={ui.panelHeader}>
            <h2 className="text-sm font-semibold text-slate-700">창고별 재고</h2>
          </div>
          <div className="space-y-4 p-4">
            {warehouseSummary.length === 0 ? (
              <p className="text-sm text-slate-500">등록된 창고가 없습니다.</p>
            ) : (
              warehouseSummary.map((item) => (
                <div key={item.name} className="space-y-1">
                  <div className="flex items-center justify-between text-sm text-slate-600">
                    <span>{item.name}</span>
                    <span className={ui.number}>{item.quantity}</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                    <div
                      className="h-full rounded-full bg-slate-900"
                      style={{ width: `${(item.quantity / maxWarehouseQuantity) * 100}%` }}
                    />
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {hasModels ? <InventoryView models={models} warehouses={warehouses} recentMovements={recentMovements} /> : null}
      {!hasModels && (
        <div className={ui.emptyState}>
          등록된 모델이 없습니다. 기준 데이터에서 모델과 사이즈, 색상을 먼저 등록해 주세요.
        </div>
      )}
    </div>
  )
}

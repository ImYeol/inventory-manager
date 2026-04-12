'use server'

import { getAnalyticsData, getRawTransactions } from '../data'
import { formatDateGroup } from '../inventory'

export type TrendItem = {
  label: string
  inbound: number
  outbound: number
}

export type InventorySummaryItem = {
  modelName: string
  total: number
}

export type InventoryHistoryItem = {
  label: string
  quantity: number
}

export type WarehouseCompareItem = {
  modelName: string
  warehouseTotals: Array<{
    id: number
    name: string
    quantity: number
  }>
}

export async function getTransactionTrend(
  period: 'daily' | 'monthly' | 'yearly',
  modelId?: number,
  dateFrom?: string,
  dateTo?: string,
): Promise<TrendItem[]> {
  const transactions = (await getRawTransactions()).filter((item) => {
    if (modelId && item.model_id !== modelId) return false
    if (dateFrom && item.date < dateFrom) return false
    if (dateTo && item.date > dateTo) return false
    return true
  })

  const grouped: Record<string, { inbound: number; outbound: number }> = {}
  for (const item of transactions) {
    const key = formatDateGroup(item.date, period)
    if (!grouped[key]) grouped[key] = { inbound: 0, outbound: 0 }
    if (item.type === 'INBOUND') grouped[key].inbound += item.quantity
    if (item.type === 'OUTBOUND') grouped[key].outbound += item.quantity
  }

  return Object.entries(grouped)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([label, data]) => ({ label, ...data }))
}

export async function getInventorySummary(): Promise<InventorySummaryItem[]> {
  const { inventorySummary } = await getAnalyticsData()
  return inventorySummary
}

export async function getInventoryHistory(
  period: 'daily' | 'monthly' | 'yearly',
  modelId?: number,
): Promise<InventoryHistoryItem[]> {
  const transactions = (await getRawTransactions()).filter((item) => !modelId || item.model_id === modelId)
  const { inventorySummary, models } = await getAnalyticsData()
  const selectedModelName = models.find((model) => model.id === modelId)?.name
  const currentTotal = modelId
    ? inventorySummary.find((item) => item.modelName === selectedModelName)?.total ?? 0
    : inventorySummary.reduce((sum, item) => sum + item.total, 0)

  const grouped: Record<string, number> = {}
  for (const item of transactions) {
    const key = formatDateGroup(item.date, period)
    if (!grouped[key]) grouped[key] = 0
    if (item.type === 'INBOUND') grouped[key] += item.quantity
    if (item.type === 'OUTBOUND') grouped[key] -= item.quantity
  }

  const sortedKeys = Object.keys(grouped).sort()
  const totalDelta = sortedKeys.reduce((sum, key) => sum + grouped[key], 0)
  let running = currentTotal - totalDelta

  return sortedKeys.map((key) => {
    running += grouped[key]
    return { label: key, quantity: running }
  })
}

export async function getWarehouseComparison(modelId?: number): Promise<WarehouseCompareItem[]> {
  const { catalog, warehouses } = await getAnalyticsData()
  const modelFilter = modelId ? new Set([modelId]) : undefined

  const warehouseNameById = new Map(warehouses.map((warehouse) => [warehouse.id, warehouse.name]))
  const grouped: Record<string, { modelName: string; totals: Map<number, number> }> = {}

  for (const model of catalog) {
    if (modelFilter && !modelFilter.has(model.id)) continue

    const totalMap = new Map<number, number>()
    for (const warehouse of warehouses) {
      totalMap.set(warehouse.id, 0)
    }

    for (const item of model.inventory) {
      const next = (totalMap.get(item.warehouseId) ?? 0) + item.quantity
      totalMap.set(item.warehouseId, next)
    }

    grouped[model.name] = {
      modelName: model.name,
      totals: totalMap,
    }
  }

  return Object.values(grouped).map((entry) => ({
    modelName: entry.modelName,
    warehouseTotals: [...entry.totals.entries()].map(([id, quantity]) => ({
      id,
      name: warehouseNameById.get(id) ?? `창고 #${id}`,
      quantity,
    })),
  }))
}

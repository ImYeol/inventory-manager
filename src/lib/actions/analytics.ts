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

function isWithinRange(date: string, dateFrom?: string, dateTo?: string) {
  if (dateFrom && date < dateFrom) return false
  if (dateTo && date > dateTo) return false
  return true
}

function getTransactionDelta(type: string, quantity: number) {
  if (type === 'INBOUND') return quantity
  if (type === 'OUTBOUND') return -quantity
  return 0
}

export async function getTransactionTrend(
  period: 'daily' | 'monthly' | 'yearly',
  modelId?: number,
  dateFrom?: string,
  dateTo?: string,
): Promise<TrendItem[]> {
  const transactions = (await getRawTransactions()).filter((item) => {
    if (modelId && item.model_id !== modelId) return false
    return isWithinRange(item.date, dateFrom, dateTo)
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
  dateFrom?: string,
  dateTo?: string,
): Promise<InventoryHistoryItem[]> {
  const allTransactions = await getRawTransactions()
  const transactions = allTransactions.filter((item) => {
    if (modelId && item.model_id !== modelId) return false
    return isWithinRange(item.date, dateFrom, dateTo)
  })
  const { inventorySummary, models } = await getAnalyticsData()
  const selectedModelName = models.find((model) => model.id === modelId)?.name
  const currentTotal = modelId
    ? inventorySummary.find((item) => item.modelName === selectedModelName)?.total ?? 0
    : inventorySummary.reduce((sum, item) => sum + item.total, 0)
  const totalAfterRange = allTransactions
    .filter((item) => {
      if (modelId && item.model_id !== modelId) return false
      return !!dateTo && item.date > dateTo
    })
    .reduce((sum, item) => sum + getTransactionDelta(item.type, item.quantity), 0)

  const grouped: Record<string, number> = {}
  for (const item of transactions) {
    const key = formatDateGroup(item.date, period)
    if (!grouped[key]) grouped[key] = 0
    grouped[key] += getTransactionDelta(item.type, item.quantity)
  }

  const sortedKeys = Object.keys(grouped).sort()
  const totalDelta = sortedKeys.reduce((sum, key) => sum + grouped[key], 0)
  let running = currentTotal - totalAfterRange - totalDelta

  return sortedKeys.map((key) => {
    running += grouped[key]
    return { label: key, quantity: running }
  })
}

export async function getWarehouseComparison(
  modelId?: number,
  dateFrom?: string,
  dateTo?: string,
): Promise<WarehouseCompareItem[]> {
  const { catalog, warehouses } = await getAnalyticsData()
  const warehouseNameById = new Map(warehouses.map((warehouse) => [warehouse.id, warehouse.name]))
  const modelNameById = new Map(catalog.map((model) => [model.id, model.name]))
  const modelOrder = new Map(catalog.map((model, index) => [model.id, index]))
  const grouped = new Map<number, Map<number, number>>()

  const transactions = (await getRawTransactions()).filter((item) => {
    if (modelId && item.model_id !== modelId) return false
    return isWithinRange(item.date, dateFrom, dateTo)
  })

  for (const item of transactions) {
    if (!grouped.has(item.model_id)) {
      const initialTotals = new Map<number, number>()
      for (const warehouse of warehouses) {
        initialTotals.set(warehouse.id, 0)
      }
      grouped.set(item.model_id, initialTotals)
    }

    const totals = grouped.get(item.model_id)
    if (!totals) continue

    totals.set(item.warehouse_id, (totals.get(item.warehouse_id) ?? 0) + getTransactionDelta(item.type, item.quantity))
  }

  return [...grouped.entries()]
    .sort(([left], [right]) => (modelOrder.get(left) ?? Number.MAX_SAFE_INTEGER) - (modelOrder.get(right) ?? Number.MAX_SAFE_INTEGER))
    .map(([modelIdValue, totals]) => ({
      modelName: modelNameById.get(modelIdValue) ?? `모델 #${modelIdValue}`,
      warehouseTotals: [...totals.entries()].map(([id, quantity]) => ({
        id,
        name: warehouseNameById.get(id) ?? `창고 #${id}`,
        quantity,
      })),
    }))
}

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
  ogeumdog: number
  daejadong: number
}

export async function getTransactionTrend(
  period: 'daily' | 'monthly' | 'yearly',
  modelId?: number,
  dateFrom?: string,
  dateTo?: string
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
  modelId?: number
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
  const { catalog } = await getAnalyticsData()
  const grouped: Record<string, { ogeumdog: number; daejadong: number }> = {}

  for (const model of catalog) {
    if (modelId && model.id !== modelId) continue
    grouped[model.name] = { ogeumdog: 0, daejadong: 0 }
    for (const item of model.inventory) {
      if (item.warehouse === '오금동') grouped[model.name].ogeumdog += item.quantity
      if (item.warehouse === '대자동') grouped[model.name].daejadong += item.quantity
    }
  }

  return Object.entries(grouped)
    .map(([modelName, data]) => ({ modelName, ...data }))
    .sort((a, b) => b.ogeumdog + b.daejadong - (a.ogeumdog + a.daejadong))
}

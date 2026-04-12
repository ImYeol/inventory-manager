'use server'

import { prisma } from '../db'

export type TrendItem = {
  label: string;
  inbound: number;
  outbound: number;
};

export type InventorySummaryItem = {
  modelName: string;
  total: number;
};

export type InventoryHistoryItem = {
  label: string;
  quantity: number;
};

export type WarehouseCompareItem = {
  modelName: string;
  ogeumdog: number;
  daejadong: number;
};

// 기간별 입고/반출 트렌드
export async function getTransactionTrend(
  period: 'daily' | 'monthly' | 'yearly',
  modelId?: number,
  dateFrom?: string,
  dateTo?: string
): Promise<TrendItem[]> {
  const where: Record<string, unknown> = {}
  if (modelId) where.modelId = modelId
  if (dateFrom || dateTo) {
    where.date = {}
    if (dateFrom) (where.date as Record<string, string>).gte = dateFrom
    if (dateTo) (where.date as Record<string, string>).lte = dateTo
  }

  const transactions = await prisma.transaction.findMany({
    where,
    select: { date: true, type: true, quantity: true },
    orderBy: { date: 'asc' },
  })

  const grouped: Record<string, { inbound: number; outbound: number }> = {}

  for (const t of transactions) {
    let key: string
    if (period === 'daily') {
      key = t.date
    } else if (period === 'monthly') {
      key = t.date.substring(0, 5) // "YY.MM"
    } else {
      key = t.date.substring(0, 2) // "YY"
    }

    if (!grouped[key]) grouped[key] = { inbound: 0, outbound: 0 }

    if (t.type === '입고') {
      grouped[key].inbound += t.quantity
    } else if (t.type === '반출') {
      grouped[key].outbound += t.quantity
    }
  }

  return Object.entries(grouped)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([label, data]) => ({ label, ...data }))
}

// 모델별 현재 재고 요약
export async function getInventorySummary(): Promise<InventorySummaryItem[]> {
  const inventory = await prisma.inventory.findMany({
    include: { model: true },
  })

  const grouped: Record<string, number> = {}
  for (const inv of inventory) {
    grouped[inv.model.name] = (grouped[inv.model.name] ?? 0) + inv.quantity
  }

  return Object.entries(grouped)
    .map(([modelName, total]) => ({ modelName, total }))
    .sort((a, b) => b.total - a.total)
}

// 재고 추이 (트랜잭션 기반 누적 계산)
export async function getInventoryHistory(
  period: 'daily' | 'monthly' | 'yearly',
  modelId?: number
): Promise<InventoryHistoryItem[]> {
  const where: Record<string, unknown> = {}
  if (modelId) where.modelId = modelId

  const transactions = await prisma.transaction.findMany({
    where,
    select: { date: true, type: true, quantity: true },
    orderBy: { date: 'asc' },
  })

  // 현재 재고량 계산
  const currentInv = await prisma.inventory.aggregate({
    where: modelId ? { modelId } : {},
    _sum: { quantity: true },
  })
  const currentTotal = currentInv._sum.quantity ?? 0

  // 역순으로 트랜잭션 적용하여 기간별 재고 복원
  const grouped: Record<string, number> = {}
  for (const t of transactions) {
    let key: string
    if (period === 'daily') {
      key = t.date
    } else if (period === 'monthly') {
      key = t.date.substring(0, 5)
    } else {
      key = t.date.substring(0, 2)
    }

    if (!grouped[key]) grouped[key] = 0
    if (t.type === '입고') {
      grouped[key] += t.quantity
    } else if (t.type === '반출') {
      grouped[key] -= t.quantity
    }
  }

  // 누적 합산
  const sortedKeys = Object.keys(grouped).sort()
  let cumulative = currentTotal
  // 전체 변동량 역산
  const totalDelta = sortedKeys.reduce((sum, k) => sum + grouped[k], 0)
  let running = currentTotal - totalDelta

  return sortedKeys.map((key) => {
    running += grouped[key]
    return { label: key, quantity: running }
  })
}

// 창고별 비교
export async function getWarehouseComparison(
  modelId?: number
): Promise<WarehouseCompareItem[]> {
  const where: Record<string, unknown> = {}
  if (modelId) where.modelId = modelId

  const inventory = await prisma.inventory.findMany({
    where,
    include: { model: true },
  })

  const grouped: Record<string, { ogeumdog: number; daejadong: number }> = {}
  for (const inv of inventory) {
    if (!grouped[inv.model.name]) {
      grouped[inv.model.name] = { ogeumdog: 0, daejadong: 0 }
    }
    if (inv.warehouse === '오금동') {
      grouped[inv.model.name].ogeumdog += inv.quantity
    } else {
      grouped[inv.model.name].daejadong += inv.quantity
    }
  }

  return Object.entries(grouped)
    .map(([modelName, data]) => ({ modelName, ...data }))
    .sort((a, b) => (b.ogeumdog + b.daejadong) - (a.ogeumdog + a.daejadong))
}

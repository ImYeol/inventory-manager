'use server'

import { prisma } from './db'
import { revalidatePath } from 'next/cache'

// ---------- 1. 모델 전체 조회 (사이즈/색상 포함) ----------
export async function getModels() {
  return prisma.model.findMany({
    include: {
      sizes: { orderBy: { sortOrder: 'asc' } },
      colors: { orderBy: { sortOrder: 'asc' } },
    },
    orderBy: { name: 'asc' },
  })
}

// ---------- 2. 재고 조회 (모델별 색상 x 사이즈 매트릭스) ----------
export async function getInventory(modelId?: number) {
  const where = modelId ? { modelId } : {}

  const inventory = await prisma.inventory.findMany({
    where,
    include: {
      model: true,
      size: true,
      color: true,
    },
    orderBy: [
      { model: { name: 'asc' } },
      { color: { sortOrder: 'asc' } },
      { size: { sortOrder: 'asc' } },
    ],
  })

  // Group by model -> color -> size -> warehouse quantities
  const grouped: Record<
    number,
    {
      model: { id: number; name: string }
      sizes: Array<{ id: number; name: string }>
      colors: Array<{
        id: number
        name: string
        rgbCode: string
        textWhite: boolean
        inventory: Record<
          string,
          { ogeumdog: { id: number; quantity: number }; daejadong: { id: number; quantity: number } }
        >
      }>
    }
  > = {}

  for (const inv of inventory) {
    if (!grouped[inv.modelId]) {
      grouped[inv.modelId] = {
        model: { id: inv.model.id, name: inv.model.name },
        sizes: [],
        colors: [],
      }
    }

    const group = grouped[inv.modelId]

    // Add size if not present
    if (!group.sizes.find((s) => s.id === inv.sizeId)) {
      group.sizes.push({ id: inv.size.id, name: inv.size.name })
    }

    // Find or create color entry
    let colorEntry = group.colors.find((c) => c.id === inv.colorId)
    if (!colorEntry) {
      colorEntry = {
        id: inv.color.id,
        name: inv.color.name,
        rgbCode: inv.color.rgbCode,
        textWhite: inv.color.textWhite,
        inventory: {},
      }
      group.colors.push(colorEntry)
    }

    const sizeKey = inv.size.name
    if (!colorEntry.inventory[sizeKey]) {
      colorEntry.inventory[sizeKey] = {
        ogeumdog: { id: 0, quantity: 0 },
        daejadong: { id: 0, quantity: 0 },
      }
    }

    if (inv.warehouse === '오금동') {
      colorEntry.inventory[sizeKey].ogeumdog = { id: inv.id, quantity: inv.quantity }
    } else {
      colorEntry.inventory[sizeKey].daejadong = { id: inv.id, quantity: inv.quantity }
    }
  }

  return Object.values(grouped)
}

// ---------- 3. 단건 입출고 등록 ----------
export async function addTransaction(data: {
  date: string
  modelId: number
  sizeId: number
  colorId: number
  type: string
  quantity: number
  warehouse: string
}) {
  const result = await prisma.$transaction(async (tx) => {
    const transaction = await tx.transaction.create({ data })

    const inventory = await tx.inventory.findUnique({
      where: {
        modelId_sizeId_colorId_warehouse: {
          modelId: data.modelId,
          sizeId: data.sizeId,
          colorId: data.colorId,
          warehouse: data.warehouse,
        },
      },
    })

    if (inventory) {
      let newQuantity = inventory.quantity
      if (data.type === '입고') {
        newQuantity += data.quantity
      } else if (data.type === '반출') {
        newQuantity -= data.quantity
      } else if (data.type === '재고조정') {
        newQuantity = data.quantity
      }

      await tx.inventory.update({
        where: { id: inventory.id },
        data: { quantity: newQuantity },
      })
    } else {
      await tx.inventory.create({
        data: {
          modelId: data.modelId,
          sizeId: data.sizeId,
          colorId: data.colorId,
          warehouse: data.warehouse,
          quantity: data.type === '반출' ? -data.quantity : data.quantity,
        },
      })
    }

    return transaction
  })

  revalidatePath('/')
  revalidatePath('/inout')
  revalidatePath('/adjust')
  revalidatePath('/history')

  return result
}

// ---------- 4. 일괄 입출고 등록 (단일 DB 트랜잭션, 롤백 지원) ----------
export async function addBatchTransactions(
  items: Array<{
    date: string
    modelId: number
    sizeId: number
    colorId: number
    type: string
    quantity: number
    warehouse: string
  }>
) {
  const results = await prisma.$transaction(async (tx) => {
    const txResults = []

    for (const data of items) {
      const transaction = await tx.transaction.create({ data })

      const inventory = await tx.inventory.findUnique({
        where: {
          modelId_sizeId_colorId_warehouse: {
            modelId: data.modelId,
            sizeId: data.sizeId,
            colorId: data.colorId,
            warehouse: data.warehouse,
          },
        },
      })

      if (inventory) {
        let newQuantity = inventory.quantity
        if (data.type === '입고') {
          newQuantity += data.quantity
        } else if (data.type === '반출') {
          newQuantity -= data.quantity
        } else if (data.type === '재고조정') {
          newQuantity = data.quantity
        }

        await tx.inventory.update({
          where: { id: inventory.id },
          data: { quantity: newQuantity },
        })
      } else {
        await tx.inventory.create({
          data: {
            modelId: data.modelId,
            sizeId: data.sizeId,
            colorId: data.colorId,
            warehouse: data.warehouse,
            quantity: data.type === '반출' ? -data.quantity : data.quantity,
          },
        })
      }

      txResults.push(transaction)
    }

    return txResults
  })

  revalidatePath('/')
  revalidatePath('/inout')
  revalidatePath('/adjust')
  revalidatePath('/history')

  return results
}

// ---------- 5. 거래 내역 조회 (필터 지원) ----------
export async function getTransactions(filters?: {
  modelId?: number
  sizeId?: number
  colorId?: number
  type?: string
  warehouse?: string
  dateFrom?: string
  dateTo?: string
}) {
  const where: Record<string, unknown> = {}

  if (filters?.modelId) where.modelId = filters.modelId
  if (filters?.sizeId) where.sizeId = filters.sizeId
  if (filters?.colorId) where.colorId = filters.colorId
  if (filters?.type) where.type = filters.type
  if (filters?.warehouse) where.warehouse = filters.warehouse
  if (filters?.dateFrom || filters?.dateTo) {
    where.date = {}
    if (filters?.dateFrom) (where.date as Record<string, string>).gte = filters.dateFrom
    if (filters?.dateTo) (where.date as Record<string, string>).lte = filters.dateTo
  }

  return prisma.transaction.findMany({
    where,
    include: {
      model: true,
      size: true,
      color: true,
    },
    orderBy: [{ date: 'desc' }, { createdAt: 'desc' }],
  })
}

// ---------- 6. 재고 직접 조정 (재고조정 트랜잭션 자동 생성) ----------
export async function adjustInventory(inventoryId: number, newQuantity: number) {
  const result = await prisma.$transaction(async (tx) => {
    const inventory = await tx.inventory.findUniqueOrThrow({
      where: { id: inventoryId },
    })

    await tx.inventory.update({
      where: { id: inventoryId },
      data: { quantity: newQuantity },
    })

    const today = new Date()
    const dateStr = `${String(today.getFullYear()).slice(2)}.${String(today.getMonth() + 1).padStart(2, '0')}.${String(today.getDate()).padStart(2, '0')}`

    const transaction = await tx.transaction.create({
      data: {
        date: dateStr,
        modelId: inventory.modelId,
        sizeId: inventory.sizeId,
        colorId: inventory.colorId,
        type: '재고조정',
        quantity: newQuantity,
        warehouse: inventory.warehouse,
      },
    })

    return transaction
  })

  revalidatePath('/')
  revalidatePath('/adjust')
  revalidatePath('/history')

  return result
}

// ---------- 7. 모델 상세 (사이즈/색상 드롭다운용) ----------
export async function getModelDetails(modelId: number) {
  return prisma.model.findUniqueOrThrow({
    where: { id: modelId },
    include: {
      sizes: { orderBy: { sortOrder: 'asc' } },
      colors: { orderBy: { sortOrder: 'asc' } },
    },
  })
}

// ---------- 기존 호환 함수들 ----------

// createTransactions: 기존 일괄 입출고 등록 (하위 호환용)
export async function createTransactions(
  items: {
    type: '입고' | '반출'
    date: string
    warehouse: string
    modelId: number
    sizeId: number
    colorId: number
    quantity: number
  }[]
) {
  await addBatchTransactions(items)

  revalidatePath('/')
  revalidatePath('/inout')
  revalidatePath('/adjust')
  revalidatePath('/history')

  return { success: true }
}

// getModelSizesColors: 모델별 사이즈/색상 조회
export async function getModelSizesColors(modelId: number) {
  const [sizes, colors] = await Promise.all([
    prisma.size.findMany({
      where: { modelId },
      orderBy: { sortOrder: 'asc' },
    }),
    prisma.color.findMany({
      where: { modelId },
      orderBy: { sortOrder: 'asc' },
    }),
  ])
  return { sizes, colors }
}

// getCurrentStock: 현재 재고 조회
export async function getCurrentStock(
  modelId: number,
  sizeId: number,
  colorId: number,
  warehouse: string
) {
  const inv = await prisma.inventory.findUnique({
    where: {
      modelId_sizeId_colorId_warehouse: {
        modelId,
        sizeId,
        colorId,
        warehouse,
      },
    },
  })
  return inv?.quantity ?? 0
}

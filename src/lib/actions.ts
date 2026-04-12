'use server'

import { revalidatePath } from 'next/cache'
import {
  getCatalogData,
  getCurrentStockRow,
  getModelLookups,
  getTransactionsWithRelations,
  runBulkTransaction,
  runInventoryAdjustment,
} from './data'

export async function getModels() {
  const models = await getCatalogData()
  return models.map(({ inventory, ...model }) => model)
}

export async function getInventory(modelId?: number) {
  const allModels = await getCatalogData()
  const targetModels = modelId ? allModels.filter((model) => model.id === modelId) : allModels

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

  for (const model of targetModels) {
    for (const inv of model.inventory) {
      if (!grouped[inv.modelId]) {
        grouped[inv.modelId] = {
          model: { id: model.id, name: model.name },
          sizes: [],
          colors: [],
        }
      }

      const group = grouped[inv.modelId]
      const size = model.sizes.find((item) => item.id === inv.sizeId)
      const color = model.colors.find((item) => item.id === inv.colorId)
      if (!size || !color) continue

      if (!group.sizes.find((entry) => entry.id === size.id)) {
        group.sizes.push({ id: size.id, name: size.name })
      }

      let colorEntry = group.colors.find((entry) => entry.id === color.id)
      if (!colorEntry) {
        colorEntry = {
          id: color.id,
          name: color.name,
          rgbCode: color.rgbCode,
          textWhite: color.textWhite,
          inventory: {},
        }
        group.colors.push(colorEntry)
      }

      const sizeKey = size.name
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
  }

  return Object.values(grouped)
}

export async function addTransaction(data: {
  date: string
  modelId: number
  sizeId: number
  colorId: number
  type: string
  quantity: number
  warehouse: string
}) {
  await runBulkTransaction([data])
  revalidateInventoryPaths()
  return { success: true }
}

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
  await runBulkTransaction(items)
  revalidateInventoryPaths()
  return { success: true }
}

export async function getTransactions(filters?: {
  modelId?: number
  sizeId?: number
  colorId?: number
  type?: string
  warehouse?: string
  dateFrom?: string
  dateTo?: string
}) {
  const { transactions } = await getTransactionsWithRelations()
  return transactions.filter((item) => {
    if (filters?.type && item.type !== filters.type) return false
    if (filters?.warehouse && item.warehouse !== filters.warehouse) return false
    return true
  })
}

export async function adjustInventory(inventoryId: number, newQuantity: number) {
  await runInventoryAdjustment(inventoryId, newQuantity)
  revalidatePath('/')
  revalidatePath('/adjust')
  revalidatePath('/history')
  return { success: true }
}

export async function getModelDetails(modelId: number) {
  return getModelLookups(modelId)
}

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
  return { success: true }
}

export async function getModelSizesColors(modelId: number) {
  return getModelLookups(modelId)
}

export async function getCurrentStock(
  modelId: number,
  sizeId: number,
  colorId: number,
  warehouse: string
) {
  return getCurrentStockRow(modelId, sizeId, colorId, warehouse)
}

function revalidateInventoryPaths() {
  revalidatePath('/')
  revalidatePath('/inout')
  revalidatePath('/adjust')
  revalidatePath('/history')
}

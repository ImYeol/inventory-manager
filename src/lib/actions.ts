'use server'

import { revalidatePath } from 'next/cache'
import { getSetupState } from './data'
import {
  getCatalogData,
  getCurrentStockRow,
  getModelLookups,
  getTransactionsWithRelations,
  runBulkTransaction,
  runInventoryAdjustment,
} from './data'
import { getSupabaseWithUser } from './db'

export async function getModels() {
  const { models } = await getCatalogData()
  return models.map(({ inventory, ...model }) => model)
}

export async function getCatalogState() {
  return getCatalogData()
}

export async function getSetupProgress() {
  return getSetupState()
}

export async function getInventory(modelId?: number) {
  const { models, warehouses } = await getCatalogData()
  const targetModels = modelId ? models.filter((model) => model.id === modelId) : models

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
        inventory: Record<string, Record<string, { id: number; quantity: number; name: string }>>
      }>
    }
  > = {}

  for (const model of targetModels) {
    const group = {
      model: { id: model.id, name: model.name },
      sizes: [...model.sizes],
      colors: model.colors.map((color) => ({
        id: color.id,
        name: color.name,
        rgbCode: color.rgbCode,
        textWhite: color.textWhite,
        inventory: Object.fromEntries(
          model.sizes.map((size) => [
            size.name,
            Object.fromEntries(
              warehouses.map((warehouse) => [
                warehouse.name,
                { id: 0, quantity: 0, name: warehouse.name },
              ]),
            ),
          ]),
        ),
      })),
    }

    for (const inv of model.inventory) {
      const size = model.sizes.find((item) => item.id === inv.sizeId)
      const color = model.colors.find((item) => item.id === inv.colorId)
      if (!size || !color) continue

      const colorEntry = group.colors.find((entry) => entry.id === color.id)
      if (!colorEntry) continue

      const currentSizeEntry = colorEntry.inventory[size.name]
      if (!currentSizeEntry) {
        colorEntry.inventory[size.name] = Object.fromEntries(
          warehouses.map((warehouse) => [
            warehouse.name,
            { id: 0, quantity: 0, name: warehouse.name },
          ]),
        )
      }

      colorEntry.inventory[size.name][inv.warehouseName] = {
        id: inv.id,
        quantity: inv.quantity,
        name: inv.warehouseName,
      }
    }

    grouped[model.id] = group
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
  warehouseId: number
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
    warehouseId: number
  }>,
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
  warehouseId?: number
  dateFrom?: string
  dateTo?: string
}) {
  const { transactions } = await getTransactionsWithRelations()
  return transactions.filter((item) => {
    if (filters?.type && item.type !== filters.type) return false
    if (typeof filters?.warehouseId === 'number' && item.warehouseId !== filters.warehouseId)
      return false
    return true
  })
}

export async function adjustInventory(inventoryId: number, newQuantity: number) {
  await runInventoryAdjustment(inventoryId, newQuantity)
  revalidateInventoryPaths()
  return { success: true }
}

export async function getModelDetails(modelId: number) {
  return getModelLookups(modelId)
}

export async function createTransactions(
  items: {
    type: '입고' | '반출'
    date: string
    warehouseId: number
    modelId: number
    sizeId: number
    colorId: number
    quantity: number
  }[],
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
  warehouseId: number,
) {
  return getCurrentStockRow(modelId, sizeId, colorId, warehouseId)
}

export async function createWarehouse(name: string) {
  const title = name.trim()
  if (!title) {
    throw new Error('창고 이름을 입력해주세요.')
  }

  const { supabase } = await getSupabaseWithUser()
  const { error } = await supabase.from('warehouses').insert({ name: title })
  if (error) {
    throw new Error(error.message)
  }

  revalidateInventoryPaths()
  revalidatePath('/master-data')
  revalidatePath('/setup')
  return { success: true }
}

export async function createModel(name: string) {
  const title = name.trim()
  if (!title) {
    throw new Error('모델명을 입력해주세요.')
  }

  const { supabase } = await getSupabaseWithUser()
  const { error } = await supabase.from('models').insert({ name: title })
  if (error) {
    throw new Error(error.message)
  }

  revalidatePath('/master-data')
  revalidatePath('/setup')
  revalidatePath('/')
  return { success: true }
}

export async function createModelSize(modelId: number, sizeName: string) {
  const name = sizeName.trim()
  if (!modelId || !name) {
    throw new Error('모델과 사이즈를 모두 입력해주세요.')
  }

  const { supabase } = await getSupabaseWithUser()
  const { error } = await supabase.from('sizes').insert({
    model_id: modelId,
    name,
  })

  if (error) {
    throw new Error(error.message)
  }

  revalidatePath('/master-data')
  revalidatePath('/setup')
  revalidateInventoryPaths()
  return { success: true }
}

export async function createModelColor(
  modelId: number,
  colorName: string,
  options?: { rgbCode?: string; textWhite?: boolean },
) {
  const name = colorName.trim()
  if (!modelId || !name) {
    throw new Error('모델과 색상을 모두 입력해주세요.')
  }

  const { supabase } = await getSupabaseWithUser()
  const { error } = await supabase.from('colors').insert({
    model_id: modelId,
    name,
    rgb_code: options?.rgbCode ?? '#000000',
    text_white: options?.textWhite ?? false,
  })

  if (error) {
    throw new Error(error.message)
  }

  revalidatePath('/master-data')
  revalidatePath('/setup')
  revalidateInventoryPaths()
  return { success: true }
}

function revalidateInventoryPaths() {
  revalidatePath('/')
  revalidatePath('/inout')
  revalidatePath('/history')
  revalidatePath('/analytics')
  revalidatePath('/master-data')
}

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
  runReceiveFactoryArrival,
} from './data'
import { getSupabaseWithUser } from './db'

export async function getModels() {
  const { models } = await getCatalogData()
  return models.map((model) => ({
    id: model.id,
    name: model.name,
    createdAt: model.createdAt,
    sizes: model.sizes,
    colors: model.colors,
  }))
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
    type: '입고' | '출고'
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
  revalidatePath('/settings/master-data')
  return { success: true }
}

export async function deleteWarehouse(warehouseId: number) {
  if (!warehouseId) {
    throw new Error('삭제할 창고를 찾을 수 없습니다.')
  }

  const { supabase } = await getSupabaseWithUser()
  const { error } = await supabase.from('warehouses').delete().eq('id', warehouseId)
  if (error) {
    throw new Error(error.message)
  }

  revalidateInventoryPaths()
  revalidatePath('/settings/master-data')
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

  revalidatePath('/settings/master-data')
  revalidatePath('/')
  revalidatePath('/inventory')
  return { success: true }
}

export async function createModelsWithSpecs(
  items: Array<{
    name: string
    sizes: string[]
    colors: Array<{ name: string; rgbCode: string; textWhite: boolean }>
  }>,
) {
  if (!Array.isArray(items) || items.length === 0) {
    throw new Error('등록할 모델이 없습니다.')
  }

  const normalized = items
    .map((item) => {
      const name = item.name.trim()
      const sizes = [...new Set(item.sizes.map((size) => size.trim()).filter(Boolean))]
      const colors = item.colors
        .map((color) => ({
          name: color.name.trim(),
          rgbCode: /^#?[0-9a-fA-F]{6}$/.test(color.rgbCode.trim())
            ? color.rgbCode.trim().startsWith('#')
              ? color.rgbCode.trim()
              : `#${color.rgbCode.trim()}`
            : '#000000',
          textWhite: color.textWhite === true,
        }))
        .filter((color) => color.name.length > 0)

      return { name, sizes, colors }
    })
    .filter((item) => item.name.length > 0)

  if (normalized.length === 0) {
    throw new Error('모델명을 입력해주세요.')
  }

  const { supabase } = await getSupabaseWithUser()
  const createdModelIds: number[] = []

  try {
    for (const item of normalized) {
      const { data, error: modelError } = await supabase
        .from('models')
        .insert({ name: item.name })
        .select('id')
        .single()

      if (modelError || !data?.id) {
        throw new Error(modelError?.message ?? '모델 등록에 실패했습니다.')
      }

      createdModelIds.push(data.id)

      if (item.sizes.length > 0) {
        const sizeRows = item.sizes.map((size) => ({ model_id: data.id, name: size }))
        const { error: sizeError } = await supabase.from('sizes').insert(sizeRows)

        if (sizeError) {
          throw new Error(sizeError.message)
        }
      }

      if (item.colors.length > 0) {
        const colorRows = item.colors.map((color) => ({
          model_id: data.id,
          name: color.name,
          rgb_code: color.rgbCode,
          text_white: color.textWhite,
        }))
        const { error: colorError } = await supabase.from('colors').insert(colorRows)

        if (colorError) {
          throw new Error(colorError.message)
        }
      }
    }
  } catch (error) {
    if (createdModelIds.length > 0) {
      await supabase.from('models').delete().in('id', createdModelIds)
    }

    throw error instanceof Error ? error : new Error('모델 일괄 등록에 실패했습니다.')
  }

  revalidatePath('/settings/master-data')
  revalidatePath('/')
  revalidatePath('/inventory')
  revalidateInventoryPaths()
  return { success: true, count: normalized.length }
}

export async function deleteModel(modelId: number) {
  if (!modelId) {
    throw new Error('삭제할 모델을 찾을 수 없습니다.')
  }

  const { supabase } = await getSupabaseWithUser()
  const { error } = await supabase.from('models').delete().eq('id', modelId)
  if (error) {
    throw new Error(error.message)
  }

  revalidateInventoryPaths()
  revalidatePath('/settings/master-data')
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

  revalidatePath('/settings/master-data')
  revalidateInventoryPaths()
  return { success: true }
}

export async function deleteModelSize(sizeId: number) {
  if (!sizeId) {
    throw new Error('삭제할 사이즈를 찾을 수 없습니다.')
  }

  const { supabase } = await getSupabaseWithUser()
  const { error } = await supabase.from('sizes').delete().eq('id', sizeId)

  if (error) {
    throw new Error(error.message)
  }

  revalidatePath('/settings/master-data')
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

  revalidatePath('/settings/master-data')
  revalidateInventoryPaths()
  return { success: true }
}

export async function deleteModelColor(colorId: number) {
  if (!colorId) {
    throw new Error('삭제할 색상을 찾을 수 없습니다.')
  }

  const { supabase } = await getSupabaseWithUser()
  const { error } = await supabase.from('colors').delete().eq('id', colorId)

  if (error) {
    throw new Error(error.message)
  }

  revalidatePath('/settings/master-data')
  revalidateInventoryPaths()
  return { success: true }
}

export async function createFactory(input: {
  name: string
  contactName?: string
  phone?: string
  email?: string
  notes?: string
}) {
  const name = input.name.trim()
  if (!name) {
    throw new Error('공장 이름을 입력해주세요.')
  }

  const { supabase } = await getSupabaseWithUser()
  const { error } = await supabase.from('factories').insert({
    name,
    contact_name: input.contactName?.trim() || null,
    phone: input.phone?.trim() || null,
    email: input.email?.trim() || null,
    notes: input.notes?.trim() || null,
  })

  if (error) {
    throw new Error(error.message)
  }

  revalidatePath('/sourcing/factories')
  revalidatePath('/sourcing/arrivals')
  return { success: true }
}

export async function setFactoryActive(factoryId: number, isActive: boolean) {
  if (!factoryId) {
    throw new Error('공장을 찾을 수 없습니다.')
  }

  const { supabase } = await getSupabaseWithUser()
  const { error } = await supabase.from('factories').update({ is_active: isActive }).eq('id', factoryId)

  if (error) {
    throw new Error(error.message)
  }

  revalidatePath('/sourcing/factories')
  revalidatePath('/sourcing/arrivals')
  return { success: true }
}

export async function createFactoryArrivalBatch(input: {
  factoryId: number
  expectedDate: string
  memo?: string
  sourceChannel: 'manual' | 'csv'
  items: Array<{
    modelId: number
    sizeId: number
    colorId: number
    orderedQuantity: number
  }>
}) {
  if (!input.factoryId) {
    throw new Error('공장을 선택해주세요.')
  }

  if (!input.expectedDate) {
    throw new Error('예정 입고일을 입력해주세요.')
  }

  if (!Array.isArray(input.items) || input.items.length === 0) {
    throw new Error('등록할 예정 입고 항목이 없습니다.')
  }

  const normalizedItems = input.items
    .filter((item) => item.modelId && item.sizeId && item.colorId && item.orderedQuantity > 0)
    .map((item) => ({
      model_id: item.modelId,
      size_id: item.sizeId,
      color_id: item.colorId,
      ordered_quantity: item.orderedQuantity,
    }))

  if (normalizedItems.length === 0) {
    throw new Error('유효한 예정 입고 항목이 없습니다.')
  }

  const { supabase } = await getSupabaseWithUser()
  const { data: arrival, error: arrivalError } = await supabase
    .from('factory_arrivals')
    .insert({
      factory_id: input.factoryId,
      expected_date: input.expectedDate,
      status: '예정',
      source_channel: input.sourceChannel,
      memo: input.memo?.trim() || null,
    })
    .select('id')
    .single()

  if (arrivalError || !arrival?.id) {
    throw new Error(arrivalError?.message ?? '예정 입고 등록에 실패했습니다.')
  }

  const { error: itemsError } = await supabase.from('factory_arrival_items').insert(
    normalizedItems.map((item) => ({
      factory_arrival_id: arrival.id,
      ...item,
    })),
  )

  if (itemsError) {
    await supabase.from('factory_arrivals').delete().eq('id', arrival.id)
    throw new Error(itemsError.message)
  }

  revalidatePath('/sourcing/arrivals')
  revalidatePath('/sourcing/factories')
  return { success: true, count: normalizedItems.length }
}

export async function receiveFactoryArrival(input: {
  arrivalId: number
  warehouseId: number
  items: Array<{ arrivalItemId: number; quantity: number }>
}) {
  if (!input.arrivalId || !input.warehouseId || input.items.length === 0) {
    throw new Error('입고 반영 정보가 올바르지 않습니다.')
  }

  await runReceiveFactoryArrival(input.arrivalId, input.warehouseId, input.items)

  revalidateInventoryPaths()
  revalidatePath('/sourcing/arrivals')
  revalidatePath('/sourcing/factories')
  return { success: true }
}

function revalidateInventoryPaths() {
  revalidatePath('/')
  revalidatePath('/inventory')
  revalidatePath('/inout')
  revalidatePath('/history')
  revalidatePath('/analytics')
  revalidatePath('/settings/master-data')
}

import { getSupabaseWithUser } from './db'
import {
  formatDateLabel,
  parseTransactionType,
  parseWarehouse,
  transactionTypeLabels,
  warehouseLabels,
  type TransactionTypeValue,
  type WarehouseValue,
} from './inventory'

type ModelRow = {
  id: number
  name: string
  created_at: string
}

type SizeRow = {
  id: number
  name: string
  sort_order: number
  model_id: number
}

type ColorRow = {
  id: number
  name: string
  rgb_code: string
  text_white: boolean
  sort_order: number
  model_id: number
}

type InventoryRow = {
  id: number
  model_id: number
  size_id: number
  color_id: number
  warehouse: WarehouseValue
  quantity: number
}

type TransactionRow = {
  id: number
  date: string
  model_id: number
  size_id: number
  color_id: number
  type: TransactionTypeValue
  quantity: number
  warehouse: WarehouseValue
  created_at: string
}

function ensure<T>(data: T | null, error: { message: string } | null): T {
  if (error) throw new Error(error.message)
  if (!data) throw new Error('No data returned from Supabase.')
  return data
}

export async function getCatalogData() {
  const { supabase } = await getSupabaseWithUser()
  const [modelsRes, sizesRes, colorsRes, inventoryRes] = await Promise.all([
    supabase.from('models').select('id, name, created_at').order('name'),
    supabase.from('sizes').select('id, name, sort_order, model_id').order('sort_order'),
    supabase.from('colors').select('id, name, rgb_code, text_white, sort_order, model_id').order('sort_order'),
    supabase.from('inventory').select('id, model_id, size_id, color_id, warehouse, quantity'),
  ])

  const models = ensure(modelsRes.data as ModelRow[] | null, modelsRes.error)
  const sizes = ensure(sizesRes.data as SizeRow[] | null, sizesRes.error)
  const colors = ensure(colorsRes.data as ColorRow[] | null, colorsRes.error)
  const inventory = ensure(inventoryRes.data as InventoryRow[] | null, inventoryRes.error)

  return models.map((model) => ({
    id: model.id,
    name: model.name,
    createdAt: model.created_at,
    sizes: sizes
      .filter((size) => size.model_id === model.id)
      .map((size) => ({
        id: size.id,
        name: size.name,
        sortOrder: size.sort_order,
        modelId: size.model_id,
      })),
    colors: colors
      .filter((color) => color.model_id === model.id)
      .map((color) => ({
        id: color.id,
        name: color.name,
        rgbCode: color.rgb_code,
        textWhite: color.text_white,
        sortOrder: color.sort_order,
        modelId: color.model_id,
      })),
    inventory: inventory
      .filter((item) => item.model_id === model.id)
      .map((item) => ({
        id: item.id,
        modelId: item.model_id,
        sizeId: item.size_id,
        colorId: item.color_id,
        warehouse: warehouseLabels[item.warehouse],
        quantity: item.quantity,
      })),
  }))
}

export async function getTransactionsWithRelations() {
  const { supabase } = await getSupabaseWithUser()
  const [txRes, modelsRes, sizesRes, colorsRes] = await Promise.all([
    supabase
      .from('transactions')
      .select('id, date, model_id, size_id, color_id, type, quantity, warehouse, created_at')
      .order('date', { ascending: false })
      .order('created_at', { ascending: false }),
    supabase.from('models').select('id, name'),
    supabase.from('sizes').select('id, name'),
    supabase.from('colors').select('id, name, rgb_code'),
  ])

  const transactions = ensure(txRes.data as TransactionRow[] | null, txRes.error)
  const models = ensure(modelsRes.data as Array<{ id: number; name: string }> | null, modelsRes.error)
  const sizes = ensure(sizesRes.data as Array<{ id: number; name: string }> | null, sizesRes.error)
  const colors = ensure(colorsRes.data as Array<{ id: number; name: string; rgb_code: string }> | null, colorsRes.error)

  const modelMap = new Map(models.map((model) => [model.id, model.name]))
  const sizeMap = new Map(sizes.map((size) => [size.id, size.name]))
  const colorMap = new Map(colors.map((color) => [color.id, color]))

  return {
    transactions: transactions.map((item) => ({
      id: item.id,
      date: formatDateLabel(item.date),
      type: transactionTypeLabels[item.type],
      quantity: item.quantity,
      warehouse: warehouseLabels[item.warehouse],
      createdAt: item.created_at,
      modelName: modelMap.get(item.model_id) ?? '',
      sizeName: sizeMap.get(item.size_id) ?? '',
      colorName: colorMap.get(item.color_id)?.name ?? '',
      colorRgb: colorMap.get(item.color_id)?.rgb_code ?? '#888888',
    })),
    models: models.map((model) => ({ id: model.id, name: model.name })),
  }
}

export async function getCurrentStockRow(
  modelId: number,
  sizeId: number,
  colorId: number,
  warehouse: string
) {
  const { supabase } = await getSupabaseWithUser()
  const { data, error } = await supabase
    .from('inventory')
    .select('quantity')
    .eq('model_id', modelId)
    .eq('size_id', sizeId)
    .eq('color_id', colorId)
    .eq('warehouse', parseWarehouse(warehouse))
    .maybeSingle()

  if (error) throw new Error(error.message)
  return data?.quantity ?? 0
}

export async function runBulkTransaction(
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
  const { supabase } = await getSupabaseWithUser()
  const payload = items.map((item) => ({
    date: item.date,
    model_id: item.modelId,
    size_id: item.sizeId,
    color_id: item.colorId,
    type: parseTransactionType(item.type),
    quantity: item.quantity,
    warehouse: parseWarehouse(item.warehouse),
  }))

  const { error } = await supabase.rpc('bulk_apply_inventory_transactions', {
    p_items: payload,
  })

  if (error) throw new Error(error.message)
}

export async function runInventoryAdjustment(inventoryId: number, newQuantity: number) {
  const { supabase } = await getSupabaseWithUser()
  const { error } = await supabase.rpc('apply_inventory_adjustment', {
    p_inventory_id: inventoryId,
    p_new_quantity: newQuantity,
  })

  if (error) throw new Error(error.message)
}

export async function getModelLookups(modelId: number) {
  const models = await getCatalogData()
  const model = models.find((entry) => entry.id === modelId)
  if (!model) throw new Error('Model not found.')
  return { sizes: model.sizes, colors: model.colors }
}

export async function getAnalyticsData() {
  const models = await getCatalogData()
  const inventorySummary = models
    .map((model) => ({
      modelName: model.name,
      total: model.inventory.reduce((sum, item) => sum + item.quantity, 0),
    }))
    .sort((a, b) => b.total - a.total)

  return {
    models: models.map((model) => ({ id: model.id, name: model.name })),
    inventorySummary,
    catalog: models,
  }
}

export async function getRawTransactions() {
  const { supabase } = await getSupabaseWithUser()
  const { data, error } = await supabase
    .from('transactions')
    .select('date, type, quantity, model_id, warehouse')
    .order('date', { ascending: true })

  return ensure(
    data as Array<{
      date: string
      type: TransactionTypeValue
      quantity: number
      model_id: number
      warehouse: WarehouseValue
    }> | null,
    error
  )
}

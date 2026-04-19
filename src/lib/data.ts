import { getSupabaseWithUser } from './db'
import {
  formatDateLabel,
  parseTransactionType,
  transactionTypeLabels,
  type TransactionTypeValue,
} from './inventory'

type WarehouseRow = {
  id: number
  name: string
  created_at: string
}

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
  warehouse_id: number
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
  warehouse_id: number
  source_channel: string | null
  reference_type: string | null
  reference_id: number | null
  memo: string | null
  created_at: string
}

type FactoryRow = {
  id: number
  name: string
  contact_name: string | null
  phone: string | null
  email: string | null
  notes: string | null
  is_active: boolean
  created_at: string
  updated_at: string
}

type FactoryArrivalRow = {
  id: number
  factory_id: number
  reference_code: string | null
  expected_date: string
  status: string
  source_channel: string
  memo: string | null
  created_at: string
  updated_at: string
}

type FactoryArrivalItemRow = {
  id: number
  factory_arrival_id: number
  model_id: number
  size_id: number
  color_id: number
  ordered_quantity: number
  received_quantity: number
  created_at: string
  updated_at: string
}

export type CatalogModel = {
  id: number
  name: string
  createdAt: string
  sizes: Array<{ id: number; name: string; sortOrder: number; modelId: number }>
  colors: Array<{
    id: number
    name: string
    rgbCode: string
    textWhite: boolean
    sortOrder: number
    modelId: number
  }>
  inventory: Array<{
    id: number
    modelId: number
    sizeId: number
    colorId: number
    warehouseId: number
    warehouseName: string
    quantity: number
  }>
}

export type WarehouseLookup = {
  id: number
  name: string
}

export type CatalogData = {
  models: CatalogModel[]
  warehouses: WarehouseLookup[]
}

export type SetupProgress = {
  needsSetup: boolean
  hasWarehouse: boolean
  hasModel: boolean
  allModelsHaveSpec: boolean
  warehouseCount: number
  modelCount: number
}

export type FactoryData = {
  id: number
  name: string
  contactName: string | null
  phone: string | null
  email: string | null
  notes: string | null
  isActive: boolean
  createdAt: string
  updatedAt: string
  arrivalCount: number
  pendingQuantity: number
}

export type FactoryArrivalData = {
  id: number
  factoryId: number
  factoryName: string
  referenceCode: string | null
  expectedDate: string
  status: string
  sourceChannel: string
  memo: string | null
  createdAt: string
  updatedAt: string
  totalOrderedQuantity: number
  totalReceivedQuantity: number
  remainingQuantity: number
  items: Array<{
    id: number
    modelId: number
    modelName: string
    sizeId: number
    sizeName: string
    colorId: number
    colorName: string
    colorRgb: string
    orderedQuantity: number
    receivedQuantity: number
    remainingQuantity: number
  }>
}

function ensure<T>(data: T | null, error: { message: string } | null): T {
  if (error) throw new Error(error.message)
  if (!data) throw new Error('No data returned from Supabase.')
  return data
}

function isMissingSchemaError(error: { message: string } | null | undefined) {
  const message = error?.message?.toLowerCase() ?? ''

  return (
    message.includes('does not exist') ||
    message.includes('could not find the table') ||
    message.includes('could not find the column') ||
    message.includes('schema cache')
  )
}

export async function getWarehouses(): Promise<WarehouseLookup[]> {
  const { supabase } = await getSupabaseWithUser()
  const rows = await supabase
    .from('warehouses')
    .select('id, name, created_at')
    .order('created_at')

  return ensure(rows.data as WarehouseRow[] | null, rows.error).map((item) => ({
    id: item.id,
    name: item.name,
  }))
}

export async function getCatalogData(): Promise<CatalogData> {
  const { supabase } = await getSupabaseWithUser()
  const [modelsRes, sizesRes, colorsRes, inventoryRes, warehousesRes] = await Promise.all([
    supabase.from('models').select('id, name, created_at').order('name'),
    supabase.from('sizes').select('id, name, sort_order, model_id').order('sort_order'),
    supabase.from('colors').select('id, name, rgb_code, text_white, sort_order, model_id').order('sort_order'),
    supabase.from('inventory').select('id, model_id, size_id, color_id, warehouse_id, quantity'),
    supabase.from('warehouses').select('id, name, created_at').order('name'),
  ])

  const models = ensure(modelsRes.data as ModelRow[] | null, modelsRes.error)
  const sizes = ensure(sizesRes.data as SizeRow[] | null, sizesRes.error)
  const colors = ensure(colorsRes.data as ColorRow[] | null, colorsRes.error)
  const inventory = ensure(
    inventoryRes.data as InventoryRow[] | null,
    inventoryRes.error,
  )
  const warehouses = ensure(warehousesRes.data as WarehouseRow[] | null, warehousesRes.error)

  const warehouseNames = new Map<number, string>(
    warehouses.map((warehouse) => [warehouse.id, warehouse.name]),
  )

  return {
    models: models.map((model) => ({
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
          warehouseId: item.warehouse_id,
          warehouseName: warehouseNames.get(item.warehouse_id) ?? `창고 #${item.warehouse_id}`,
          quantity: item.quantity,
        })),
    })),
    warehouses: warehouses.map((warehouse) => ({
      id: warehouse.id,
      name: warehouse.name,
    })),
  }
}

export async function getTransactionsWithRelations() {
  const { supabase } = await getSupabaseWithUser()
  const transactionSelect =
    'id, date, model_id, size_id, color_id, type, quantity, warehouse_id, source_channel, reference_type, reference_id, memo, created_at'
  const legacyTransactionSelect =
    'id, date, model_id, size_id, color_id, type, quantity, warehouse_id, created_at'

  let txRes = await supabase
    .from('transactions')
    .select(transactionSelect)
    .order('date', { ascending: false })
    .order('created_at', { ascending: false })

  if (isMissingSchemaError(txRes.error)) {
    const fallbackRes = await supabase
      .from('transactions')
      .select(legacyTransactionSelect)
      .order('date', { ascending: false })
      .order('created_at', { ascending: false })

    txRes = {
      data: (fallbackRes.data ?? []).map((item) => ({
        ...item,
        source_channel: null,
        reference_type: null,
        reference_id: null,
        memo: null,
      })),
      error: fallbackRes.error,
    }
  }

  const [modelsRes, sizesRes, colorsRes, warehousesRes] = await Promise.all([
    supabase.from('models').select('id, name'),
    supabase.from('sizes').select('id, name'),
    supabase.from('colors').select('id, name, rgb_code'),
    supabase.from('warehouses').select('id, name'),
  ])

  const transactions = ensure(txRes.data as TransactionRow[] | null, txRes.error)
  const models = ensure(modelsRes.data as Array<{ id: number; name: string }> | null, modelsRes.error)
  const sizes = ensure(sizesRes.data as Array<{ id: number; name: string }> | null, sizesRes.error)
  const colors =
    ensure(colorsRes.data as Array<{ id: number; name: string; rgb_code: string }> | null, colorsRes.error)
  const warehouses = ensure(warehousesRes.data as Array<{ id: number; name: string }> | null, warehousesRes.error)

  const modelMap = new Map(models.map((model) => [model.id, model.name]))
  const sizeMap = new Map(sizes.map((size) => [size.id, size.name]))
  const colorMap = new Map(colors.map((color) => [color.id, color]))
  const warehouseMap = new Map(warehouses.map((warehouse) => [warehouse.id, warehouse.name]))

  return {
    transactions: transactions.map((item) => ({
      id: item.id,
      date: formatDateLabel(item.date),
      type: transactionTypeLabels[item.type],
      quantity: item.quantity,
      warehouseId: item.warehouse_id,
      warehouse: warehouseMap.get(item.warehouse_id) ?? `창고 #${item.warehouse_id}`,
      warehouseName: warehouseMap.get(item.warehouse_id) ?? `창고 #${item.warehouse_id}`,
      sourceChannel: item.source_channel,
      referenceType: item.reference_type,
      referenceId: item.reference_id,
      memo: item.memo,
      createdAt: item.created_at,
      modelName: modelMap.get(item.model_id) ?? '',
      sizeName: sizeMap.get(item.size_id) ?? '',
      colorName: colorMap.get(item.color_id)?.name ?? '',
      colorRgb: colorMap.get(item.color_id)?.rgb_code ?? '#888888',
    })),
    models: models.map((model) => ({ id: model.id, name: model.name })),
    warehouses: warehouses.map((warehouse) => ({ id: warehouse.id, name: warehouse.name })),
  }
}

export async function getFactoriesData(): Promise<FactoryData[]> {
  const { supabase } = await getSupabaseWithUser()
  const [factoriesRes, arrivalsRes, arrivalItemsRes] = await Promise.all([
    supabase
      .from('factories')
      .select('id, name, contact_name, phone, email, notes, is_active, created_at, updated_at')
      .order('is_active', { ascending: false })
      .order('name'),
    supabase.from('factory_arrivals').select('id, factory_id'),
    supabase.from('factory_arrival_items').select('factory_arrival_id, ordered_quantity, received_quantity'),
  ])

  if (
    isMissingSchemaError(factoriesRes.error) ||
    isMissingSchemaError(arrivalsRes.error) ||
    isMissingSchemaError(arrivalItemsRes.error)
  ) {
    return []
  }

  const factories = ensure(factoriesRes.data as FactoryRow[] | null, factoriesRes.error)
  const arrivals = ensure(arrivalsRes.data as Array<{ id: number; factory_id: number }> | null, arrivalsRes.error)
  const arrivalItems = ensure(
    arrivalItemsRes.data as Array<{ factory_arrival_id: number; ordered_quantity: number; received_quantity: number }> | null,
    arrivalItemsRes.error,
  )

  const arrivalByFactory = new Map<number, number[]>()
  for (const arrival of arrivals) {
    const list = arrivalByFactory.get(arrival.factory_id) ?? []
    list.push(arrival.id)
    arrivalByFactory.set(arrival.factory_id, list)
  }

  return factories.map((factory) => {
    const arrivalIds = arrivalByFactory.get(factory.id) ?? []
    const relevantItems = arrivalItems.filter((item) => arrivalIds.includes(item.factory_arrival_id))

    return {
      id: factory.id,
      name: factory.name,
      contactName: factory.contact_name,
      phone: factory.phone,
      email: factory.email,
      notes: factory.notes,
      isActive: factory.is_active,
      createdAt: factory.created_at,
      updatedAt: factory.updated_at,
      arrivalCount: arrivalIds.length,
      pendingQuantity: relevantItems.reduce(
        (sum, item) => sum + Math.max(item.ordered_quantity - item.received_quantity, 0),
        0,
      ),
    }
  })
}

export async function getFactoryArrivalsData(): Promise<FactoryArrivalData[]> {
  const { supabase } = await getSupabaseWithUser()
  const [factoriesRes, arrivalsRes, arrivalItemsRes, modelsRes, sizesRes, colorsRes] = await Promise.all([
    supabase.from('factories').select('id, name'),
    supabase
      .from('factory_arrivals')
      .select('id, factory_id, reference_code, expected_date, status, source_channel, memo, created_at, updated_at')
      .order('expected_date', { ascending: true })
      .order('created_at', { ascending: false }),
    supabase
      .from('factory_arrival_items')
      .select('id, factory_arrival_id, model_id, size_id, color_id, ordered_quantity, received_quantity, created_at, updated_at'),
    supabase.from('models').select('id, name'),
    supabase.from('sizes').select('id, name'),
    supabase.from('colors').select('id, name, rgb_code'),
  ])

  if (
    isMissingSchemaError(factoriesRes.error) ||
    isMissingSchemaError(arrivalsRes.error) ||
    isMissingSchemaError(arrivalItemsRes.error)
  ) {
    return []
  }

  const factories = ensure(factoriesRes.data as Array<{ id: number; name: string }> | null, factoriesRes.error)
  const arrivals = ensure(arrivalsRes.data as FactoryArrivalRow[] | null, arrivalsRes.error)
  const arrivalItems = ensure(arrivalItemsRes.data as FactoryArrivalItemRow[] | null, arrivalItemsRes.error)
  const models = ensure(modelsRes.data as Array<{ id: number; name: string }> | null, modelsRes.error)
  const sizes = ensure(sizesRes.data as Array<{ id: number; name: string }> | null, sizesRes.error)
  const colors = ensure(colorsRes.data as Array<{ id: number; name: string; rgb_code: string }> | null, colorsRes.error)

  const factoryMap = new Map(factories.map((factory) => [factory.id, factory.name]))
  const modelMap = new Map(models.map((model) => [model.id, model.name]))
  const sizeMap = new Map(sizes.map((size) => [size.id, size.name]))
  const colorMap = new Map(colors.map((color) => [color.id, color]))

  return arrivals.map((arrival) => {
    const items = arrivalItems
      .filter((item) => item.factory_arrival_id === arrival.id)
      .map((item) => ({
        id: item.id,
        modelId: item.model_id,
        modelName: modelMap.get(item.model_id) ?? '',
        sizeId: item.size_id,
        sizeName: sizeMap.get(item.size_id) ?? '',
        colorId: item.color_id,
        colorName: colorMap.get(item.color_id)?.name ?? '',
        colorRgb: colorMap.get(item.color_id)?.rgb_code ?? '#888888',
        orderedQuantity: item.ordered_quantity,
        receivedQuantity: item.received_quantity,
        remainingQuantity: Math.max(item.ordered_quantity - item.received_quantity, 0),
      }))

    const totalOrderedQuantity = items.reduce((sum, item) => sum + item.orderedQuantity, 0)
    const totalReceivedQuantity = items.reduce((sum, item) => sum + item.receivedQuantity, 0)

    return {
      id: arrival.id,
      factoryId: arrival.factory_id,
      factoryName: factoryMap.get(arrival.factory_id) ?? `공장 #${arrival.factory_id}`,
      referenceCode: arrival.reference_code,
      expectedDate: arrival.expected_date,
      status: arrival.status,
      sourceChannel: arrival.source_channel,
      memo: arrival.memo,
      createdAt: arrival.created_at,
      updatedAt: arrival.updated_at,
      totalOrderedQuantity,
      totalReceivedQuantity,
      remainingQuantity: Math.max(totalOrderedQuantity - totalReceivedQuantity, 0),
      items,
    }
  })
}

export async function getCurrentStockRow(
  modelId: number,
  sizeId: number,
  colorId: number,
  warehouseId: number,
) {
  const { supabase } = await getSupabaseWithUser()
  const { data, error } = await supabase
    .from('inventory')
    .select('quantity')
    .eq('model_id', modelId)
    .eq('size_id', sizeId)
    .eq('color_id', colorId)
    .eq('warehouse_id', warehouseId)
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
    warehouseId: number
  }>,
) {
  const { supabase } = await getSupabaseWithUser()
  const payload = items.map((item) => ({
    date: item.date,
    model_id: item.modelId,
    size_id: item.sizeId,
    color_id: item.colorId,
    type: parseTransactionType(item.type),
    quantity: item.quantity,
    warehouse_id: item.warehouseId,
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

export async function runReceiveFactoryArrival(
  arrivalId: number,
  warehouseId: number,
  items: Array<{ arrivalItemId: number; quantity: number }>,
) {
  const { supabase } = await getSupabaseWithUser()
  const payload = items.map((item) => ({
    arrival_item_id: item.arrivalItemId,
    quantity: item.quantity,
  }))

  const { error } = await supabase.rpc('receive_factory_arrival', {
    p_arrival_id: arrivalId,
    p_warehouse_id: warehouseId,
    p_items: payload,
  })

  if (error) throw new Error(error.message)
}

export async function getModelLookups(modelId: number) {
  const models = await getCatalogData()
  const model = models.models.find((entry) => entry.id === modelId)
  if (!model) throw new Error('Model not found.')
  return { sizes: model.sizes, colors: model.colors }
}

export async function getAnalyticsData() {
  const { models, warehouses } = await getCatalogData()
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
    warehouses,
  }
}

export async function getRawTransactions() {
  const { supabase } = await getSupabaseWithUser()
  const { data, error } = await supabase
    .from('transactions')
    .select('date, type, quantity, model_id, warehouse_id')
    .order('date', { ascending: true })

  return ensure(
    data as Array<{
      date: string
      type: TransactionTypeValue
      quantity: number
      model_id: number
      warehouse_id: number
    }> | null,
    error,
  )
}

export async function getSetupState(): Promise<SetupProgress> {
  const { supabase } = await getSupabaseWithUser()
  const [warehousesRes, modelsRes, sizesRes, colorsRes] = await Promise.all([
    supabase.from('warehouses').select('id', { count: 'exact', head: true }),
    supabase.from('models').select('id', { count: 'exact', head: true }),
    supabase.from('sizes').select('id, model_id'),
    supabase.from('colors').select('id, model_id'),
  ])

  const warehouseCount = warehousesRes.count ?? 0
  const modelCount = modelsRes.count ?? 0
  const sizes = ensure(sizesRes.data as Array<{ model_id: number }> | null, sizesRes.error)
  const colors = ensure(colorsRes.data as Array<{ model_id: number }> | null, colorsRes.error)

  const sizeModels = new Set(sizes.map((row) => row.model_id))
  const colorModels = new Set(colors.map((row) => row.model_id))

  const allModelsHaveSpec = modelCount > 0 && modelCount === sizeModels.size && modelCount === colorModels.size
  const needsSetup = warehouseCount === 0 || modelCount === 0 || !allModelsHaveSpec

  return {
    needsSetup,
    hasWarehouse: warehouseCount > 0,
    hasModel: modelCount > 0,
    allModelsHaveSpec,
    warehouseCount,
    modelCount,
  }
}

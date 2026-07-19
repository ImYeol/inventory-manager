import { getSupabaseWithUser } from './db'
import {
  formatDateLabel,
  parseTransactionType,
  normalizeManualInventoryOperation,
  type ManualInventoryOperationKind,
  transactionTypeLabels,
  type TransactionTypeValue,
} from './inventory'
import type { InboundDraftRowInput } from './inbound'
import type { InboundTemplateVersion } from './inbound-import'
import { allocationRemainder, isCanonicalIncomingArrival } from './factory-arrival'

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

type HistoryRevertState = {
  canRevert: boolean
  revertDisabledReason: string | null
  revertSummary: string | null
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
  inbound_import_source_row_id?: number | null
  external_sku_snapshot?: string | null
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

export type HistoryTransaction = {
  id: number
  date: string
  type: string
  quantity: number
  warehouseId: number
  warehouse: string
  warehouseName: string
  sourceChannel: string | null
  referenceType: string | null
  referenceId: number | null
  memo: string | null
  createdAt: string
  modelName: string
  sizeName: string
  colorName: string
  colorRgb: string
  canRevert: boolean
  revertDisabledReason: string | null
  revertSummary: string | null
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

export type FactorySourcingItem = {
  expectedDate: string
  status: string
  modelName: string
  sizeName: string
  colorName: string
  orderedQuantity: number
  receivedQuantity: number
  remainingQuantity: number
}

export type FactorySourcingItemsByFactory = Record<number, FactorySourcingItem[]>

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
  shortageClosures: Array<{ id: number; allocationId: number; quantity: number; reason: string; closedAt: string }>
  receiptLines: Array<{
    id: number; eventId: number; itemId: number | null; allocationId: number | null; warehouseId: number | null
    receivedQuantity: number; normalQuantity: number; overageQuantity: number; overageReason: string | null
    shortageClosureId: number | null; createdAt: string; corrected: boolean
  }>
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
    sourceRowNumber: number | null
    externalSku: string | null
    allocations: Array<{
      id: number; warehouseId: number; warehouseName: string; allocatedQuantity: number
      normallyReceivedQuantity: number; shortageClosedQuantity: number; remainingQuantity: number
    }>
  }>
}

export type SourcingSchemaState = {
  status: 'ready' | 'missing'
  message: string | null
}

export type FactoriesDataResult = {
  schemaState: SourcingSchemaState
  factories: FactoryData[]
  factorySourcingItems: FactorySourcingItemsByFactory
}

export type FactoryArrivalsDataResult = {
  schemaState: SourcingSchemaState
  arrivals: FactoryArrivalData[]
}

export type ManualInboundDraftRowData = {
  id: number
  draftId: number
  supplierName: string
  template: string
  externalSku: string
  quantity: number
  receivedQuantity: number
  warehouseName: string
  productVariantId: number | null
  productName: string | null
  sellerSku: string | null
}

export const SOURCING_SCHEMA_MISSING_MESSAGE =
  '소싱 스키마가 아직 배포되지 않았습니다. supabase/schema.sql 적용 후 다시 시도하세요.'

function ensure<T>(data: T | null, error: { message: string } | null): T {
  if (error) throw new Error(error.message)
  if (!data) throw new Error('No data returned from Supabase.')
  return data
}

function makeTransactionLedgerKey(row: Pick<TransactionRow, 'model_id' | 'size_id' | 'color_id' | 'warehouse_id'>) {
  return `${row.model_id}:${row.size_id}:${row.color_id}:${row.warehouse_id}`
}

function getRevertSummary(type: TransactionTypeValue) {
  if (type === 'INBOUND') return '같은 수량의 출고 보정 이력이 추가됩니다.'
  if (type === 'OUTBOUND') return '같은 수량의 입고 보정 이력이 추가됩니다.'
  return '직전 재고값으로 재고조정 이력이 추가됩니다.'
}

function getHistoryRevertState(row: TransactionRow, isLatestForKey: boolean): HistoryRevertState {
  if (!isLatestForKey) {
    return {
      canRevert: false,
      revertDisabledReason: '후속 이력 있음',
      revertSummary: null,
    }
  }

  if (row.source_channel === 'csv') {
    return {
      canRevert: false,
      revertDisabledReason: 'CSV 반영',
      revertSummary: null,
    }
  }

  if (row.source_channel === 'factory-arrival') {
    return {
      canRevert: false,
      revertDisabledReason: '예정입고 반영',
      revertSummary: null,
    }
  }

  if (row.reference_type !== null || row.reference_id !== null) {
    return {
      canRevert: false,
      revertDisabledReason: '이미 시스템 참조가 있는 행',
      revertSummary: null,
    }
  }

  if (row.source_channel !== null && row.source_channel !== 'manual') {
    return {
      canRevert: false,
      revertDisabledReason: '이미 시스템 참조가 있는 행',
      revertSummary: null,
    }
  }

  return {
    canRevert: true,
    revertDisabledReason: null,
    revertSummary: getRevertSummary(row.type),
  }
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

export function isMissingSourcingSchemaError(error: { message: string } | null | undefined) {
  return isMissingSchemaError(error)
}

function getReadySourcingSchemaState(): SourcingSchemaState {
  return { status: 'ready', message: null }
}

function getMissingSourcingSchemaState(): SourcingSchemaState {
  return { status: 'missing', message: SOURCING_SCHEMA_MISSING_MESSAGE }
}

export function getSourcingSchemaState(errors: Array<{ message: string } | null | undefined>): SourcingSchemaState {
  return errors.some((error) => isMissingSourcingSchemaError(error)) ? getMissingSourcingSchemaState() : getReadySourcingSchemaState()
}

export function normalizeSourcingErrorMessage(
  error: { message: string } | null | undefined,
  fallback: string,
) {
  if (isMissingSourcingSchemaError(error)) {
    return SOURCING_SCHEMA_MISSING_MESSAGE
  }

  return error?.message ?? fallback
}

function isOpenSourcingArrival(status: string) {
  return status === '예정' || status === '부분입고' || isCanonicalIncomingArrival(status)
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

export type ProductWorkspaceVariant = {
  id: number
  modelId?: number
  sizeId?: number
  colorId?: number
  modelName: string
  sizeName: string
  colorName: string
  sellerSku: string
  onHand: number
  committed: number
  committedByWarehouse: Record<number, number>
  available: number
  incoming: number
  incomingByWarehouse: Record<number, number>
}

export type ProductWorkspaceChannelRef = {
  id: number
  variantId: number | null
  channel: 'naver' | 'coupang'
  externalProductId: string
  externalVariantId: string
  productName: string | null
  optionName: string | null
  sellerSku: string | null
  listingStatus: 'active' | 'sold-out' | 'approval-pending' | 'mapping-required' | 'unregistered' | 'paused' | 'sync-error'
  channelReported: number | null
  lastSyncedAt: string | null
  lastSyncError: string | null
  syncTargetQuantity?: number | null
  syncStatus?: 'idle' | 'required' | 'failed' | 'succeeded'
  verificationStatus: 'verified' | 'unverified'
  imageUrl: string | null
  price: number | null
}

export async function getProductWorkspaceData(): Promise<{
  variants: ProductWorkspaceVariant[]
  channelProductRefs: ProductWorkspaceChannelRef[]
}> {
  const { supabase } = await getSupabaseWithUser()
  const [variantsRes, modelsRes, sizesRes, colorsRes, inventoryRes, reservationsRes, refsRes, arrivalsRes, allocationsRes] = await Promise.all([
    supabase.from('product_variants').select('id, model_id, size_id, color_id, seller_sku'),
    supabase.from('models').select('id, name'),
    supabase.from('sizes').select('id, name'),
    supabase.from('colors').select('id, name'),
    supabase.from('inventory').select('model_id, size_id, color_id, quantity'),
    supabase.from('inventory_reservations').select('product_variant_id, warehouse_id, quantity').eq('status', 'active'),
    supabase.from('channel_product_refs').select('id, variant_id, channel, external_product_id, external_variant_id, product_name, option_name, seller_sku, listing_status, channel_attributes, channel_reported, last_synced_at, last_sync_error, sync_target_quantity, sync_status, verification_status'),
    supabase.from('factory_arrivals').select('id, status'),
    supabase.from('factory_arrival_allocations').select('factory_arrival_id, product_variant_id, warehouse_id, allocated_quantity, normally_received_quantity, shortage_closed_quantity'),
  ])
  if ([variantsRes, reservationsRes, refsRes].some((response) => isMissingSchemaError(response.error))) {
    return { variants: [], channelProductRefs: [] }
  }
  const canonicalArrivalSchemaMissing = [arrivalsRes, allocationsRes].some((response) => isMissingSchemaError(response.error))
  const responses = canonicalArrivalSchemaMissing
    ? [variantsRes, modelsRes, sizesRes, colorsRes, inventoryRes, reservationsRes, refsRes]
    : [variantsRes, modelsRes, sizesRes, colorsRes, inventoryRes, reservationsRes, refsRes, arrivalsRes, allocationsRes]
  if (responses.some((response) => response.error)) throw new Error('상품 작업공간 데이터를 불러오지 못했습니다.')

  const models = new Map((modelsRes.data ?? []).map((row) => [Number(row.id), row.name]))
  const sizes = new Map((sizesRes.data ?? []).map((row) => [Number(row.id), row.name]))
  const colors = new Map((colorsRes.data ?? []).map((row) => [Number(row.id), row.name]))
  const onHand = new Map<string, number>()
  for (const row of inventoryRes.data ?? []) {
    const key = `${row.model_id}:${row.size_id}:${row.color_id}`
    onHand.set(key, (onHand.get(key) ?? 0) + row.quantity)
  }
  const committed = new Map<number, number>()
  const committedByVariantWarehouse = new Map<string, number>()
  for (const row of reservationsRes.data ?? []) {
    const id = Number(row.product_variant_id)
    committed.set(id, (committed.get(id) ?? 0) + row.quantity)
    const warehouseKey = `${id}:${Number(row.warehouse_id)}`
    committedByVariantWarehouse.set(warehouseKey, (committedByVariantWarehouse.get(warehouseKey) ?? 0) + row.quantity)
  }
  const openArrivalIds = new Set(
    (canonicalArrivalSchemaMissing ? [] : arrivalsRes.data ?? [])
      .filter((arrival) => isCanonicalIncomingArrival(arrival.status))
      .map((arrival) => Number(arrival.id)),
  )
  const incoming = new Map<string, number>()
  const incomingByVariantWarehouse = new Map<string, number>()
  const variantKey = new Map((variantsRes.data ?? []).map((variant) => [Number(variant.id), `${variant.model_id}:${variant.size_id}:${variant.color_id}`]))
  for (const item of canonicalArrivalSchemaMissing ? [] : allocationsRes.data ?? []) {
    if (!openArrivalIds.has(Number(item.factory_arrival_id))) continue
    const key = variantKey.get(Number(item.product_variant_id))
    if (!key) continue
    const remainder = allocationRemainder({ allocatedQuantity: Number(item.allocated_quantity), normallyReceivedQuantity: Number(item.normally_received_quantity), shortageClosedQuantity: Number(item.shortage_closed_quantity) })
    incoming.set(key, (incoming.get(key) ?? 0) + remainder)
    const warehouseKey = `${Number(item.product_variant_id)}:${Number(item.warehouse_id)}`
    incomingByVariantWarehouse.set(warehouseKey, (incomingByVariantWarehouse.get(warehouseKey) ?? 0) + remainder)
  }
  const variants = (variantsRes.data ?? []).map((row) => ({
    id: Number(row.id),
    modelId: Number(row.model_id),
    sizeId: Number(row.size_id),
    colorId: Number(row.color_id),
    modelName: models.get(Number(row.model_id)) ?? `모델 #${row.model_id}`,
    sizeName: sizes.get(Number(row.size_id)) ?? `사이즈 #${row.size_id}`,
    colorName: colors.get(Number(row.color_id)) ?? `색상 #${row.color_id}`,
    sellerSku: row.seller_sku,
    onHand: onHand.get(`${row.model_id}:${row.size_id}:${row.color_id}`) ?? 0,
    committed: committed.get(Number(row.id)) ?? 0,
    committedByWarehouse: Object.fromEntries(Array.from(committedByVariantWarehouse.entries()).filter(([key]) => key.startsWith(`${Number(row.id)}:`)).map(([key, quantity]) => [Number(key.split(':')[1]), quantity])),
    available: (onHand.get(`${row.model_id}:${row.size_id}:${row.color_id}`) ?? 0) - (committed.get(Number(row.id)) ?? 0),
    incoming: incoming.get(`${row.model_id}:${row.size_id}:${row.color_id}`) ?? 0,
    incomingByWarehouse: Object.fromEntries(Array.from(incomingByVariantWarehouse.entries()).filter(([key]) => key.startsWith(`${Number(row.id)}:`)).map(([key, quantity]) => [Number(key.split(':')[1]), quantity])),
  }))
  const channelProductRefs = (refsRes.data ?? []).map((row) => {
    const attributes = (row.channel_attributes ?? {}) as { imageUrl?: unknown; price?: unknown }
    return {
      id: Number(row.id), variantId: row.variant_id === null ? null : Number(row.variant_id), channel: row.channel as 'naver' | 'coupang',
      externalProductId: row.external_product_id, externalVariantId: row.external_variant_id, productName: row.product_name,
      optionName: row.option_name, sellerSku: row.seller_sku, listingStatus: row.listing_status as ProductWorkspaceChannelRef['listingStatus'],
      channelReported: row.channel_reported, lastSyncedAt: row.last_synced_at, lastSyncError: row.last_sync_error,
      syncTargetQuantity: row.sync_target_quantity, syncStatus: row.sync_status === 'required' || row.sync_status === 'failed' || row.sync_status === 'succeeded' ? row.sync_status : 'idle',
      verificationStatus: row.verification_status === 'verified' ? 'verified' : 'unverified',
      imageUrl: typeof attributes.imageUrl === 'string' ? attributes.imageUrl : null,
      price: typeof attributes.price === 'number' ? attributes.price : null,
    }
  })
  return { variants, channelProductRefs }
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
  const latestLedgerKeys = new Set<string>()

  return {
    transactions: transactions.map((item): HistoryTransaction => {
      const ledgerKey = makeTransactionLedgerKey(item)
      const isLatestForKey = !latestLedgerKeys.has(ledgerKey)

      if (isLatestForKey) {
        latestLedgerKeys.add(ledgerKey)
      }

      const revertState = getHistoryRevertState(item, isLatestForKey)

      return {
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
        canRevert: revertState.canRevert,
        revertDisabledReason: revertState.revertDisabledReason,
        revertSummary: revertState.revertSummary,
      }
    }),
    models: models.map((model) => ({ id: model.id, name: model.name })),
    warehouses: warehouses.map((warehouse) => ({ id: warehouse.id, name: warehouse.name })),
  }
}

export async function getFactoriesData(): Promise<FactoriesDataResult> {
  const { supabase } = await getSupabaseWithUser()
  const [factoriesRes, arrivalsRes, arrivalItemsRes, modelsRes, sizesRes, colorsRes] = await Promise.all([
    supabase
      .from('factories')
      .select('id, name, contact_name, phone, email, notes, is_active, created_at, updated_at')
      .order('is_active', { ascending: false })
      .order('name'),
    supabase
      .from('factory_arrivals')
      .select('id, factory_id, expected_date, status')
      .order('expected_date', { ascending: true })
      .order('created_at', { ascending: false }),
    supabase
      .from('factory_arrival_items')
      .select('factory_arrival_id, model_id, size_id, color_id, ordered_quantity, received_quantity'),
    supabase.from('models').select('id, name'),
    supabase.from('sizes').select('id, name'),
    supabase.from('colors').select('id, name'),
  ])

  const schemaState = getSourcingSchemaState([factoriesRes.error, arrivalsRes.error, arrivalItemsRes.error])

  if (schemaState.status === 'missing') {
    return {
      schemaState,
      factories: [],
      factorySourcingItems: {},
    }
  }

  const factories = ensure(factoriesRes.data as FactoryRow[] | null, factoriesRes.error)
  const arrivals = ensure(
    arrivalsRes.data as Array<{ id: number; factory_id: number; expected_date: string; status: string }> | null,
    arrivalsRes.error,
  )
  const arrivalItems = ensure(
    arrivalItemsRes.data as Array<{
      factory_arrival_id: number
      model_id?: number
      size_id?: number
      color_id?: number
      ordered_quantity: number
      received_quantity: number
    }> | null,
    arrivalItemsRes.error,
  )
  const models = ensure(modelsRes.data as Array<{ id: number; name: string }> | null, modelsRes.error)
  const sizes = ensure(sizesRes.data as Array<{ id: number; name: string }> | null, sizesRes.error)
  const colors = ensure(colorsRes.data as Array<{ id: number; name: string }> | null, colorsRes.error)

  const arrivalByFactory = new Map<number, Array<{ id: number; expectedDate: string; status: string }>>()
  for (const arrival of arrivals) {
    const list = arrivalByFactory.get(arrival.factory_id) ?? []
    list.push({
      id: arrival.id,
      expectedDate: arrival.expected_date,
      status: arrival.status,
    })
    arrivalByFactory.set(arrival.factory_id, list)
  }

  const modelMap = new Map(models.map((model) => [model.id, model.name]))
  const sizeMap = new Map(sizes.map((size) => [size.id, size.name]))
  const colorMap = new Map(colors.map((color) => [color.id, color.name]))
  const factorySourcingItems: FactorySourcingItemsByFactory = {}

  const mappedFactories = factories.map((factory) => {
    const arrivalsForFactory = arrivalByFactory.get(factory.id) ?? []
    const arrivalIds = arrivalsForFactory.map((arrival) => arrival.id)
    const relevantItems = arrivalItems.filter((item) => arrivalIds.includes(item.factory_arrival_id))
    const openItems = arrivalsForFactory.flatMap((arrival) =>
      arrivalItems
        .filter((item) => item.factory_arrival_id === arrival.id)
        .map((item) => ({
          arrival,
          item,
          remainingQuantity: Math.max(item.ordered_quantity - item.received_quantity, 0),
        }))
        .filter(({ arrival: currentArrival, remainingQuantity }) => isOpenSourcingArrival(currentArrival.status) && remainingQuantity > 0),
    )
    const openArrivalCount = new Set(openItems.map(({ arrival }) => arrival.id)).size

    factorySourcingItems[factory.id] = openItems.map(({ arrival, item, remainingQuantity }) => ({
      expectedDate: arrival.expectedDate,
      status: arrival.status,
      modelName: modelMap.get(item.model_id ?? 0) ?? '',
      sizeName: sizeMap.get(item.size_id ?? 0) ?? '',
      colorName: colorMap.get(item.color_id ?? 0) ?? '',
      orderedQuantity: item.ordered_quantity,
      receivedQuantity: item.received_quantity,
      remainingQuantity,
    }))

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
      arrivalCount: openArrivalCount,
      pendingQuantity: relevantItems.reduce(
        (sum, item) => sum + Math.max(item.ordered_quantity - item.received_quantity, 0),
        0,
      ),
    }
  })

  return {
    schemaState,
    factories: mappedFactories,
    factorySourcingItems,
  }
}

export async function getFactoryArrivalsData(): Promise<FactoryArrivalsDataResult> {
  const { supabase } = await getSupabaseWithUser()
  const [factoriesRes, arrivalsRes, arrivalItemsRes, sourceRowsRes, allocationsRes, receiptEventsRes, receiptLinesRes, closuresRes, correctionsRes, modelsRes, sizesRes, colorsRes] = await Promise.all([
    supabase.from('factories').select('id, name'),
    supabase
      .from('factory_arrivals')
      .select('id, factory_id, reference_code, expected_date, status, source_channel, memo, created_at, updated_at')
      .order('expected_date', { ascending: true })
      .order('created_at', { ascending: false }),
    supabase
      .from('factory_arrival_items')
      .select('id, factory_arrival_id, model_id, size_id, color_id, ordered_quantity, received_quantity, inbound_import_source_row_id, external_sku_snapshot, created_at, updated_at'),
    supabase.from('inbound_import_source_rows').select('id, source_row_number, source_row_ordinal'),
    supabase.from('factory_arrival_allocations').select('id, factory_arrival_id, factory_arrival_item_id, warehouse_id, allocated_quantity, normally_received_quantity, shortage_closed_quantity, warehouse_name_snapshot'),
    supabase.from('factory_receipt_events').select('id, factory_arrival_id, receipt_request_id, event_kind'),
    supabase.from('factory_receipt_lines').select('id, factory_receipt_event_id, factory_arrival_allocation_id, factory_arrival_item_id, warehouse_id, received_quantity, normal_quantity, overage_quantity, overage_reason, factory_arrival_shortage_closure_id, created_at'),
    supabase.from('factory_arrival_shortage_closures').select('id, factory_arrival_allocation_id, quantity, reason, closed_at'),
    supabase.from('factory_receipt_line_corrections').select('id, factory_receipt_line_id'),
    supabase.from('models').select('id, name'),
    supabase.from('sizes').select('id, name'),
    supabase.from('colors').select('id, name, rgb_code'),
  ])

  const schemaState = getSourcingSchemaState([factoriesRes.error, arrivalsRes.error, arrivalItemsRes.error, sourceRowsRes.error, allocationsRes.error, receiptEventsRes.error, receiptLinesRes.error, closuresRes.error, correctionsRes.error])

  if (schemaState.status === 'missing') {
    return {
      schemaState,
      arrivals: [],
    }
  }

  const factories = ensure(factoriesRes.data as Array<{ id: number; name: string }> | null, factoriesRes.error)
  const arrivals = ensure(arrivalsRes.data as FactoryArrivalRow[] | null, arrivalsRes.error)
  const arrivalItems = ensure(arrivalItemsRes.data as FactoryArrivalItemRow[] | null, arrivalItemsRes.error)
  const sourceRows = new Map(ensure(sourceRowsRes.data as Array<{ id: number; source_row_number: number | null; source_row_ordinal: number | null }> | null, sourceRowsRes.error).map((row) => [Number(row.id), row]))
  const allocations = ensure(allocationsRes.data as Array<{ id: number; factory_arrival_id: number; factory_arrival_item_id: number; warehouse_id: number; allocated_quantity: number; normally_received_quantity: number; shortage_closed_quantity: number; warehouse_name_snapshot: string | null }> | null, allocationsRes.error)
  const receiptEvents = ensure(receiptEventsRes.data as Array<{ id: number; factory_arrival_id: number }> | null, receiptEventsRes.error)
  const receiptLines = ensure(receiptLinesRes.data as Array<{ id: number; factory_receipt_event_id: number; factory_arrival_allocation_id: number | null; factory_arrival_item_id: number | null; warehouse_id: number | null; received_quantity: number; normal_quantity: number; overage_quantity: number; overage_reason: string | null; factory_arrival_shortage_closure_id: number | null; created_at: string }> | null, receiptLinesRes.error)
  const closures = ensure(closuresRes.data as Array<{ id: number; factory_arrival_allocation_id: number; quantity: number; reason: string; closed_at: string }> | null, closuresRes.error)
  const correctedLineIds = new Set(ensure(correctionsRes.data as Array<{ factory_receipt_line_id: number }> | null, correctionsRes.error).map((row) => Number(row.factory_receipt_line_id)))
  const models = ensure(modelsRes.data as Array<{ id: number; name: string }> | null, modelsRes.error)
  const sizes = ensure(sizesRes.data as Array<{ id: number; name: string }> | null, sizesRes.error)
  const colors = ensure(colorsRes.data as Array<{ id: number; name: string; rgb_code: string }> | null, colorsRes.error)

  const factoryMap = new Map(factories.map((factory) => [factory.id, factory.name]))
  const modelMap = new Map(models.map((model) => [model.id, model.name]))
  const sizeMap = new Map(sizes.map((size) => [size.id, size.name]))
  const colorMap = new Map(colors.map((color) => [color.id, color]))

  return {
    schemaState,
    arrivals: arrivals.map((arrival) => {
      const items = arrivalItems
        .filter((item) => item.factory_arrival_id === arrival.id)
        .map((item) => {
        const itemAllocations = allocations.filter((allocation) => allocation.factory_arrival_item_id === item.id).map((allocation) => ({
          id: Number(allocation.id), warehouseId: Number(allocation.warehouse_id), warehouseName: allocation.warehouse_name_snapshot ?? `창고 #${allocation.warehouse_id}`,
          allocatedQuantity: Number(allocation.allocated_quantity), normallyReceivedQuantity: Number(allocation.normally_received_quantity), shortageClosedQuantity: Number(allocation.shortage_closed_quantity),
          remainingQuantity: allocationRemainder({ allocatedQuantity: Number(allocation.allocated_quantity), normallyReceivedQuantity: Number(allocation.normally_received_quantity), shortageClosedQuantity: Number(allocation.shortage_closed_quantity) }),
        }))
        return ({
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
        remainingQuantity: itemAllocations.reduce((sum, allocation) => sum + allocation.remainingQuantity, 0),
        sourceRowNumber: item.inbound_import_source_row_id == null ? null : Number(sourceRows.get(Number(item.inbound_import_source_row_id))?.source_row_number ?? sourceRows.get(Number(item.inbound_import_source_row_id))?.source_row_ordinal ?? 0) || null,
        externalSku: item.external_sku_snapshot ?? null,
        allocations: itemAllocations,
      })})

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
      remainingQuantity: items.reduce((sum, item) => sum + item.remainingQuantity, 0),
      shortageClosures: closures.filter((closure) => allocations.some((allocation) => allocation.factory_arrival_id === arrival.id && allocation.id === closure.factory_arrival_allocation_id)).map((closure) => ({ id: Number(closure.id), allocationId: Number(closure.factory_arrival_allocation_id), quantity: Number(closure.quantity), reason: closure.reason, closedAt: closure.closed_at })),
      receiptLines: receiptLines.filter((line) => receiptEvents.some((event) => event.factory_arrival_id === arrival.id && event.id === line.factory_receipt_event_id)).map((line) => ({
        id: Number(line.id), eventId: Number(line.factory_receipt_event_id), itemId: line.factory_arrival_item_id === null ? null : Number(line.factory_arrival_item_id), allocationId: line.factory_arrival_allocation_id === null ? null : Number(line.factory_arrival_allocation_id), warehouseId: line.warehouse_id === null ? null : Number(line.warehouse_id), receivedQuantity: Number(line.received_quantity), normalQuantity: Number(line.normal_quantity), overageQuantity: Number(line.overage_quantity), overageReason: line.overage_reason, shortageClosureId: line.factory_arrival_shortage_closure_id === null ? null : Number(line.factory_arrival_shortage_closure_id), createdAt: line.created_at, corrected: correctedLineIds.has(Number(line.id)),
      })),
      items,
    }
    }),
  }
}

/** Manual supplier rows remain a separate draft surface until inspected and received. */
export async function getManualInboundDraftRows(): Promise<ManualInboundDraftRowData[]> {
  const { supabase } = await getSupabaseWithUser()
  try {
    const [draftsRes, rowsRes, factoriesRes, warehousesRes, variantsRes, modelsRes] = await Promise.all([
      supabase.from('inbound_drafts').select('id, supplier_id, status'),
      supabase.from('inbound_draft_rows').select('id, inbound_draft_id, template, external_sku, quantity, received_quantity, warehouse_id, product_variant_id, source_row_number, validation_error'),
      supabase.from('factories').select('id, name'),
      supabase.from('warehouses').select('id, name'),
      supabase.from('product_variants').select('id, model_id, seller_sku'),
      supabase.from('models').select('id, name'),
    ])
    if (rowsRes.error || draftsRes.error) return []
    const drafts = new Map((draftsRes.data ?? []).map((draft) => [Number(draft.id), draft]))
    const factoryNames = new Map((factoriesRes.data ?? []).map((factory) => [Number(factory.id), factory.name]))
    const warehouseNames = new Map((warehousesRes.data ?? []).map((warehouse) => [Number(warehouse.id), warehouse.name]))
    const modelNames = new Map((modelsRes.data ?? []).map((model) => [Number(model.id), model.name]))
    const variants = new Map((variantsRes.data ?? []).map((variant) => [Number(variant.id), variant]))
    return (rowsRes.data ?? []).flatMap((row) => {
      const draft = drafts.get(Number(row.inbound_draft_id))
      if (!draft || draft.status === 'received' || row.validation_error || row.quantity === null || Number(row.received_quantity) >= Number(row.quantity)) return []
      const variant = row.product_variant_id === null ? null : variants.get(Number(row.product_variant_id))
      return [{
        id: Number(row.id), draftId: Number(row.inbound_draft_id), supplierName: factoryNames.get(Number(draft.supplier_id)) ?? '공급자',
        template: row.template, externalSku: row.external_sku, quantity: Number(row.quantity), receivedQuantity: Number(row.received_quantity),
        warehouseName: warehouseNames.get(Number(row.warehouse_id)) ?? '창고', productVariantId: row.product_variant_id === null ? null : Number(row.product_variant_id),
        productName: variant ? modelNames.get(Number(variant.model_id)) ?? null : null, sellerSku: variant?.seller_sku ?? null,
      }]
    })
  } catch {
    return []
  }
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

export async function runManualInventoryOperations(
  items: Array<{
    kind: ManualInventoryOperationKind
    date: string
    modelId: number
    sizeId: number
    colorId: number
    quantity: number
    warehouseId: number
    reason: string
  }>,
) {
  const { supabase } = await getSupabaseWithUser()
  const payload = items.map((item) => {
    const operation = normalizeManualInventoryOperation(item)
    return {
      kind: operation.kind,
      date: item.date,
      model_id: item.modelId,
      size_id: item.sizeId,
      color_id: item.colorId,
      quantity: operation.quantity,
      warehouse_id: item.warehouseId,
      reason: operation.reason,
    }
  })

  const { error } = await supabase.rpc('apply_manual_inventory_operations', { p_items: payload })
  if (error) throw new Error(error.message)
}

export async function runWarehouseTransfer(transfer: {
  date: string
  modelId: number
  sizeId: number
  colorId: number
  fromWarehouseId: number
  toWarehouseId: number
  quantity: number
  reason: string
}) {
  const { supabase } = await getSupabaseWithUser()
  const reason = transfer.reason.trim()
  if (!transfer.modelId || !transfer.sizeId || !transfer.colorId || !transfer.fromWarehouseId || !transfer.toWarehouseId) {
    throw new Error('상품 옵션과 출발·도착 창고를 모두 선택해주세요.')
  }
  if (transfer.fromWarehouseId === transfer.toWarehouseId) throw new Error('출발 창고와 도착 창고는 달라야 합니다.')
  if (!Number.isInteger(transfer.quantity) || transfer.quantity <= 0) throw new Error('이동 수량은 양수여야 합니다.')
  if (!reason) throw new Error('이동 사유를 입력해주세요.')

  const { error } = await supabase.rpc('transfer_inventory_between_warehouses', {
    p_transfer: {
      date: transfer.date,
      model_id: transfer.modelId,
      size_id: transfer.sizeId,
      color_id: transfer.colorId,
      from_warehouse_id: transfer.fromWarehouseId,
      to_warehouse_id: transfer.toWarehouseId,
      quantity: transfer.quantity,
      reason,
    },
  })
  if (error) throw new Error(error.message)
}

export async function runRevertTransaction(transactionId: number, memo?: string | null) {
  const { supabase } = await getSupabaseWithUser()
  const normalizedMemo = memo?.trim() ? memo.trim() : null
  const { error } = await supabase.rpc('revert_inventory_transaction', {
    p_transaction_id: transactionId,
    p_memo: normalizedMemo,
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

export async function runFactoryArrivalOperation(name: 'replace_factory_arrival_allocations' | 'receive_factory_arrival_request' | 'close_factory_arrival_shortage' | 'record_factory_arrival_follow_up' | 'reverse_factory_receipt_line', payload: Record<string, unknown>) {
  const { supabase } = await getSupabaseWithUser()
  const { data, error } = await supabase.rpc(name, { p_payload: payload })
  if (error) throw new Error(error.message)
  return data
}

export async function createInboundDraft(input: {
  supplierId: number
  rows: InboundDraftRowInput[]
  templateId?: number
  templateVersionId?: number
  source?: { storagePath: string; filename: string; fileHash: string; sheetName: string; headerRowNumber: number; headers: string[] }
}) {
  if (!input.supplierId || input.rows.length === 0) throw new Error('공급자와 입고 행을 입력해주세요.')
  const { supabase } = await getSupabaseWithUser()
  const { data: draft, error: draftError } = await supabase
    .from('inbound_drafts')
    .insert({ supplier_id: input.supplierId, template_id: input.templateId ?? null, template_version_id: input.templateVersionId ?? null, source_storage_path: input.source?.storagePath ?? null, source_filename: input.source?.filename ?? null, source_file_hash: input.source?.fileHash ?? null, source_sheet_name: input.source?.sheetName ?? null, source_header_row_number: input.source?.headerRowNumber ?? null, source_headers: input.source?.headers ?? null })
    .select('id')
    .single()
  if (draftError || !draft?.id) throw new Error(draftError?.message ?? '입고 초안을 저장하지 못했습니다.')
  const { error: rowsError } = await supabase.from('inbound_draft_rows').insert(input.rows.map((row) => ({
    inbound_draft_id: draft.id,
    template: row.template.trim(),
    external_sku: row.externalSku.trim(),
    quantity: row.quantity,
    warehouse_id: row.warehouseId,
    product_variant_id: row.productVariantId,
    source_row_number: 'sourceRowNumber' in row ? (row as InboundDraftRowInput & { sourceRowNumber?: number }).sourceRowNumber ?? null : null,
    source_values: 'sourceValues' in row ? (row as InboundDraftRowInput & { sourceValues?: Record<string, string> }).sourceValues ?? {} : {},
    validation_error: 'validationError' in row ? (row as InboundDraftRowInput & { validationError?: string | null }).validationError ?? null : null,
  })))
  if (rowsError) throw new Error(rowsError.message)
  return Number(draft.id)
}

export async function getInboundTemplateVersion(templateVersionId: number): Promise<InboundTemplateVersion & { active: boolean }> {
  const { supabase } = await getSupabaseWithUser()
  const { data, error } = await supabase.from('inbound_template_versions')
    .select('id, template_id, version_number, sheet_name, header_row_number, headers, mappings, inbound_templates!inner(is_active)')
    .eq('id', templateVersionId).single()
  if (error || !data) throw new Error(error?.message ?? '입고 템플릿 버전을 찾을 수 없습니다.')
  const mappings = data.mappings as { externalSku: string; quantity: string; source: Record<string, string> }
  return { id: Number(data.id), templateId: Number(data.template_id), versionNumber: Number(data.version_number), sheetName: data.sheet_name, headerRowNumber: Number(data.header_row_number), headers: data.headers as string[], mappings, active: Boolean((data.inbound_templates as { is_active?: boolean } | null)?.is_active) }
}

/** Active templates only: inactive versions remain reachable from their audited drafts. */
export async function getActiveInboundTemplates(): Promise<Array<{ id: number; name: string; versionId: number; versionNumber: number }>> {
  const { supabase } = await getSupabaseWithUser()
  const { data, error } = await supabase
    .from('inbound_templates')
    .select('id, name, inbound_template_versions(id, version_number)')
    .eq('is_active', true)
    .order('name')
  if (error) throw new Error(error.message)
  return (data ?? []).flatMap((template) => {
    const versions = (template.inbound_template_versions as Array<{ id: number; version_number: number }> | null) ?? []
    const latest = versions.reduce<{ id: number; version_number: number } | null>((current, version) => (!current || version.version_number > current.version_number ? version : current), null)
    return latest ? [{ id: Number(template.id), name: String(template.name), versionId: Number(latest.id), versionNumber: Number(latest.version_number) }] : []
  })
}

export async function runReceiveInboundDraftRows(draftId: number, rows: Array<{ rowId: number; quantity: number }>) {
  if (!draftId || rows.length === 0) throw new Error('입고 반영 행을 선택해주세요.')
  const { supabase } = await getSupabaseWithUser()
  const { error } = await supabase.rpc('receive_inbound_draft_rows', {
    p_draft_id: draftId,
    p_rows: rows.map((row) => ({ row_id: row.rowId, quantity: row.quantity })),
  })
  if (error) throw new Error(error.message)
}

export async function attachInternalSkuToInboundDraftRow(draftRowId: number, productVariantId: number) {
  if (!draftRowId || !productVariantId) throw new Error('입고 초안 행과 내부 SKU를 선택해주세요.')
  const { supabase } = await getSupabaseWithUser()
  const { data, error } = await supabase
    .from('inbound_draft_rows')
    .update({ product_variant_id: productVariantId })
    .eq('id', draftRowId)
    .is('product_variant_id', null)
    .select('id')
    .maybeSingle()
  if (error) throw new Error(error.message)
  if (!data) throw new Error('입고 초안 행을 연결할 수 없습니다.')
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

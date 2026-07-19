import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  getSupabaseWithUser: vi.fn(),
}))

vi.mock('../src/lib/db', () => ({
  getSupabaseWithUser: mocks.getSupabaseWithUser,
}))

import {
  SOURCING_SCHEMA_MISSING_MESSAGE,
  getAnalyticsData,
  getCatalogData,
  getCurrentStockRow,
  getFactoriesData,
  getFactoryArrivalsData,
  getModelLookups,
  getProductWorkspaceData,
  getRawTransactions,
  getTransactionsWithRelations,
  runBulkTransaction,
  runInventoryAdjustment,
  runManualInventoryOperations,
  runWarehouseTransfer,
  runRevertTransaction,
} from '@/lib/data'

type QueryResult = { data: unknown; error: null | { message: string } }

function createQuery(result: QueryResult) {
  const builder: Record<string, unknown> = {}
  Object.assign(builder, {
    select: vi.fn(() => builder),
    order: vi.fn(() => builder),
    eq: vi.fn(() => builder),
    maybeSingle: vi.fn(async () => result),
    then: (onFulfilled: (value: QueryResult) => unknown, onRejected?: (reason: unknown) => unknown) =>
      Promise.resolve(result).then(onFulfilled, onRejected),
  })
  return builder
}

function createSupabaseMock(resultsByTable: Record<string, QueryResult>) {
  return {
    from: vi.fn((table: string) => {
      const result = resultsByTable[table]
      if (!result) throw new Error(`Unexpected table: ${table}`)
      return createQuery(result)
    }),
    rpc: vi.fn(async () => ({ error: null })),
    auth: { getUser: vi.fn() },
  }
}

beforeEach(() => {
  mocks.getSupabaseWithUser.mockReset()
})

afterEach(() => {
  mocks.getSupabaseWithUser.mockReset()
})

describe('Supabase data mappers', () => {
  it('derives incoming only from open canonical warehouse allocations, never raw import or draft rows', async () => {
    const supabase = createSupabaseMock({
      product_variants: { data: [{ id: 9, model_id: 1, size_id: 10, color_id: 20, seller_sku: 'SKU-1' }], error: null },
      models: { data: [{ id: 1, name: 'LP01' }], error: null },
      sizes: { data: [{ id: 10, name: 'S' }], error: null },
      colors: { data: [{ id: 20, name: '네이비' }], error: null },
      inventory: { data: [{ model_id: 1, size_id: 10, color_id: 20, quantity: 3 }], error: null },
      inventory_reservations: { data: [{ product_variant_id: 9, warehouse_id: 3, quantity: 1 }], error: null },
      channel_product_refs: { data: [], error: null },
      factory_arrivals: { data: [{ id: 7, status: 'READY' }, { id: 8, status: 'RECEIVED' }], error: null },
      factory_arrival_allocations: {
        data: [
          { factory_arrival_id: 7, product_variant_id: 9, warehouse_id: 3, allocated_quantity: 12, normally_received_quantity: 5, shortage_closed_quantity: 2 },
          { factory_arrival_id: 8, product_variant_id: 9, warehouse_id: 3, allocated_quantity: 99, normally_received_quantity: 0, shortage_closed_quantity: 0 },
        ], error: null,
      },
    })
    mocks.getSupabaseWithUser.mockResolvedValue({ supabase, user: { id: 'user-1' } })

    await expect(getProductWorkspaceData()).resolves.toMatchObject({
      variants: [{ id: 9, committed: 1, committedByWarehouse: { 3: 1 }, incoming: 5, incomingByWarehouse: { 3: 5 }, onHand: 3, available: 2 }],
    })
    expect(supabase.from).not.toHaveBeenCalledWith('inbound_draft_rows')
    expect(supabase.from).not.toHaveBeenCalledWith('inbound_import_source_rows')
  })

  it('keeps product inventory available while canonical arrival tables are not deployed', async () => {
    const missingTableError = { message: "relation 'public.factory_arrival_allocations' does not exist" }
    const supabase = createSupabaseMock({
      product_variants: { data: [{ id: 9, model_id: 1, size_id: 10, color_id: 20, seller_sku: 'SKU-1' }], error: null },
      models: { data: [{ id: 1, name: 'LP01' }], error: null },
      sizes: { data: [{ id: 10, name: 'S' }], error: null },
      colors: { data: [{ id: 20, name: '네이비' }], error: null },
      inventory: { data: [{ model_id: 1, size_id: 10, color_id: 20, quantity: 3 }], error: null },
      inventory_reservations: { data: [{ product_variant_id: 9, warehouse_id: 3, quantity: 1 }], error: null },
      channel_product_refs: { data: [], error: null },
      factory_arrivals: { data: null, error: missingTableError },
      factory_arrival_allocations: { data: null, error: missingTableError },
    })
    mocks.getSupabaseWithUser.mockResolvedValue({ supabase, user: { id: 'user-1' } })

    await expect(getProductWorkspaceData()).resolves.toMatchObject({
      variants: [{ id: 9, committed: 1, incoming: 0, incomingByWarehouse: {}, onHand: 3, available: 2 }],
    })
  })

  it('maps catalog rows into the model, size, color, inventory and warehouse shape used by the UI', async () => {
    const supabase = createSupabaseMock({
      models: {
        data: [{ id: 1, name: 'LP01', created_at: '2026-04-12T00:00:00.000Z' }],
        error: null,
      },
      sizes: {
        data: [
          { id: 10, name: 'S', sort_order: 1, model_id: 1 },
          { id: 11, name: 'M', sort_order: 2, model_id: 1 },
        ],
        error: null,
      },
      colors: {
        data: [
          { id: 20, name: '네이비', rgb_code: '#0f172a', text_white: true, sort_order: 1, model_id: 1 },
        ],
        error: null,
      },
      inventory: {
        data: [
          { id: 101, model_id: 1, size_id: 10, color_id: 20, warehouse_id: 1, quantity: 2 },
          { id: 102, model_id: 1, size_id: 10, color_id: 20, warehouse_id: 2, quantity: 3 },
          { id: 103, model_id: 1, size_id: 11, color_id: 20, warehouse_id: 1, quantity: 4 },
          { id: 104, model_id: 1, size_id: 11, color_id: 20, warehouse_id: 2, quantity: 5 },
        ],
        error: null,
      },
      warehouses: {
        data: [
          { id: 1, name: '오금동' },
          { id: 2, name: '대자동' },
        ],
        error: null,
      },
    })

    mocks.getSupabaseWithUser.mockResolvedValue({ supabase, user: { id: 'user-1' } })

    await expect(getCatalogData()).resolves.toEqual({
      models: [
        {
          id: 1,
          name: 'LP01',
          createdAt: '2026-04-12T00:00:00.000Z',
          sizes: [
            { id: 10, name: 'S', sortOrder: 1, modelId: 1 },
            { id: 11, name: 'M', sortOrder: 2, modelId: 1 },
          ],
          colors: [
            { id: 20, name: '네이비', rgbCode: '#0f172a', textWhite: true, sortOrder: 1, modelId: 1 },
          ],
          inventory: [
            { id: 101, modelId: 1, sizeId: 10, colorId: 20, warehouseId: 1, warehouseName: '오금동', quantity: 2 },
            { id: 102, modelId: 1, sizeId: 10, colorId: 20, warehouseId: 2, warehouseName: '대자동', quantity: 3 },
            { id: 103, modelId: 1, sizeId: 11, colorId: 20, warehouseId: 1, warehouseName: '오금동', quantity: 4 },
            { id: 104, modelId: 1, sizeId: 11, colorId: 20, warehouseId: 2, warehouseName: '대자동', quantity: 5 },
          ],
        },
      ],
      warehouses: [
        { id: 1, name: '오금동' },
        { id: 2, name: '대자동' },
      ],
    })
  })

  it('builds transaction labels from row lookups', async () => {
    const supabase = createSupabaseMock({
      transactions: {
        data: [
          {
            id: 1,
            date: '2026-04-12T00:00:00.000Z',
            model_id: 1,
            size_id: 10,
            color_id: 20,
            type: 'INBOUND',
            quantity: 3,
            warehouse_id: 1,
            source_channel: 'factory-arrival',
            reference_type: 'factory_arrival',
            reference_id: 10,
          memo: '공장 예정 입고 반영',
          created_at: '2026-04-12T03:00:00.000Z',
          },
        ],
        error: null,
      },
      models: { data: [{ id: 1, name: 'LP01' }], error: null },
      sizes: { data: [{ id: 10, name: 'S' }], error: null },
      colors: { data: [{ id: 20, name: '네이비', rgb_code: '#0f172a' }], error: null },
      warehouses: { data: [{ id: 1, name: '오금동' }], error: null },
    })
    mocks.getSupabaseWithUser.mockResolvedValue({ supabase, user: { id: 'user-1' } })

    await expect(getTransactionsWithRelations()).resolves.toEqual({
      transactions: [
        {
          id: 1,
          date: '26.04.12',
          type: '입고',
          quantity: 3,
          warehouseId: 1,
          warehouse: '오금동',
          warehouseName: '오금동',
          sourceChannel: 'factory-arrival',
          referenceType: 'factory_arrival',
          referenceId: 10,
          memo: '공장 예정 입고 반영',
          createdAt: '2026-04-12T03:00:00.000Z',
          modelName: 'LP01',
          sizeName: 'S',
          colorName: '네이비',
          colorRgb: '#0f172a',
          canRevert: false,
          revertDisabledReason: '예정입고 반영',
          revertSummary: null,
        },
      ],
      models: [{ id: 1, name: 'LP01' }],
      warehouses: [{ id: 1, name: '오금동' }],
    })
  })

  it('falls back to the legacy transactions select when metadata columns are missing', async () => {
    const legacyRows = [
      {
        id: 1,
        date: '2026-04-12T00:00:00.000Z',
        model_id: 1,
        size_id: 10,
        color_id: 20,
        type: 'INBOUND',
        quantity: 3,
        warehouse_id: 1,
        created_at: '2026-04-12T03:00:00.000Z',
      },
    ]
    const supabase = {
      from: vi.fn((table: string) => {
        if (table !== 'transactions') {
          return createQuery(
            {
              models: { data: [{ id: 1, name: 'LP01' }], error: null },
              sizes: { data: [{ id: 10, name: 'S' }], error: null },
              colors: { data: [{ id: 20, name: '네이비', rgb_code: '#0f172a' }], error: null },
              warehouses: { data: [{ id: 1, name: '오금동' }], error: null },
            }[table] as QueryResult,
          )
        }

        const builder: Record<string, unknown> = {}
        Object.assign(builder, {
          select: vi.fn((columns: string) => {
            if (columns.includes('source_channel')) {
              return {
                order: vi.fn(() => ({
                  order: vi.fn(async () => ({
                    data: null,
                    error: {
                      message: "Could not find the column 'source_channel' of 'transactions' in the schema cache",
                    },
                  })),
                })),
              }
            }

            return {
              order: vi.fn(() => ({
                order: vi.fn(async () => ({
                  data: legacyRows,
                  error: null,
                })),
              })),
            }
          }),
        })

        return builder
      }),
      rpc: vi.fn(async () => ({ error: null })),
      auth: { getUser: vi.fn() },
    }

    mocks.getSupabaseWithUser.mockResolvedValue({ supabase, user: { id: 'user-1' } })

    await expect(getTransactionsWithRelations()).resolves.toEqual({
      transactions: [
        {
          id: 1,
          date: '26.04.12',
          type: '입고',
          quantity: 3,
          warehouseId: 1,
          warehouse: '오금동',
          warehouseName: '오금동',
          sourceChannel: null,
          referenceType: null,
          referenceId: null,
          memo: null,
          createdAt: '2026-04-12T03:00:00.000Z',
          modelName: 'LP01',
          sizeName: 'S',
          colorName: '네이비',
          colorRgb: '#0f172a',
          canRevert: true,
          revertDisabledReason: null,
          revertSummary: '같은 수량의 출고 보정 이력이 추가됩니다.',
        },
      ],
      models: [{ id: 1, name: 'LP01' }],
      warehouses: [{ id: 1, name: '오금동' }],
    })
  })

  it('marks only the latest manual history rows as revertable and explains blocked reasons', async () => {
    const supabase = createSupabaseMock({
      transactions: {
        data: [
          {
            id: 31,
            date: '2026-04-15',
            model_id: 1,
            size_id: 10,
            color_id: 20,
            type: 'ADJUSTMENT',
            quantity: 4,
            warehouse_id: 1,
            source_channel: 'manual',
            reference_type: null,
            reference_id: null,
            memo: null,
            created_at: '2026-04-15T09:00:00.000Z',
          },
          {
            id: 30,
            date: '2026-04-14',
            model_id: 1,
            size_id: 10,
            color_id: 20,
            type: 'INBOUND',
            quantity: 2,
            warehouse_id: 1,
            source_channel: 'manual',
            reference_type: null,
            reference_id: null,
            memo: null,
            created_at: '2026-04-14T09:00:00.000Z',
          },
          {
            id: 21,
            date: '2026-04-13',
            model_id: 2,
            size_id: 11,
            color_id: 21,
            type: 'INBOUND',
            quantity: 5,
            warehouse_id: 1,
            source_channel: 'csv',
            reference_type: null,
            reference_id: null,
            memo: null,
            created_at: '2026-04-13T09:00:00.000Z',
          },
          {
            id: 11,
            date: '2026-04-12',
            model_id: 3,
            size_id: 12,
            color_id: 22,
            type: 'OUTBOUND',
            quantity: 1,
            warehouse_id: 2,
            source_channel: null,
            reference_type: 'shipment',
            reference_id: 99,
            memo: null,
            created_at: '2026-04-12T09:00:00.000Z',
          },
        ],
        error: null,
      },
      models: {
        data: [
          { id: 1, name: 'LP01' },
          { id: 2, name: 'LP02' },
          { id: 3, name: 'LP03' },
        ],
        error: null,
      },
      sizes: {
        data: [
          { id: 10, name: 'S' },
          { id: 11, name: 'M' },
          { id: 12, name: 'L' },
        ],
        error: null,
      },
      colors: {
        data: [
          { id: 20, name: '네이비', rgb_code: '#0f172a' },
          { id: 21, name: '블랙', rgb_code: '#111111' },
          { id: 22, name: '화이트', rgb_code: '#ffffff' },
        ],
        error: null,
      },
      warehouses: {
        data: [
          { id: 1, name: '오금동' },
          { id: 2, name: '대자동' },
        ],
        error: null,
      },
    })

    mocks.getSupabaseWithUser.mockResolvedValue({ supabase, user: { id: 'user-1' } })

    const result = await getTransactionsWithRelations()

    expect(result.transactions.map((item) => ({
      id: item.id,
      canRevert: item.canRevert,
      revertDisabledReason: item.revertDisabledReason,
      revertSummary: item.revertSummary,
    }))).toEqual([
      {
        id: 31,
        canRevert: true,
        revertDisabledReason: null,
        revertSummary: '직전 재고값으로 재고조정 이력이 추가됩니다.',
      },
      {
        id: 30,
        canRevert: false,
        revertDisabledReason: '후속 이력 있음',
        revertSummary: null,
      },
      {
        id: 21,
        canRevert: false,
        revertDisabledReason: 'CSV 반영',
        revertSummary: null,
      },
      {
        id: 11,
        canRevert: false,
        revertDisabledReason: '이미 시스템 참조가 있는 행',
        revertSummary: null,
      },
    ])
  })

  it('returns the current stock quantity for a warehouse id', async () => {
    const inventoryQuery = createQuery({
      data: { quantity: 7 },
      error: null,
    })
    const supabase = {
      from: vi.fn(() => inventoryQuery),
      rpc: vi.fn(),
      auth: { getUser: vi.fn() },
    }

    mocks.getSupabaseWithUser.mockResolvedValue({ supabase, user: { id: 'user-1' } })

    await expect(getCurrentStockRow(1, 10, 20, 1)).resolves.toBe(7)
  })

  it('aggregates factory cards and staging arrivals without touching inventory', async () => {
    const supabase = createSupabaseMock({
      factories: {
        data: [
          {
            id: 1,
            name: '광주 협력사',
            contact_name: '홍길동',
            phone: '010-1111-2222',
            email: 'factory@example.com',
            notes: '메인 협력 공장',
            is_active: true,
            created_at: '2026-04-19T00:00:00.000Z',
            updated_at: '2026-04-19T00:00:00.000Z',
          },
        ],
        error: null,
      },
      factory_arrivals: {
        data: [
          {
            id: 10,
            factory_id: 1,
            reference_code: null,
            expected_date: '2026-04-21',
            status: '예정',
            source_channel: 'manual',
            memo: '1차 납품',
            created_at: '2026-04-19T00:00:00.000Z',
            updated_at: '2026-04-19T00:00:00.000Z',
          },
        ],
        error: null,
      },
      factory_arrival_items: {
        data: [
          {
            id: 100,
            factory_arrival_id: 10,
            model_id: 1,
            size_id: 10,
            color_id: 20,
            ordered_quantity: 12,
            received_quantity: 0,
            created_at: '2026-04-19T00:00:00.000Z',
            updated_at: '2026-04-19T00:00:00.000Z',
          },
        ],
        error: null,
      },
      inbound_import_source_rows: { data: [], error: null },
      factory_arrival_allocations: { data: [{ id: 501, factory_arrival_id: 10, factory_arrival_item_id: 100, warehouse_id: 7, allocated_quantity: 12, normally_received_quantity: 3, shortage_closed_quantity: 2, warehouse_name_snapshot: '오금동' }], error: null },
      factory_receipt_events: { data: [], error: null },
      factory_receipt_lines: { data: [], error: null },
      factory_arrival_shortage_closures: { data: [{ id: 601, factory_arrival_allocation_id: 501, quantity: 2, reason: '미발송', closed_at: '2026-04-21T00:00:00.000Z' }], error: null },
      factory_receipt_line_corrections: { data: [], error: null },
      models: { data: [{ id: 1, name: 'LP01' }], error: null },
      sizes: { data: [{ id: 10, name: 'S' }], error: null },
      colors: { data: [{ id: 20, name: '네이비', rgb_code: '#0f172a' }], error: null },
    })

    mocks.getSupabaseWithUser.mockResolvedValue({ supabase, user: { id: 'user-1' } })

    await expect(getFactoriesData()).resolves.toEqual({
      schemaState: { status: 'ready', message: null },
      factories: [
        {
          id: 1,
          name: '광주 협력사',
          contactName: '홍길동',
          phone: '010-1111-2222',
          email: 'factory@example.com',
          notes: '메인 협력 공장',
          isActive: true,
          createdAt: '2026-04-19T00:00:00.000Z',
          updatedAt: '2026-04-19T00:00:00.000Z',
          arrivalCount: 1,
          pendingQuantity: 12,
        },
      ],
      factorySourcingItems: {
        1: [
          {
            expectedDate: '2026-04-21',
            status: '예정',
            modelName: 'LP01',
            sizeName: 'S',
            colorName: '네이비',
            orderedQuantity: 12,
            receivedQuantity: 0,
            remainingQuantity: 12,
          },
        ],
      },
    })

    await expect(getFactoryArrivalsData()).resolves.toEqual({
      schemaState: { status: 'ready', message: null },
      arrivals: [
        {
          id: 10,
          factoryId: 1,
          factoryName: '광주 협력사',
          referenceCode: null,
          expectedDate: '2026-04-21',
          status: '예정',
          sourceChannel: 'manual',
          memo: '1차 납품',
          createdAt: '2026-04-19T00:00:00.000Z',
          updatedAt: '2026-04-19T00:00:00.000Z',
          totalOrderedQuantity: 12,
          totalReceivedQuantity: 0,
          remainingQuantity: 7,
          shortageClosures: [{ id: 601, allocationId: 501, quantity: 2, reason: '미발송', closedAt: '2026-04-21T00:00:00.000Z' }],
          receiptLines: [],
          items: [
            {
              id: 100,
              productVariantId: null,
              modelId: 1,
              modelName: 'LP01',
              sizeId: 10,
              sizeName: 'S',
              colorId: 20,
              colorName: '네이비',
              colorRgb: '#0f172a',
              orderedQuantity: 12,
              receivedQuantity: 0,
              remainingQuantity: 7,
              sourceRowNumber: null,
              externalSku: null,
              allocations: [{ id: 501, warehouseId: 7, warehouseName: '오금동', allocatedQuantity: 12, normallyReceivedQuantity: 3, shortageClosedQuantity: 2, remainingQuantity: 7 }],
            },
          ],
        },
      ],
    })
  })

  it('returns empty sourcing data when factory tables are not deployed yet', async () => {
    const missingTableError = { message: "relation 'public.factory_arrivals' does not exist" }
    const supabase = createSupabaseMock({
      factories: { data: null, error: missingTableError },
      factory_arrivals: { data: null, error: missingTableError },
      factory_arrival_items: { data: null, error: missingTableError },
      inbound_import_source_rows: { data: null, error: missingTableError },
      factory_arrival_allocations: { data: null, error: missingTableError },
      factory_receipt_events: { data: null, error: missingTableError },
      factory_receipt_lines: { data: null, error: missingTableError },
      factory_arrival_shortage_closures: { data: null, error: missingTableError },
      factory_receipt_line_corrections: { data: null, error: missingTableError },
      models: { data: [{ id: 1, name: 'LP01' }], error: null },
      sizes: { data: [{ id: 10, name: 'S' }], error: null },
      colors: { data: [{ id: 20, name: '네이비', rgb_code: '#0f172a' }], error: null },
    })

    mocks.getSupabaseWithUser.mockResolvedValue({ supabase, user: { id: 'user-1' } })

    await expect(getFactoriesData()).resolves.toEqual({
      schemaState: { status: 'missing', message: SOURCING_SCHEMA_MISSING_MESSAGE },
      factories: [],
      factorySourcingItems: {},
    })
    await expect(getFactoryArrivalsData()).resolves.toEqual({
      schemaState: { status: 'missing', message: SOURCING_SCHEMA_MISSING_MESSAGE },
      arrivals: [],
    })
  })

  it('maps bulk transaction payloads into Supabase RPC enums', async () => {
    const rpc = vi.fn(async () => ({ error: null }))
    const supabase = { from: vi.fn(), rpc, auth: { getUser: vi.fn() } }
    mocks.getSupabaseWithUser.mockResolvedValue({ supabase, user: { id: 'user-1' } })

    await runBulkTransaction([
      {
        date: '2026-04-12',
        modelId: 1,
        sizeId: 10,
        colorId: 20,
        type: '입고',
        quantity: 3,
        warehouseId: 1,
      },
    ])

    expect(rpc).toHaveBeenCalledWith('bulk_apply_inventory_transactions', {
      p_items: [
        {
          date: '2026-04-12',
          model_id: 1,
          size_id: 10,
          color_id: 20,
          type: 'INBOUND',
          quantity: 3,
          warehouse_id: 1,
        },
      ],
    })
  })

  it('delegates inventory adjustments to the stored procedure', async () => {
    const rpc = vi.fn(async () => ({ error: null }))
    const supabase = { from: vi.fn(), rpc, auth: { getUser: vi.fn() } }
    mocks.getSupabaseWithUser.mockResolvedValue({ supabase, user: { id: 'user-1' } })

    await runInventoryAdjustment(99, 12)

    expect(rpc).toHaveBeenCalledWith('apply_inventory_adjustment', {
      p_inventory_id: 99,
      p_new_quantity: 12,
    })
  })

  it('sends reasoned quick inbound with absolute inventory sync targets through one RPC', async () => {
    const rpc = vi.fn(async () => ({ error: null }))
    const supabase = { from: vi.fn(), rpc, auth: { getUser: vi.fn() } }
    mocks.getSupabaseWithUser.mockResolvedValue({ supabase, user: { id: 'user-1' } })

    await runManualInventoryOperations([
      {
        kind: 'inbound', date: '2026-07-18', modelId: 3, sizeId: 12, colorId: 22, warehouseId: 2, quantity: 5, reason: '검수 입고',
      },
      {
        kind: 'manual-outbound', date: '2026-07-18', modelId: 1, sizeId: 10, colorId: 20, warehouseId: 1, quantity: 3, reason: '파손 폐기',
      },
      {
        kind: 'count-adjustment', date: '2026-07-18', modelId: 2, sizeId: 11, colorId: 21, warehouseId: 1, quantity: 0, reason: '월말 실사',
      },
    ])

    expect(rpc).toHaveBeenCalledWith('apply_manual_inventory_operations', {
      p_items: [
        { kind: 'inbound', date: '2026-07-18', model_id: 3, size_id: 12, color_id: 22, warehouse_id: 2, quantity: 5, reason: '검수 입고' },
        { kind: 'manual-outbound', date: '2026-07-18', model_id: 1, size_id: 10, color_id: 20, warehouse_id: 1, quantity: 3, reason: '파손 폐기' },
        { kind: 'count-adjustment', date: '2026-07-18', model_id: 2, size_id: 11, color_id: 21, warehouse_id: 1, quantity: 0, reason: '월말 실사' },
      ],
    })
  })

  it('sends a warehouse transfer as one RPC with both warehouse contexts and no inventory delta payload', async () => {
    const rpc = vi.fn(async () => ({ error: null }))
    const supabase = { from: vi.fn(), rpc, auth: { getUser: vi.fn() } }
    mocks.getSupabaseWithUser.mockResolvedValue({ supabase, user: { id: 'user-1' } })

    await runWarehouseTransfer({
      date: '2026-07-18', modelId: 3, sizeId: 12, colorId: 22,
      fromWarehouseId: 1, toWarehouseId: 2, quantity: 5, reason: '창고 재배치',
    })

    expect(rpc).toHaveBeenCalledWith('transfer_inventory_between_warehouses', {
      p_transfer: {
        date: '2026-07-18', model_id: 3, size_id: 12, color_id: 22,
        from_warehouse_id: 1, to_warehouse_id: 2, quantity: 5, reason: '창고 재배치',
      },
    })
  })

  it('delegates transaction revert requests to the stored procedure', async () => {
    const rpc = vi.fn(async () => ({ error: null }))
    const supabase = { from: vi.fn(), rpc, auth: { getUser: vi.fn() } }
    mocks.getSupabaseWithUser.mockResolvedValue({ supabase, user: { id: 'user-1' } })

    await runRevertTransaction(88, '잘못 입력')

    expect(rpc).toHaveBeenCalledWith('revert_inventory_transaction', {
      p_transaction_id: 88,
      p_memo: '잘못 입력',
    })
  })

  it('derives analytics summaries from catalog totals', async () => {
    const supabase = createSupabaseMock({
      models: { data: [{ id: 1, name: 'LP01', created_at: '2026-04-12T00:00:00.000Z' }], error: null },
      sizes: { data: [{ id: 10, name: 'S', sort_order: 1, model_id: 1 }], error: null },
      colors: {
        data: [
          { id: 20, name: '네이비', rgb_code: '#0f172a', text_white: true, sort_order: 1, model_id: 1 },
        ],
        error: null,
      },
      inventory: {
        data: [
          { id: 101, model_id: 1, size_id: 10, color_id: 20, warehouse_id: 1, quantity: 2 },
          { id: 102, model_id: 1, size_id: 10, color_id: 20, warehouse_id: 2, quantity: 3 },
        ],
        error: null,
      },
      warehouses: {
        data: [
          { id: 1, name: '오금동' },
          { id: 2, name: '대자동' },
        ],
        error: null,
      },
    })
    mocks.getSupabaseWithUser.mockResolvedValue({ supabase, user: { id: 'user-1' } })

    await expect(getAnalyticsData()).resolves.toEqual({
      models: [{ id: 1, name: 'LP01' }],
      inventorySummary: [{ modelName: 'LP01', total: 5 }],
      catalog: [
        {
          id: 1,
          name: 'LP01',
          createdAt: '2026-04-12T00:00:00.000Z',
          sizes: [{ id: 10, name: 'S', sortOrder: 1, modelId: 1 }],
          colors: [
            { id: 20, name: '네이비', rgbCode: '#0f172a', textWhite: true, sortOrder: 1, modelId: 1 },
          ],
          inventory: [
            { id: 101, modelId: 1, sizeId: 10, colorId: 20, warehouseId: 1, warehouseName: '오금동', quantity: 2 },
            { id: 102, modelId: 1, sizeId: 10, colorId: 20, warehouseId: 2, warehouseName: '대자동', quantity: 3 },
          ],
        },
      ],
      warehouses: [
        { id: 1, name: '오금동' },
        { id: 2, name: '대자동' },
      ],
    })
  })

  it('looks up a model with its sizes and colors', async () => {
    const supabase = createSupabaseMock({
      models: { data: [{ id: 1, name: 'LP01', created_at: '2026-04-12T00:00:00.000Z' }], error: null },
      sizes: { data: [{ id: 10, name: 'S', sort_order: 1, model_id: 1 }], error: null },
      colors: { data: [{ id: 20, name: '네이비', rgb_code: '#0f172a', text_white: true, sort_order: 1, model_id: 1 }], error: null },
      inventory: { data: [], error: null },
      warehouses: {
        data: [
          { id: 1, name: '오금동' },
        ],
        error: null,
      },
    })
    mocks.getSupabaseWithUser.mockResolvedValue({ supabase, user: { id: 'user-1' } })

    await expect(getModelLookups(1)).resolves.toEqual({
      sizes: [{ id: 10, name: 'S', sortOrder: 1, modelId: 1 }],
      colors: [
        { id: 20, name: '네이비', rgbCode: '#0f172a', textWhite: true, sortOrder: 1, modelId: 1 },
      ],
    })
  })

  it('returns raw transaction rows without labels', async () => {
    const supabase = createSupabaseMock({
      transactions: {
        data: [
          {
            date: '2026-04-12T00:00:00.000Z',
            type: 'INBOUND',
            quantity: 3,
            model_id: 1,
          },
        ],
        error: null,
      },
    })
    mocks.getSupabaseWithUser.mockResolvedValue({ supabase, user: { id: 'user-1' } })

    await expect(getRawTransactions()).resolves.toEqual([
      {
        date: '2026-04-12T00:00:00.000Z',
        type: 'INBOUND',
        quantity: 3,
        model_id: 1,
      },
    ])
  })
})

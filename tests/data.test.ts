import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  getSupabaseWithUser: vi.fn(),
}))

vi.mock('../src/lib/db', () => ({
  getSupabaseWithUser: mocks.getSupabaseWithUser,
}))

import {
  getAnalyticsData,
  getCatalogData,
  getCurrentStockRow,
  getModelLookups,
  getRawTransactions,
  getTransactionsWithRelations,
  runBulkTransaction,
  runInventoryAdjustment,
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
  it('maps catalog rows into the model, size, color, and inventory shape used by the UI', async () => {
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
          { id: 101, model_id: 1, size_id: 10, color_id: 20, warehouse: 'OGEUMDONG', quantity: 2 },
          { id: 102, model_id: 1, size_id: 10, color_id: 20, warehouse: 'DAEJADONG', quantity: 3 },
          { id: 103, model_id: 1, size_id: 11, color_id: 20, warehouse: 'OGEUMDONG', quantity: 4 },
          { id: 104, model_id: 1, size_id: 11, color_id: 20, warehouse: 'DAEJADONG', quantity: 5 },
        ],
        error: null,
      },
    })

    mocks.getSupabaseWithUser.mockResolvedValue({ supabase, user: { id: 'user-1' } })

    await expect(getCatalogData()).resolves.toEqual([
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
          { id: 101, modelId: 1, sizeId: 10, colorId: 20, warehouse: '오금동', quantity: 2 },
          { id: 102, modelId: 1, sizeId: 10, colorId: 20, warehouse: '대자동', quantity: 3 },
          { id: 103, modelId: 1, sizeId: 11, colorId: 20, warehouse: '오금동', quantity: 4 },
          { id: 104, modelId: 1, sizeId: 11, colorId: 20, warehouse: '대자동', quantity: 5 },
        ],
      },
    ])
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
            warehouse: 'OGEUMDONG',
            created_at: '2026-04-12T03:00:00.000Z',
          },
        ],
        error: null,
      },
      models: { data: [{ id: 1, name: 'LP01' }], error: null },
      sizes: { data: [{ id: 10, name: 'S' }], error: null },
      colors: { data: [{ id: 20, name: '네이비', rgb_code: '#0f172a' }], error: null },
    })

    mocks.getSupabaseWithUser.mockResolvedValue({ supabase, user: { id: 'user-1' } })

    await expect(getTransactionsWithRelations()).resolves.toEqual({
      transactions: [
        {
          id: 1,
          date: '26.04.12',
          type: '입고',
          quantity: 3,
          warehouse: '오금동',
          createdAt: '2026-04-12T03:00:00.000Z',
          modelName: 'LP01',
          sizeName: 'S',
          colorName: '네이비',
          colorRgb: '#0f172a',
        },
      ],
      models: [{ id: 1, name: 'LP01' }],
    })
  })

  it('returns the current stock quantity for a canonical warehouse value', async () => {
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

    await expect(getCurrentStockRow(1, 10, 20, '오금동')).resolves.toBe(7)
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
        warehouse: '오금동',
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
          warehouse: 'OGEUMDONG',
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

  it('derives analytics summaries from catalog totals', async () => {
    const supabase = createSupabaseMock({
      models: { data: [{ id: 1, name: 'LP01', created_at: '2026-04-12T00:00:00.000Z' }], error: null },
      sizes: { data: [{ id: 10, name: 'S', sort_order: 1, model_id: 1 }], error: null },
      colors: { data: [{ id: 20, name: '네이비', rgb_code: '#0f172a', text_white: true, sort_order: 1, model_id: 1 }], error: null },
      inventory: {
        data: [
          { id: 101, model_id: 1, size_id: 10, color_id: 20, warehouse: 'OGEUMDONG', quantity: 2 },
          { id: 102, model_id: 1, size_id: 10, color_id: 20, warehouse: 'DAEJADONG', quantity: 3 },
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
            { id: 101, modelId: 1, sizeId: 10, colorId: 20, warehouse: '오금동', quantity: 2 },
            { id: 102, modelId: 1, sizeId: 10, colorId: 20, warehouse: '대자동', quantity: 3 },
          ],
        },
      ],
    })
  })

  it('looks up a model with its sizes and colors', async () => {
    const supabase = createSupabaseMock({
      models: { data: [{ id: 1, name: 'LP01', created_at: '2026-04-12T00:00:00.000Z' }], error: null },
      sizes: { data: [{ id: 10, name: 'S', sort_order: 1, model_id: 1 }], error: null },
      colors: { data: [{ id: 20, name: '네이비', rgb_code: '#0f172a', text_white: true, sort_order: 1, model_id: 1 }], error: null },
      inventory: { data: [], error: null },
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
            warehouse: 'OGEUMDONG',
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
        warehouse: 'OGEUMDONG',
      },
    ])
  })
})

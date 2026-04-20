import { beforeEach, describe, expect, it, vi } from 'vitest'
import { SOURCING_SCHEMA_MISSING_MESSAGE } from '@/lib/data'

const mocks = vi.hoisted(() => ({
  getSupabaseWithUser: vi.fn(),
  runReceiveFactoryArrival: vi.fn(),
  revalidatePath: vi.fn(),
}))

vi.mock('@/lib/db', () => ({
  getSupabaseWithUser: mocks.getSupabaseWithUser,
}))

vi.mock('@/lib/data', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/data')>()
  return {
    ...actual,
    runReceiveFactoryArrival: mocks.runReceiveFactoryArrival,
  }
})

vi.mock('next/cache', () => ({
  revalidatePath: mocks.revalidatePath,
}))

import {
  createFactory,
  createFactoryArrivalBatch,
  receiveFactoryArrival,
  setFactoryActive,
} from '@/lib/actions'

beforeEach(() => {
  mocks.getSupabaseWithUser.mockReset()
  mocks.runReceiveFactoryArrival.mockReset()
  mocks.revalidatePath.mockReset()
})

describe('sourcing actions', () => {
  it('creates and toggles factories via Supabase', async () => {
    const insert = vi.fn(() => Promise.resolve({ error: null }))
    const update = vi.fn(() => ({ eq: vi.fn(() => Promise.resolve({ error: null })) }))
    const supabase = {
      from: vi.fn((table: string) => {
        if (table === 'factories') {
          return { insert, update }
        }
        throw new Error(`unexpected table ${table}`)
      }),
    }

    mocks.getSupabaseWithUser.mockResolvedValue({ supabase, user: { id: 'user-1' } })

    await expect(createFactory({ name: '광주 협력사', phone: '010-1111-2222' })).resolves.toEqual({ success: true })
    await expect(setFactoryActive(1, false)).resolves.toEqual({ success: true })

    expect(insert).toHaveBeenCalledWith({
      name: '광주 협력사',
      contact_name: null,
      phone: '010-1111-2222',
      email: null,
      notes: null,
    })
  })

  it('creates a staging arrival and its items', async () => {
    const arrivalInsert = vi.fn(() => ({
      select: vi.fn(() => ({
        single: vi.fn(() => Promise.resolve({ data: { id: 55 }, error: null })),
      })),
    }))
    const itemsInsert = vi.fn(() => Promise.resolve({ error: null }))

    const supabase = {
      from: vi.fn((table: string) => {
        if (table === 'factory_arrivals') {
          return { insert: arrivalInsert, delete: vi.fn(() => ({ eq: vi.fn() })) }
        }
        if (table === 'factory_arrival_items') {
          return { insert: itemsInsert }
        }
        throw new Error(`unexpected table ${table}`)
      }),
    }

    mocks.getSupabaseWithUser.mockResolvedValue({ supabase, user: { id: 'user-1' } })

    await expect(
      createFactoryArrivalBatch({
        factoryId: 1,
        expectedDate: '2026-04-21',
        memo: '1차 납품',
        sourceChannel: 'csv',
        items: [{ modelId: 1, sizeId: 10, colorId: 20, orderedQuantity: 12 }],
      }),
    ).resolves.toEqual({ success: true, count: 1 })

    expect(itemsInsert).toHaveBeenCalledWith([
      {
        factory_arrival_id: 55,
        model_id: 1,
        size_id: 10,
        color_id: 20,
        ordered_quantity: 12,
      },
    ])
  })

  it('receives a factory arrival through the RPC and revalidates inventory and sourcing paths', async () => {
    mocks.runReceiveFactoryArrival.mockResolvedValue(undefined)

    await expect(
      receiveFactoryArrival({
        arrivalId: 55,
        warehouseId: 2,
        items: [
          { arrivalItemId: 100, quantity: 4 },
          { arrivalItemId: 101, quantity: 2 },
        ],
      }),
    ).resolves.toEqual({ success: true })

    expect(mocks.runReceiveFactoryArrival).toHaveBeenCalledWith(55, 2, [
      { arrivalItemId: 100, quantity: 4 },
      { arrivalItemId: 101, quantity: 2 },
    ])
    expect(mocks.revalidatePath).toHaveBeenCalledWith('/')
    expect(mocks.revalidatePath).toHaveBeenCalledWith('/inventory')
    expect(mocks.revalidatePath).toHaveBeenCalledWith('/history')
    expect(mocks.revalidatePath).toHaveBeenCalledWith('/sourcing/arrivals')
    expect(mocks.revalidatePath).toHaveBeenCalledWith('/sourcing/factories')
  })

  it('normalizes missing-schema errors across sourcing actions', async () => {
    const missingSchemaError = { message: "relation 'public.factory_arrivals' does not exist" }
    const insert = vi.fn(() => Promise.resolve({ error: missingSchemaError }))
    const update = vi.fn(() => ({ eq: vi.fn(() => Promise.resolve({ error: missingSchemaError })) }))
    const arrivalInsert = vi.fn(() => ({
      select: vi.fn(() => ({
        single: vi.fn(() => Promise.resolve({ data: null, error: missingSchemaError })),
      })),
    }))

    const supabase = {
      from: vi.fn((table: string) => {
        if (table === 'factories') return { insert, update }
        if (table === 'factory_arrivals') return { insert: arrivalInsert, delete: vi.fn(() => ({ eq: vi.fn() })) }
        if (table === 'factory_arrival_items') return { insert: vi.fn(() => Promise.resolve({ error: missingSchemaError })) }
        throw new Error(`unexpected table ${table}`)
      }),
    }

    mocks.getSupabaseWithUser.mockResolvedValue({ supabase, user: { id: 'user-1' } })
    mocks.runReceiveFactoryArrival.mockRejectedValue(new Error("Could not find the table 'factory_arrivals' in the schema cache"))

    await expect(createFactory({ name: '광주 협력사' })).rejects.toThrow(SOURCING_SCHEMA_MISSING_MESSAGE)
    await expect(setFactoryActive(1, false)).rejects.toThrow(SOURCING_SCHEMA_MISSING_MESSAGE)
    await expect(
      createFactoryArrivalBatch({
        factoryId: 1,
        expectedDate: '2026-04-21',
        sourceChannel: 'manual',
        items: [{ modelId: 1, sizeId: 10, colorId: 20, orderedQuantity: 4 }],
      }),
    ).rejects.toThrow(SOURCING_SCHEMA_MISSING_MESSAGE)
    await expect(
      receiveFactoryArrival({
        arrivalId: 55,
        warehouseId: 2,
        items: [{ arrivalItemId: 100, quantity: 4 }],
      }),
    ).rejects.toThrow(SOURCING_SCHEMA_MISSING_MESSAGE)
  })
})

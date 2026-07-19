import { beforeEach, describe, expect, it, vi } from 'vitest'
import { SOURCING_SCHEMA_MISSING_MESSAGE } from '@/lib/data'

const mocks = vi.hoisted(() => ({
  getSupabaseWithUser: vi.fn(),
  runReceiveFactoryArrival: vi.fn(),
  runFactoryArrivalOperation: vi.fn(),
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
    runFactoryArrivalOperation: mocks.runFactoryArrivalOperation,
  }
})

vi.mock('next/cache', () => ({
  revalidatePath: mocks.revalidatePath,
}))

import {
  createFactory,
  createFactoryArrivalBatch,
  receiveFactoryArrival,
  receiveFactoryArrivalRequest,
  replaceFactoryArrivalAllocations,
  moveFactoryArrivalRemaindersToWarehouse,
  closeFactoryArrivalShortage,
  recordFactoryArrivalFollowUp,
  reverseFactoryReceiptLine,
  setFactoryActive,
} from '@/lib/actions'

beforeEach(() => {
  mocks.getSupabaseWithUser.mockReset()
  mocks.runReceiveFactoryArrival.mockReset()
  mocks.runFactoryArrivalOperation.mockReset()
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

  it('creates a canonical arrival, ProductVariant items, and allocations through one RPC', async () => {
    const rpc = vi.fn(() => Promise.resolve({ error: null }))
    const supabase = {
      rpc,
    }

    mocks.getSupabaseWithUser.mockResolvedValue({ supabase, user: { id: 'user-1' } })

    await expect(
      createFactoryArrivalBatch({
        factoryId: 1,
        expectedDate: '2026-04-21',
        memo: '1차 납품',
        sourceChannel: 'csv',
        warehouseId: 2,
        items: [{ modelId: 1, sizeId: 10, colorId: 20, orderedQuantity: 12 }],
      }),
    ).resolves.toEqual({ success: true, count: 1 })

    expect(rpc).toHaveBeenCalledWith('create_factory_arrival_with_allocations', {
      p_factory_id: 1,
      p_expected_date: '2026-04-21',
      p_memo: '1차 납품',
      p_source_channel: 'csv',
      p_warehouse_id: 2,
      p_items: [{ model_id: 1, size_id: 10, color_id: 20, ordered_quantity: 12 }],
    })
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

  it('returns a serializable allocation-scoped receipt error for the exact failing line', async () => {
    mocks.runFactoryArrivalOperation.mockRejectedValue(new Error('operation_error:allocation:302:두 번째 입고 행의 수량이 올바르지 않습니다.'))

    await expect(receiveFactoryArrivalRequest({
      arrivalId: 55,
      receiptRequestId: 'request-1',
      receiptBusinessDate: '2026-07-19',
      lines: [
        { allocationId: 301, quantity: 2 },
        { allocationId: 302, quantity: 7 },
      ],
    })).resolves.toEqual({
      success: false,
      error: { key: 'allocation-302', message: '두 번째 입고 행의 수량이 올바르지 않습니다.' },
    })

    expect(mocks.revalidatePath).not.toHaveBeenCalled()
  })

  it('serializes scoped DB failures for every canonical arrival operation', async () => {
    const cases = [
      {
        message: 'operation_error:item:201:배정 계획을 확인해주세요.',
        expected: { key: 'item-201', message: '배정 계획을 확인해주세요.' },
        run: () => replaceFactoryArrivalAllocations({ arrivalId: 55, itemId: 201, reason: '변경', allocations: [{ warehouseId: 2, quantity: 5 }] }),
      },
      {
        message: 'operation_error:arrival:55:이동 계획을 확인해주세요.',
        expected: { key: 'arrival-55', message: '이동 계획을 확인해주세요.' },
        run: () => moveFactoryArrivalRemaindersToWarehouse({ arrivalId: 55, warehouseId: 2, reason: '이동' }),
      },
      {
        message: 'operation_error:allocation:301:부족 수량을 확인해주세요.',
        expected: { key: 'allocation-301', message: '부족 수량을 확인해주세요.' },
        run: () => closeFactoryArrivalShortage({ allocationId: 301, quantity: 1, reason: '미발송' }),
      },
      {
        message: 'operation_error:closure:401:후속 수량을 확인해주세요.',
        expected: { key: 'closure-401', message: '후속 수량을 확인해주세요.' },
        run: () => recordFactoryArrivalFollowUp({ closureId: 401, warehouseId: 2, quantity: 1, reason: '후속', receiptRequestId: 'request-2', receiptBusinessDate: '2026-07-19' }),
      },
      {
        message: 'operation_error:receipt-line:501:정정 대상을 확인해주세요.',
        expected: { key: 'receipt-line-501', message: '정정 대상을 확인해주세요.' },
        run: () => reverseFactoryReceiptLine({ receiptLineId: 501, correctionRequestId: 'correction-1', reason: '정정' }),
      },
    ]

    for (const item of cases) {
      mocks.runFactoryArrivalOperation.mockRejectedValueOnce(new Error(item.message))
      await expect(item.run()).resolves.toEqual({ success: false, error: item.expected })
    }
    expect(mocks.revalidatePath).not.toHaveBeenCalled()
  })

  it('serializes validation failures for every canonical arrival operation', async () => {
    const cases = [
      {
        expected: { key: 'item-201', message: '배정 변경 사유를 입력해주세요.' },
        run: () => replaceFactoryArrivalAllocations({ arrivalId: 55, itemId: 201, reason: '', allocations: [{ warehouseId: 2, quantity: 5 }] }),
      },
      {
        expected: { key: 'allocation-301', message: '입고 업무일을 입력해주세요.' },
        run: () => receiveFactoryArrivalRequest({ arrivalId: 55, receiptRequestId: 'request-1', receiptBusinessDate: '', lines: [{ allocationId: 301, quantity: 1 }] }),
      },
      {
        expected: { key: 'arrival-55', message: '기본 창고와 배정 변경 사유를 입력해주세요.' },
        run: () => moveFactoryArrivalRemaindersToWarehouse({ arrivalId: 55, warehouseId: 0, reason: '' }),
      },
      {
        expected: { key: 'allocation-301', message: '부족 수량과 사유를 입력해주세요.' },
        run: () => closeFactoryArrivalShortage({ allocationId: 301, quantity: 0, reason: '' }),
      },
      {
        expected: { key: 'closure-401', message: '후속 입고 정보를 모두 입력해주세요.' },
        run: () => recordFactoryArrivalFollowUp({ closureId: 401, warehouseId: 2, quantity: 1, reason: '후속', receiptRequestId: 'request-2', receiptBusinessDate: '' }),
      },
      {
        expected: { key: 'receipt-line-501', message: '정정 요청 ID와 사유를 입력해주세요.' },
        run: () => reverseFactoryReceiptLine({ receiptLineId: 501, correctionRequestId: '', reason: '' }),
      },
    ]

    for (const item of cases) {
      await expect(item.run()).resolves.toEqual({ success: false, error: item.expected })
    }
    expect(mocks.runFactoryArrivalOperation).not.toHaveBeenCalled()
    expect(mocks.revalidatePath).not.toHaveBeenCalled()
  })

  it('normalizes missing-schema errors across sourcing actions', async () => {
    const missingSchemaError = { message: "relation 'public.factory_arrivals' does not exist" }
    const insert = vi.fn(() => Promise.resolve({ error: missingSchemaError }))
    const update = vi.fn(() => ({ eq: vi.fn(() => Promise.resolve({ error: missingSchemaError })) }))
    const rpc = vi.fn(() => Promise.resolve({ error: missingSchemaError }))

    const supabase = {
      from: vi.fn((table: string) => {
        if (table === 'factories') return { insert, update }
        throw new Error(`unexpected table ${table}`)
      }),
      rpc,
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
        warehouseId: 2,
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

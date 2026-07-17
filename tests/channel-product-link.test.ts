import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({ getSupabaseWithUser: vi.fn(), revalidatePath: vi.fn() }))

vi.mock('next/cache', () => ({ revalidatePath: mocks.revalidatePath }))
vi.mock('@/lib/db', () => ({ getSupabaseWithUser: mocks.getSupabaseWithUser }))

import {
  createChannelProductMapping,
  unlinkChannelProductMapping,
  updateChannelProductMapping,
} from '@/lib/actions/channel-product-link'

function query(result: { data?: unknown; error?: unknown } = {}) {
  const chain = {
    select: vi.fn(), insert: vi.fn(), update: vi.fn(), delete: vi.fn(), eq: vi.fn(), maybeSingle: vi.fn(),
  }
  chain.select.mockReturnValue(chain)
  chain.insert.mockReturnValue(chain)
  chain.update.mockReturnValue(chain)
  chain.delete.mockReturnValue(chain)
  chain.eq.mockReturnValue(chain)
  chain.maybeSingle.mockResolvedValue({ data: result.data ?? null, error: result.error ?? null })
  return chain
}

function createSupabaseMock(options: { variant?: unknown; duplicate?: unknown; ref?: unknown; writeError?: unknown } = {}) {
  const variant = query({ data: options.variant ?? { id: 101 } })
  const duplicate = query({ data: options.duplicate ?? null })
  const ref = query({ data: options.ref ?? { id: 501 } })
  const writeResult = { error: options.writeError ?? null }
  const writeChain = { eq: vi.fn() }
  writeChain.eq.mockReturnValue(writeChain)
  const writes = {
    insert: vi.fn().mockResolvedValue({ data: { id: 501 }, ...writeResult }),
    update: vi.fn().mockReturnValue(writeChain),
    delete: vi.fn().mockReturnValue(writeChain),
  }
  writeChain.eq.mockReturnValueOnce(writeChain).mockResolvedValueOnce(writeResult)
  const refs = { select: vi.fn(), insert: writes.insert, update: writes.update, delete: writes.delete, eq: vi.fn() }
  refs.select.mockReturnValue(duplicate)
  return {
    from: vi.fn((table: string) => table === 'product_variants' ? variant : refs),
    variant, duplicate, ref, writes, refs,
  }
}

const input = {
  variantId: 101,
  channel: 'naver' as const,
  sellerSku: '  SKU-101 ',
  externalProductId: ' product-1 ',
  externalVariantId: ' option-1 ',
}

beforeEach(() => Object.values(mocks).forEach((mock) => mock.mockReset()))

describe('manual channel product mappings', () => {
  it('creates an explicit mapping after checking variant ownership and stores unverified status', async () => {
    const supabase = createSupabaseMock()
    mocks.getSupabaseWithUser.mockResolvedValue({ supabase, user: { id: 'user-1' } })

    await expect(createChannelProductMapping(input)).resolves.toEqual({ success: true, verificationStatus: 'unverified' })

    expect(supabase.variant.eq).toHaveBeenCalledWith('user_id', 'user-1')
    expect(supabase.writes.insert).toHaveBeenCalledWith(expect.objectContaining({
      user_id: 'user-1', variant_id: 101, channel: 'naver', seller_sku: 'SKU-101',
      external_product_id: 'product-1', external_variant_id: 'option-1', verification_status: 'unverified',
    }))
    expect(mocks.revalidatePath).toHaveBeenCalledWith('/products')
  })

  it('rejects another mapping with the same channel and external identifiers', async () => {
    const supabase = createSupabaseMock({ duplicate: { id: 77 } })
    mocks.getSupabaseWithUser.mockResolvedValue({ supabase, user: { id: 'user-1' } })

    await expect(createChannelProductMapping(input)).rejects.toThrow('이미 연결된 채널 판매 옵션입니다.')
    expect(supabase.writes.insert).not.toHaveBeenCalled()
  })

  it('updates only an owned ref and retains the explicit unverified result', async () => {
    const supabase = createSupabaseMock({ duplicate: null, ref: { id: 501 } })
    supabase.refs.select.mockReturnValueOnce(supabase.duplicate).mockReturnValueOnce(supabase.ref)
    mocks.getSupabaseWithUser.mockResolvedValue({ supabase, user: { id: 'user-1' } })

    await expect(updateChannelProductMapping(501, { ...input, channel: 'coupang' })).resolves.toEqual({ success: true, verificationStatus: 'unverified' })
    expect(supabase.writes.update).toHaveBeenCalledWith(expect.objectContaining({ channel: 'coupang', verification_status: 'unverified' }))
    expect(supabase.ref.eq).toHaveBeenCalledWith('user_id', 'user-1')
  })

  it('unlinks only the owned ref without changing variants or inventory', async () => {
    const supabase = createSupabaseMock({ ref: { id: 501 } })
    supabase.refs.select.mockReturnValue(supabase.ref)
    mocks.getSupabaseWithUser.mockResolvedValue({ supabase, user: { id: 'user-1' } })

    await expect(unlinkChannelProductMapping(501)).resolves.toEqual({ success: true })
    expect(supabase.writes.delete).toHaveBeenCalled()
    expect(supabase.from).not.toHaveBeenCalledWith('inventory')
    expect(supabase.from).toHaveBeenCalledWith('channel_product_refs')
  })
})

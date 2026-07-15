import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  fetchNaverProductSnapshots: vi.fn(),
  fetchCoupangProductSnapshots: vi.fn(),
  getRequiredShippingCredentials: vi.fn(),
  getSupabaseWithUser: vi.fn(),
}))

vi.mock('@/lib/api/naver', () => ({ fetchNaverProductSnapshots: mocks.fetchNaverProductSnapshots }))
vi.mock('@/lib/api/coupang', () => ({ fetchCoupangProductSnapshots: mocks.fetchCoupangProductSnapshots }))
vi.mock('@/lib/shipping-credentials', () => ({
  getRequiredShippingCredentials: mocks.getRequiredShippingCredentials,
}))
vi.mock('@/lib/db', () => ({ getSupabaseWithUser: mocks.getSupabaseWithUser }))

import { syncProducts } from '@/lib/actions/channel-product-sync'

const naverSnapshot = {
  channel: 'naver' as const,
  externalProductId: 'origin-1',
  externalVariantId: 'channel-1',
  sellerSku: 'SKU-1',
  productName: 'Do not match by name',
  optionName: null,
  listingStatus: 'active' as const,
  stockQuantity: 9,
  price: 10000,
  imageUrl: null,
  rawAttributes: { source: 'naver' },
}

function createSupabaseMock(
  variants: Array<{ id: number; seller_sku: string }>,
  existingRefs: Array<{ channel: 'naver' | 'coupang'; external_product_id: string; external_variant_id: string; variant_id: number | null }> = [],
) {
  const refs = {
    select: vi.fn(async () => ({ data: existingRefs, error: null })),
    upsert: vi.fn(async () => ({ error: null })),
  }
  const variantQuery = { select: vi.fn(async () => ({ data: variants, error: null })) }

  return {
    from: vi.fn((table: string) => {
      if (table === 'product_variants') return variantQuery
      if (table === 'channel_product_refs') return refs
      throw new Error(`Unexpected table: ${table}`)
    }),
    refs,
  }
}

beforeEach(() => {
  for (const mock of Object.values(mocks)) mock.mockReset()
})

describe('channel product sync', () => {
  it('preserves an existing manual variant mapping when the synced seller SKU matches another variant', async () => {
    const supabase = createSupabaseMock(
      [
        { id: 42, seller_sku: 'SKU-1' },
        { id: 99, seller_sku: 'MANUAL-SKU' },
      ],
      [{ channel: 'naver', external_product_id: 'origin-1', external_variant_id: 'channel-1', variant_id: 99 }],
    )
    mocks.getSupabaseWithUser.mockResolvedValue({ supabase, user: { id: 'user-1' } })
    mocks.getRequiredShippingCredentials.mockResolvedValue({ clientId: 'id', clientSecret: 'secret' })
    mocks.fetchNaverProductSnapshots.mockResolvedValue([naverSnapshot])

    await expect(syncProducts('naver')).resolves.toEqual({
      added: 0,
      updated: 1,
      mappingRequired: 0,
      failed: 0,
      providerFailures: [],
    })

    expect(supabase.refs.upsert).toHaveBeenCalledWith(
      [expect.objectContaining({ external_variant_id: 'channel-1', variant_id: 99 })],
      { onConflict: 'user_id,channel,external_product_id,external_variant_id' },
    )
  })

  it('links only an exactly-one SKU match and saves the channel snapshot without changing inventory', async () => {
    const supabase = createSupabaseMock([{ id: 42, seller_sku: 'SKU-1' }])
    mocks.getSupabaseWithUser.mockResolvedValue({ supabase, user: { id: 'user-1' } })
    mocks.getRequiredShippingCredentials.mockResolvedValue({ clientId: 'id', clientSecret: 'secret' })
    mocks.fetchNaverProductSnapshots.mockResolvedValue([naverSnapshot])

    await expect(syncProducts('naver')).resolves.toEqual({
      added: 1,
      updated: 0,
      mappingRequired: 0,
      failed: 0,
      providerFailures: [],
    })

    expect(supabase.refs.upsert).toHaveBeenCalledWith(
      [
        expect.objectContaining({
          user_id: 'user-1',
          channel: 'naver',
          seller_sku: 'SKU-1',
          variant_id: 42,
          channel_reported: 9,
          channel_attributes: expect.objectContaining({ stockQuantity: 9, price: 10000 }),
        }),
      ],
      { onConflict: 'user_id,channel,external_product_id,external_variant_id' },
    )
    expect(supabase.from).not.toHaveBeenCalledWith('inventory')
  })

  it('leaves absent or ambiguous seller SKUs unlinked and never uses a product name fallback', async () => {
    const supabase = createSupabaseMock([
      { id: 11, seller_sku: 'DUPLICATE' },
      { id: 12, seller_sku: 'DUPLICATE' },
      { id: 13, seller_sku: 'OTHER-SKU' },
    ])
    mocks.getSupabaseWithUser.mockResolvedValue({ supabase, user: { id: 'user-1' } })
    mocks.getRequiredShippingCredentials.mockResolvedValue({ clientId: 'id', clientSecret: 'secret' })
    mocks.fetchNaverProductSnapshots.mockResolvedValue([
      { ...naverSnapshot, externalVariantId: 'ambiguous', sellerSku: 'DUPLICATE' },
      { ...naverSnapshot, externalVariantId: 'missing', sellerSku: null, productName: 'OTHER-SKU' },
    ])

    await expect(syncProducts('naver')).resolves.toEqual({
      added: 2,
      updated: 0,
      mappingRequired: 2,
      failed: 0,
      providerFailures: [],
    })

    const payload = supabase.refs.upsert.mock.calls[0]?.[0]
    expect(payload).toEqual([
      expect.objectContaining({ external_variant_id: 'ambiguous', variant_id: null }),
      expect.objectContaining({ external_variant_id: 'missing', variant_id: null }),
    ])
  })

  it('assigns refs from both channels with the same seller SKU to the same variant', async () => {
    const supabase = createSupabaseMock([{ id: 42, seller_sku: 'SKU-1' }])
    mocks.getSupabaseWithUser.mockResolvedValue({ supabase, user: { id: 'user-1' } })
    mocks.getRequiredShippingCredentials.mockImplementation(async (provider: string) =>
      provider === 'naver'
        ? { clientId: 'id', clientSecret: 'secret' }
        : { accessKey: 'access', secretKey: 'secret', vendorId: 'vendor', defaultDeliveryCompanyCode: 'CJGLS' },
    )
    mocks.fetchNaverProductSnapshots.mockResolvedValue([naverSnapshot])
    mocks.fetchCoupangProductSnapshots.mockResolvedValue([
      { ...naverSnapshot, channel: 'coupang', externalProductId: 'seller-1', externalVariantId: 'item-1' },
    ])

    await expect(syncProducts()).resolves.toEqual({ added: 2, updated: 0, mappingRequired: 0, failed: 0, providerFailures: [] })

    const variantIds = supabase.refs.upsert.mock.calls.flatMap(([payload]) =>
      (payload as Array<{ variant_id: number | null }>).map((ref) => ref.variant_id),
    )
    expect(variantIds).toEqual([42, 42])
  })

  it('returns a safe provider-specific result when a provider sync fails', async () => {
    const supabase = createSupabaseMock([])
    mocks.getSupabaseWithUser.mockResolvedValue({ supabase, user: { id: 'user-1' } })
    mocks.getRequiredShippingCredentials.mockResolvedValue({
      accessKey: 'access-key-that-must-not-leak',
      secretKey: 'secret-key-that-must-not-leak',
      vendorId: 'vendor',
      defaultDeliveryCompanyCode: 'CJGLS',
    })
    mocks.fetchCoupangProductSnapshots.mockRejectedValue(
      new Error('쿠팡 상품 목록 조회 실패: 401 {"accessKey":"access-key-that-must-not-leak","detail":"raw response body"}'),
    )

    const result = await syncProducts('coupang')

    expect(result).toEqual(expect.objectContaining({
      added: 0,
      updated: 0,
      mappingRequired: 0,
      failed: 1,
      providerFailures: [{ channel: 'coupang', message: '쿠팡 인증 정보를 확인해 주세요.' }],
    }))
    expect(JSON.stringify(result)).not.toContain('access-key-that-must-not-leak')
    expect(JSON.stringify(result)).not.toContain('raw response body')
  })
})

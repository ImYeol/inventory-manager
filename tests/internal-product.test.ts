import { beforeEach, describe, expect, it, vi } from 'vitest'
import { isSellerSkuConvertible, toSellerSkuToken } from '@/lib/seller-sku'

const mocks = vi.hoisted(() => ({ getSupabaseWithUser: vi.fn(), revalidatePath: vi.fn() }))
vi.mock('next/cache', () => ({ revalidatePath: mocks.revalidatePath }))
vi.mock('@/lib/db', () => ({ getSupabaseWithUser: mocks.getSupabaseWithUser }))
import { createInternalProduct } from '@/lib/actions/internal-product'

function query(data: unknown, error: unknown = null) {
  const result = { data, error, insert: vi.fn(), update: vi.fn(), delete: vi.fn(), select: vi.fn(), single: vi.fn(), eq: vi.fn(), is: vi.fn() }
  result.insert.mockReturnValue(result); result.update.mockReturnValue(result); result.delete.mockReturnValue(result); result.select.mockReturnValue(result); result.single.mockResolvedValue({ data, error }); result.eq.mockReturnValue(result); result.is.mockResolvedValue({ error })
  return result
}

describe('createInternalProduct', () => {
  beforeEach(() => Object.values(mocks).forEach((mock) => mock.mockReset()))
  it('creates variants with unique seller SKUs without automatically linking channel refs', async () => {
    const models = query({ id: 1 }); const sizes = query([{ id: 11, name: 'S' }, { id: 12, name: 'M' }]); const colors = query([{ id: 21, name: '블랙' }]); const variants = query([{ id: 101, seller_sku: 'LP-S-블랙' }, { id: 102, seller_sku: 'LP-M-블랙' }]); const refs = query(null)
    const supabase = { from: vi.fn((table: string) => ({ models, sizes, colors, product_variants: variants, channel_product_refs: refs }[table])) }
    mocks.getSupabaseWithUser.mockResolvedValue({ supabase, user: { id: 'user-1' } })
    await expect(createInternalProduct({ name: '내부 상품', sizes: ['S', 'M'], colors: ['블랙'], skuPrefix: 'LP' })).resolves.toMatchObject({ variantCount: 2, sellerSkus: ['LP-S-블랙', 'LP-M-블랙'] })
    expect(refs.update).not.toHaveBeenCalled()
  })
  it('rejects combination explosions before writing', async () => {
    await expect(createInternalProduct({ name: '내부 상품', sizes: Array.from({ length: 11 }, (_, index) => `${index}`), colors: Array.from({ length: 10 }, (_, index) => `${index}`), skuPrefix: 'LP' })).rejects.toThrow('최대 100개')
    expect(mocks.getSupabaseWithUser).not.toHaveBeenCalled()
  })

  it('creates one base variant when size and color options are omitted', async () => {
    const models = query({ id: 1 }); const sizes = query([{ id: 11, name: '기본' }]); const colors = query([{ id: 21, name: '기본' }]); const variants = query([{ id: 101, seller_sku: 'LP01' }]); const refs = query(null)
    const supabase = { from: vi.fn((table: string) => ({ models, sizes, colors, product_variants: variants, channel_product_refs: refs }[table])) }
    mocks.getSupabaseWithUser.mockResolvedValue({ supabase, user: { id: 'user-1' } })

    await expect(createInternalProduct({ name: '단일 상품', sizes: [], colors: [], skuPrefix: 'LP01' })).resolves.toMatchObject({
      variantCount: 1,
      sellerSkus: ['LP01'],
    })
    expect(sizes.insert).toHaveBeenCalledWith([{ model_id: 1, name: '기본' }])
    expect(colors.insert).toHaveBeenCalledWith([{ model_id: 1, name: '기본', rgb_code: '#000000', text_white: false }])
  })

  it('rejects an option value that cannot convert into a seller SKU token before writing anything', async () => {
    await expect(createInternalProduct({ name: '내부 상품', sizes: ['!!!'], colors: ['블랙'], skuPrefix: 'LP' })).rejects.toThrow('판매자 SKU로 변환할 수 없는 옵션 값이 있습니다.')
    expect(mocks.getSupabaseWithUser).not.toHaveBeenCalled()
  })

  it('shares the same seller SKU token rule as the client-side chip input (src/lib/seller-sku.ts)', () => {
    expect(toSellerSkuToken(' m ')).toBe('M')
    expect(toSellerSkuToken('블랙')).toBe('블랙')
    expect(isSellerSkuConvertible('!!!')).toBe(false)
    expect(isSellerSkuConvertible('S')).toBe(true)
  })
})

'use server'

import { revalidatePath } from 'next/cache'
import { getSupabaseWithUser } from '../db'

const MAX_VARIANTS = 100

function values(value: string[]) {
  return value.map((item) => item.trim()).filter(Boolean)
}

function skuPart(value: string) {
  return value.trim().toUpperCase().replace(/[^A-Z0-9가-힣]+/g, '-').replace(/^-|-$/g, '')
}

/** Creates the local catalog hierarchy and its sellable variants without calling a channel API. */
export async function createInternalProduct(input: {
  name: string
  sizes: string[]
  colors: string[]
  skuPrefix: string
}) {
  const name = input.name.trim()
  const sizes = values(input.sizes)
  const colors = values(input.colors)
  const prefix = skuPart(input.skuPrefix)
  if (!name || !prefix || sizes.length === 0 || colors.length === 0) {
    throw new Error('상품명, 사이즈, 색상, SKU prefix를 모두 입력해주세요.')
  }
  if (new Set(sizes).size !== sizes.length || new Set(colors).size !== colors.length) {
    throw new Error('사이즈와 색상 값은 중복할 수 없습니다.')
  }
  if (sizes.length * colors.length > MAX_VARIANTS) {
    throw new Error(`판매 옵션은 최대 ${MAX_VARIANTS}개까지 만들 수 있습니다.`)
  }

  const sellerSkus = sizes.flatMap((size) => colors.map((color) => `${prefix}-${skuPart(size)}-${skuPart(color)}`))
  if (sellerSkus.some((sku) => sku.split('-').some((part) => !part)) || new Set(sellerSkus).size !== sellerSkus.length) {
    throw new Error('고유한 판매자 SKU를 만들 수 없는 값이 있습니다.')
  }

  const { supabase, user } = await getSupabaseWithUser()
  let modelId: number | null = null
  try {
    const { data: model, error: modelError } = await supabase.from('models').insert({ name }).select('id').single()
    if (modelError || !model?.id) throw new Error(modelError?.message ?? '내부 상품 등록에 실패했습니다.')
    modelId = Number(model.id)

    const { data: createdSizes, error: sizeError } = await supabase
      .from('sizes').insert(sizes.map((name) => ({ model_id: modelId, name }))).select('id, name')
    if (sizeError || !createdSizes) throw new Error(sizeError?.message ?? '사이즈 등록에 실패했습니다.')
    const { data: createdColors, error: colorError } = await supabase
      .from('colors').insert(colors.map((name) => ({ model_id: modelId, name, rgb_code: '#000000', text_white: false }))).select('id, name')
    if (colorError || !createdColors) throw new Error(colorError?.message ?? '색상 등록에 실패했습니다.')

    const sizeByName = new Map(createdSizes.map((row) => [row.name, Number(row.id)]))
    const colorByName = new Map(createdColors.map((row) => [row.name, Number(row.id)]))
    const variants = sizes.flatMap((size) => colors.map((color) => ({
      user_id: user.id, model_id: modelId, size_id: sizeByName.get(size), color_id: colorByName.get(color),
      seller_sku: `${prefix}-${skuPart(size)}-${skuPart(color)}`,
    })))
    const { data: createdVariants, error: variantError } = await supabase.from('product_variants').insert(variants).select('id, seller_sku')
    if (variantError || !createdVariants) throw new Error(variantError?.message ?? '판매 옵션 등록에 실패했습니다.')

    for (const variant of createdVariants) {
      const { error } = await supabase.from('channel_product_refs').update({ variant_id: variant.id })
        .eq('user_id', user.id).eq('seller_sku', variant.seller_sku).is('variant_id', null)
      if (error) throw new Error('채널 상품 연결에 실패했습니다.')
    }
  } catch (error) {
    if (modelId !== null) await supabase.from('models').delete().eq('id', modelId).eq('user_id', user.id)
    throw error instanceof Error ? error : new Error('내부 상품 등록에 실패했습니다.')
  }

  revalidatePath('/products')
  return { success: true, variantCount: sellerSkus.length, sellerSkus }
}

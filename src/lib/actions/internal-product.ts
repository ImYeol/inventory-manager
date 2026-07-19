'use server'

import { revalidatePath } from 'next/cache'
import { getSupabaseWithUser } from '../db'
import { toSellerSkuToken } from '../seller-sku'

const MAX_VARIANTS = 100

function values(value: string[]) {
  return value.map((item) => item.trim()).filter(Boolean)
}

const skuPart = toSellerSkuToken

/** Creates the local catalog hierarchy and its sellable variants without calling a channel API. */
export async function createInternalProduct(input: {
  name: string
  sizes: string[]
  colors: string[]
  skuPrefix: string
}) {
  const name = input.name.trim()
  const optionSizes = values(input.sizes)
  const optionColors = values(input.colors)
  const sizes = optionSizes.length > 0 ? optionSizes : ['기본']
  const colors = optionColors.length > 0 ? optionColors : ['기본']
  const prefix = skuPart(input.skuPrefix)
  if (!name || !prefix) {
    throw new Error('상품명과 SKU prefix를 입력해주세요.')
  }
  if (new Set(optionSizes).size !== optionSizes.length || new Set(optionColors).size !== optionColors.length) {
    throw new Error('사이즈와 색상 값은 중복할 수 없습니다.')
  }
  if (sizes.length * colors.length > MAX_VARIANTS) {
    throw new Error(`판매 옵션은 최대 ${MAX_VARIANTS}개까지 만들 수 있습니다.`)
  }

  if (optionSizes.some((size) => !skuPart(size)) || optionColors.some((color) => !skuPart(color))) {
    throw new Error('판매자 SKU로 변환할 수 없는 옵션 값이 있습니다.')
  }
  const skuSizes = optionSizes.length > 0 ? optionSizes : ['']
  const skuColors = optionColors.length > 0 ? optionColors : ['']
  const sellerSkus = skuSizes.flatMap((size) => skuColors.map((color) => [prefix, skuPart(size), skuPart(color)].filter(Boolean).join('-')))
  if (new Set(sellerSkus).size !== sellerSkus.length) {
    throw new Error('고유한 판매자 SKU를 만들 수 없는 값이 있습니다.')
  }

  const { supabase, user } = await getSupabaseWithUser()
  let modelId: number | null = null
  let createdVariants: Array<{ id: number; seller_sku: string }> = []
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
    const variants = sizes.flatMap((size, sizeIndex) => colors.map((color, colorIndex) => ({
      user_id: user.id, model_id: modelId, size_id: sizeByName.get(size), color_id: colorByName.get(color),
      seller_sku: sellerSkus[sizeIndex * colors.length + colorIndex],
    })))
    const { data: insertedVariants, error: variantError } = await supabase.from('product_variants').insert(variants).select('id, seller_sku')
    if (variantError || !insertedVariants) throw new Error(variantError?.message ?? '판매 옵션 등록에 실패했습니다.')
    createdVariants = insertedVariants

  } catch (error) {
    if (modelId !== null) await supabase.from('models').delete().eq('id', modelId).eq('user_id', user.id)
    throw error instanceof Error ? error : new Error('내부 상품 등록에 실패했습니다.')
  }

  revalidatePath('/products')
  return {
    success: true,
    variantCount: sellerSkus.length,
    sellerSkus,
    variants: createdVariants.map((variant) => ({ id: Number(variant.id), sellerSku: variant.seller_sku })),
  }
}

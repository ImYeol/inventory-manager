'use server'

import { revalidatePath } from 'next/cache'
import { getSupabaseWithUser } from '../db'

/** Connects a synced channel reference to one of the current user's variants. */
export async function linkVariant(channelProductRefId: number, variantId: number | null) {
  const { supabase, user } = await getSupabaseWithUser()

  const { data: ref, error: refError } = await supabase
    .from('channel_product_refs')
    .select('id')
    .eq('id', channelProductRefId)
    .eq('user_id', user.id)
    .maybeSingle()
  if (refError || !ref) throw new Error('연결할 채널 상품을 찾을 수 없습니다.')

  if (variantId !== null) {
    const { data: variant, error: variantError } = await supabase
      .from('product_variants')
      .select('id')
      .eq('id', variantId)
      .eq('user_id', user.id)
      .maybeSingle()
    if (variantError || !variant) throw new Error('연결할 내부 상품을 찾을 수 없습니다.')
  }

  const { error } = await supabase
    .from('channel_product_refs')
    .update({ variant_id: variantId })
    .eq('id', channelProductRefId)
    .eq('user_id', user.id)
  if (error) throw new Error('채널 상품 연결을 저장하지 못했습니다.')

  revalidatePath('/products')
  return { success: true }
}

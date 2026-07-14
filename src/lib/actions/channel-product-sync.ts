'use server'

import { fetchCoupangProductSnapshots } from '../api/coupang'
import { fetchNaverProductSnapshots } from '../api/naver'
import type { ChannelName, ChannelProductSnapshot } from '../channel-products'
import { getSupabaseWithUser } from '../db'
import { getRequiredShippingCredentials } from '../shipping-credentials'

export type ProductSyncResult = { added: number; updated: number; mappingRequired: number; failed: number }

type VariantRow = { id: number; seller_sku: string }
type RefRow = { channel: ChannelName; external_product_id: string; external_variant_id: string }

async function fetchSnapshots(channel: ChannelName): Promise<ChannelProductSnapshot[]> {
  if (channel === 'naver') {
    return fetchNaverProductSnapshots(await getRequiredShippingCredentials('naver'))
  }
  return fetchCoupangProductSnapshots(await getRequiredShippingCredentials('coupang'))
}

export async function syncProducts(channel?: ChannelName): Promise<ProductSyncResult> {
  const channels: ChannelName[] = channel ? [channel] : ['naver', 'coupang']
  const { supabase, user } = await getSupabaseWithUser()
  const [{ data: variants, error: variantError }, { data: refs, error: refError }] = await Promise.all([
    supabase.from('product_variants').select('id, seller_sku'),
    supabase.from('channel_product_refs').select('channel, external_product_id, external_variant_id'),
  ])
  if (variantError || refError) throw new Error('상품 동기화 준비 정보를 불러오지 못했습니다.')

  const variantsBySku = new Map<string, VariantRow[]>()
  for (const variant of (variants ?? []) as VariantRow[]) {
    variantsBySku.set(variant.seller_sku, [...(variantsBySku.get(variant.seller_sku) ?? []), variant])
  }
  const existingKeys = new Set((refs ?? []).map((ref: RefRow) => `${ref.channel}:${ref.external_product_id}:${ref.external_variant_id}`))
  const result: ProductSyncResult = { added: 0, updated: 0, mappingRequired: 0, failed: 0 }

  const settled = await Promise.allSettled(channels.map(async (currentChannel) => {
    const snapshots = await fetchSnapshots(currentChannel)
    const payload = snapshots.map((snapshot) => {
      const matches = snapshot.sellerSku ? variantsBySku.get(snapshot.sellerSku) ?? [] : []
      const variantId = matches.length === 1 ? matches[0].id : null
      if (variantId === null) result.mappingRequired += 1
      const key = `${snapshot.channel}:${snapshot.externalProductId}:${snapshot.externalVariantId}`
      if (existingKeys.has(key)) result.updated += 1
      else result.added += 1
      return {
        user_id: user.id,
        channel: snapshot.channel,
        external_product_id: snapshot.externalProductId,
        external_variant_id: snapshot.externalVariantId,
        variant_id: variantId,
        product_name: snapshot.productName,
        option_name: snapshot.optionName,
        seller_sku: snapshot.sellerSku,
        listing_status: snapshot.listingStatus,
        channel_reported: snapshot.stockQuantity,
        channel_attributes: {
          stockQuantity: snapshot.stockQuantity,
          price: snapshot.price,
          imageUrl: snapshot.imageUrl,
          raw: snapshot.rawAttributes,
        },
        last_synced_at: new Date().toISOString(),
        last_sync_error: null,
      }
    })
    if (payload.length === 0) return
    const { error } = await supabase.from('channel_product_refs').upsert(payload, {
      onConflict: 'user_id,channel,external_product_id,external_variant_id',
    })
    if (error) throw new Error('채널 상품 참조를 저장하지 못했습니다.')
  }))

  for (const entry of settled) {
    if (entry.status === 'rejected') result.failed += 1
  }
  return result
}

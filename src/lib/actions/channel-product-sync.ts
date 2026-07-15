'use server'

import { fetchCoupangProductSnapshots } from '../api/coupang'
import { fetchNaverProductSnapshots } from '../api/naver'
import type { ChannelName, ChannelProductSnapshot } from '../channel-products'
import { getSupabaseWithUser } from '../db'
import { getRequiredShippingCredentials } from '../shipping-credentials'

export type ProductSyncFailure = {
  channel: ChannelName
  message: string
}

export type ProductSyncResult = {
  added: number
  updated: number
  mappingRequired: number
  failed: number
  providerFailures: ProductSyncFailure[]
}

type VariantRow = { id: number; seller_sku: string }
type RefRow = { channel: ChannelName; external_product_id: string; external_variant_id: string; variant_id: number | null }

async function fetchSnapshots(channel: ChannelName): Promise<ChannelProductSnapshot[]> {
  if (channel === 'naver') {
    return fetchNaverProductSnapshots(await getRequiredShippingCredentials('naver'))
  }
  return fetchCoupangProductSnapshots(await getRequiredShippingCredentials('coupang'))
}

function getSafeProviderFailure(channel: ChannelName): ProductSyncFailure {
  return {
    channel,
    message: `${channel === 'coupang' ? '쿠팡' : '네이버'} 인증 정보를 확인해 주세요.`,
  }
}

export async function syncProducts(channel?: ChannelName): Promise<ProductSyncResult> {
  const channels: ChannelName[] = channel ? [channel] : ['naver', 'coupang']
  const { supabase, user } = await getSupabaseWithUser()
  const [{ data: variants, error: variantError }, { data: refs, error: refError }] = await Promise.all([
    supabase.from('product_variants').select('id, seller_sku'),
    supabase.from('channel_product_refs').select('channel, external_product_id, external_variant_id, variant_id'),
  ])
  if (variantError || refError) throw new Error('상품 동기화 준비 정보를 불러오지 못했습니다.')

  const variantsBySku = new Map<string, VariantRow[]>()
  for (const variant of (variants ?? []) as VariantRow[]) {
    variantsBySku.set(variant.seller_sku, [...(variantsBySku.get(variant.seller_sku) ?? []), variant])
  }
  const existingRefsByKey = new Map(
    (refs ?? []).map((ref: RefRow) => [`${ref.channel}:${ref.external_product_id}:${ref.external_variant_id}`, ref]),
  )
  const result: ProductSyncResult = { added: 0, updated: 0, mappingRequired: 0, failed: 0, providerFailures: [] }

  const settled = await Promise.allSettled(channels.map(async (currentChannel) => {
    const snapshots = await fetchSnapshots(currentChannel)
    const payload = snapshots.map((snapshot) => {
      const key = `${snapshot.channel}:${snapshot.externalProductId}:${snapshot.externalVariantId}`
      const existingRef = existingRefsByKey.get(key)
      const matches = snapshot.sellerSku ? variantsBySku.get(snapshot.sellerSku) ?? [] : []
      const variantId = existingRef?.variant_id ?? (matches.length === 1 ? matches[0].id : null)
      if (variantId === null) result.mappingRequired += 1
      if (existingRef) result.updated += 1
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

  for (const [index, entry] of settled.entries()) {
    if (entry.status === 'rejected') {
      result.failed += 1
      result.providerFailures.push(getSafeProviderFailure(channels[index]))
    }
  }
  return result
}

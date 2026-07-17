'use server'

import { getSupabaseWithUser } from '../db'
import { inventorySyncEntries } from '../orders'

const PROVIDER_WRITE_UNSUPPORTED = '동기화 필요: 현재 provider는 재고 수량 쓰기를 지원하지 않습니다.'

type DbClient = Awaited<ReturnType<typeof getSupabaseWithUser>>['supabase']

/**
 * Records the newest absolute quantity for every explicit channel option.
 * There is deliberately no provider call here: neither supported provider
 * currently exposes a verified inventory-write route in this application.
 */
export async function queueVariantInventorySync(supabase: DbClient, userId: string, variantId: number) {
  const refsResponse = await supabase.from('channel_product_refs')
    .select('id,channel,external_variant_id')
    .eq('variant_id', variantId)
  if (refsResponse.error) throw new Error('채널 매핑을 불러오지 못했습니다.')

  const refs = (refsResponse.data ?? []).map((ref: { id: number; channel: 'naver' | 'coupang'; external_variant_id: string }) => ({
    id: Number(ref.id), channel: ref.channel, externalVariantId: ref.external_variant_id,
  }))
  if (refs.length === 0) return []

  const variantResponse = await supabase.from('product_variants')
    .select('model_id,size_id,color_id')
    .eq('id', variantId)
    .single()
  if (variantResponse.error || !variantResponse.data) throw new Error('내부 SKU를 찾을 수 없습니다.')
  const variant = variantResponse.data as { model_id: number; size_id: number; color_id: number }
  const [inventoryResponse, reservationsResponse] = await Promise.all([
    supabase.from('inventory').select('quantity')
      .eq('model_id', variant.model_id).eq('size_id', variant.size_id).eq('color_id', variant.color_id),
    supabase.from('inventory_reservations').select('quantity')
      .eq('product_variant_id', variantId).eq('status', 'active'),
  ])
  if (inventoryResponse.error || reservationsResponse.error) throw new Error('동기화할 재고를 계산하지 못했습니다.')
  const onHand = (inventoryResponse.data ?? []).reduce((sum: number, row: { quantity: number }) => sum + row.quantity, 0)
  const committed = (reservationsResponse.data ?? []).reduce((sum: number, row: { quantity: number }) => sum + row.quantity, 0)
  const entries = inventorySyncEntries({ onHand, committed, refs })
  const requestedAt = new Date().toISOString()

  for (const entry of entries) {
    const refUpdate = await supabase.from('channel_product_refs').update({
      sync_target_quantity: entry.targetQuantity,
      sync_status: 'required',
      last_sync_error: PROVIDER_WRITE_UNSUPPORTED,
      updated_at: requestedAt,
    }).eq('id', entry.channelProductRefId)
    if (refUpdate.error) throw new Error('채널 동기화 필요 상태를 저장하지 못했습니다.')
    const outboxWrite = await supabase.from('inventory_sync_outbox').upsert({
      user_id: userId,
      channel_product_ref_id: entry.channelProductRefId,
      target_quantity: entry.targetQuantity,
      status: 'required',
      last_error: PROVIDER_WRITE_UNSUPPORTED,
      requested_at: requestedAt,
    }, { onConflict: 'user_id,channel_product_ref_id' })
    if (outboxWrite.error) throw new Error('재고 동기화 outbox를 저장하지 못했습니다.')
  }
  return entries
}

/** Server action entry point for a future worker or an operator-triggered retry. */
export async function requestVariantInventorySync(variantId: number) {
  const { supabase, user } = await getSupabaseWithUser()
  return queueVariantInventorySync(supabase, user.id, variantId)
}

export async function queueInventorySyncForReservation(supabase: DbClient, userId: string, reservationId: number) {
  const reservation = await supabase.from('inventory_reservations').select('product_variant_id').eq('id', reservationId).single()
  if (reservation.error || !reservation.data) throw new Error('예약을 찾을 수 없습니다.')
  return queueVariantInventorySync(supabase, userId, Number(reservation.data.product_variant_id))
}

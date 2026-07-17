'use server'

import { revalidatePath } from 'next/cache'

import type { ChannelName } from '../channel-products'
import { getSupabaseWithUser } from '../db'

export type ChannelMappingVerificationStatus = 'unverified'

export type ChannelProductMappingInput = {
  variantId: number
  channel: ChannelName
  sellerSku: string
  externalProductId: string
  externalVariantId: string
}

type NormalizedMappingInput = ChannelProductMappingInput & {
  sellerSku: string
  externalProductId: string
  externalVariantId: string
}

function normalizeInput(input: ChannelProductMappingInput): NormalizedMappingInput {
  const sellerSku = input.sellerSku.trim()
  const externalProductId = input.externalProductId.trim()
  const externalVariantId = input.externalVariantId.trim()
  if (!Number.isSafeInteger(input.variantId) || input.variantId <= 0) throw new Error('내부 판매 옵션을 선택해주세요.')
  if (input.channel !== 'naver' && input.channel !== 'coupang') throw new Error('지원하지 않는 채널입니다.')
  if (!sellerSku || !externalProductId || !externalVariantId) throw new Error('판매자 SKU와 채널 상품/옵션 ID를 입력해주세요.')
  return { ...input, sellerSku, externalProductId, externalVariantId }
}

async function ensureVariantOwner(variantId: number, userId: string, supabase: Awaited<ReturnType<typeof getSupabaseWithUser>>['supabase']) {
  const { data, error } = await supabase
    .from('product_variants')
    .select('id')
    .eq('id', variantId)
    .eq('user_id', userId)
    .maybeSingle()
  if (error || !data) throw new Error('연결할 내부 판매 옵션을 찾을 수 없습니다.')
}

async function findDuplicate(
  input: NormalizedMappingInput,
  userId: string,
  supabase: Awaited<ReturnType<typeof getSupabaseWithUser>>['supabase'],
) {
  const { data, error } = await supabase
    .from('channel_product_refs')
    .select('id')
    .eq('user_id', userId)
    .eq('channel', input.channel)
    .eq('external_product_id', input.externalProductId)
    .eq('external_variant_id', input.externalVariantId)
    .maybeSingle()
  if (error) throw new Error('채널 판매 옵션 중복 여부를 확인하지 못했습니다.')
  return data as { id: number } | null
}

function manualMappingPayload(input: NormalizedMappingInput, userId: string) {
  // Neither supported provider exposes a single-option lookup through the current
  // server helper contract, so an identifier-valid mapping is explicitly unverified.
  return {
    user_id: userId,
    variant_id: input.variantId,
    channel: input.channel,
    seller_sku: input.sellerSku,
    external_product_id: input.externalProductId,
    external_variant_id: input.externalVariantId,
    verification_status: 'unverified' as const,
  }
}

function revalidateProductWorkspace() {
  revalidatePath('/products')
}

export async function createChannelProductMapping(input: ChannelProductMappingInput) {
  const normalized = normalizeInput(input)
  const { supabase, user } = await getSupabaseWithUser()
  await ensureVariantOwner(normalized.variantId, user.id, supabase)
  if (await findDuplicate(normalized, user.id, supabase)) throw new Error('이미 연결된 채널 판매 옵션입니다.')

  const { error } = await supabase.from('channel_product_refs').insert(manualMappingPayload(normalized, user.id))
  if (error?.code === '23505') throw new Error('이미 연결된 채널 판매 옵션입니다.')
  if (error) throw new Error('채널 상품 연결을 저장하지 못했습니다.')
  revalidateProductWorkspace()
  return { success: true, verificationStatus: 'unverified' as ChannelMappingVerificationStatus }
}

export async function updateChannelProductMapping(channelProductRefId: number, input: ChannelProductMappingInput) {
  if (!Number.isSafeInteger(channelProductRefId) || channelProductRefId <= 0) throw new Error('연결할 채널 상품을 찾을 수 없습니다.')
  const normalized = normalizeInput(input)
  const { supabase, user } = await getSupabaseWithUser()
  await ensureVariantOwner(normalized.variantId, user.id, supabase)
  const duplicate = await findDuplicate(normalized, user.id, supabase)
  if (duplicate && Number(duplicate.id) !== channelProductRefId) throw new Error('이미 연결된 채널 판매 옵션입니다.')

  const { data: ref, error: refError } = await supabase
    .from('channel_product_refs')
    .select('id')
    .eq('id', channelProductRefId)
    .eq('user_id', user.id)
    .maybeSingle()
  if (refError || !ref) throw new Error('연결할 채널 상품을 찾을 수 없습니다.')

  const { error } = await supabase
    .from('channel_product_refs')
    .update(manualMappingPayload(normalized, user.id))
    .eq('id', channelProductRefId)
    .eq('user_id', user.id)
  if (error?.code === '23505') throw new Error('이미 연결된 채널 판매 옵션입니다.')
  if (error) throw new Error('채널 상품 연결을 저장하지 못했습니다.')
  revalidateProductWorkspace()
  return { success: true, verificationStatus: 'unverified' as ChannelMappingVerificationStatus }
}

export async function unlinkChannelProductMapping(channelProductRefId: number) {
  if (!Number.isSafeInteger(channelProductRefId) || channelProductRefId <= 0) throw new Error('연결할 채널 상품을 찾을 수 없습니다.')
  const { supabase, user } = await getSupabaseWithUser()
  const { data: ref, error: refError } = await supabase
    .from('channel_product_refs')
    .select('id')
    .eq('id', channelProductRefId)
    .eq('user_id', user.id)
    .maybeSingle()
  if (refError || !ref) throw new Error('연결할 채널 상품을 찾을 수 없습니다.')

  const { error } = await supabase
    .from('channel_product_refs')
    .delete()
    .eq('id', channelProductRefId)
    .eq('user_id', user.id)
  if (error) throw new Error('채널 상품 연결을 해제하지 못했습니다.')
  revalidateProductWorkspace()
  return { success: true }
}

/** Compatibility action for legacy snapshot rows. New mappings must use the explicit APIs above. */
export async function linkVariant(channelProductRefId: number, variantId: number | null) {
  if (variantId === null) return unlinkChannelProductMapping(channelProductRefId)
  const { supabase, user } = await getSupabaseWithUser()
  await ensureVariantOwner(variantId, user.id, supabase)
  const { error } = await supabase
    .from('channel_product_refs')
    .update({ variant_id: variantId })
    .eq('id', channelProductRefId)
    .eq('user_id', user.id)
  if (error) throw new Error('채널 상품 연결을 저장하지 못했습니다.')
  revalidateProductWorkspace()
  return { success: true }
}

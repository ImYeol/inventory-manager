'use server'

import { getSupabaseWithUser } from '../db'
import { sendCoupangTrackingNumbers, sendNaverTrackingNumbers } from './shipping'
import { BUILT_IN_TRACKING_PRESETS, matchTrackingRows, type TrackingColumnMapping, type TrackingMatch, type TrackingRow } from '../excel'

export type FulfillmentCandidate = { lineId: number; reservationId: number; channel: 'naver' | 'coupang'; externalLineId: string; trackingNumber: string; carrier: string; trackingImportBatchId?: number; shipmentBoxId?: number; orderId?: number; vendorItemId?: number }
export type TrackingPreviewRow = TrackingMatch & { fulfillmentCandidate?: FulfillmentCandidate }
export type SavedTrackingPreset = { id: number; name: string; channel: 'naver' | 'coupang' | null; mapping: TrackingColumnMapping }

const keyFor = (row: FulfillmentCandidate) => `${row.channel}:${row.externalLineId}:${row.trackingNumber}`

/** Built-ins are code-owned; only a clone under a new name may be persisted. */
export async function saveTrackingPreset(input: { name: string; channel?: 'naver' | 'coupang'; mapping: TrackingColumnMapping }) {
  const name = input.name.trim()
  if (!name) throw new Error('프리셋 이름을 입력하세요.')
  if (BUILT_IN_TRACKING_PRESETS.some((preset) => preset.name === name)) throw new Error('기본 프리셋은 다른 이름으로 복제해 저장하세요.')
  const { supabase, user } = await getSupabaseWithUser()
  const { data, error } = await supabase.from('tracking_import_templates').upsert({ user_id: user.id, name, channel: input.channel ?? null, column_mapping: input.mapping }, { onConflict: 'user_id,channel,name' }).select('id,name,channel,column_mapping').single()
  if (error) throw new Error('프리셋을 저장하지 못했습니다.')
  return { id: Number(data.id), name: data.name, channel: data.channel as SavedTrackingPreset['channel'], mapping: data.column_mapping as TrackingColumnMapping }
}

export async function listTrackingPresets(): Promise<SavedTrackingPreset[]> {
  const { supabase, user } = await getSupabaseWithUser()
  const { data, error } = await supabase.from('tracking_import_templates').select('id,name,channel,column_mapping').eq('user_id', user.id).order('name')
  if (error) throw new Error('저장된 프리셋을 불러오지 못했습니다.')
  return (data ?? []).map((item) => ({ id: Number(item.id), name: item.name, channel: item.channel as SavedTrackingPreset['channel'], mapping: item.column_mapping as TrackingColumnMapping }))
}

/** Stores only normalized values and a compact validation summary—never uploaded bytes. */
export async function createTrackingImportBatch(input: { filename: string; rows: TrackingRow[]; validationSummary: Record<string, number> }) {
  const { supabase, user } = await getSupabaseWithUser()
  const normalizedRows = input.rows.map(({ rowNumber, orderNumber, trackingNumber, carrier, recipientName, address, shippedAt }) => ({ rowNumber, orderNumber, trackingNumber, carrier, recipientName, address, shippedAt }))
  const { data, error } = await supabase.from('tracking_import_batches').insert({ user_id: user.id, source_filename: input.filename, row_count: normalizedRows.length, status: 'previewed', result_summary: { validation: input.validationSummary, normalizedRows } }).select('id')
  if (error) throw new Error('송장 가져오기 결과를 저장하지 못했습니다.')
  return Array.isArray(data) ? data[0] : data
}

export async function previewTrackingImport(input: { filename: string; rows: TrackingRow[] }): Promise<{ batchId: number; rows: TrackingPreviewRow[] }> {
  const { supabase } = await getSupabaseWithUser()
  const { data, error } = await supabase.from('channel_order_lines').select('id,channel,external_line_id,raw_payload,channel_orders(external_order_id,customer_name,shipping_address),product_variants(seller_sku),inventory_reservations(id,status)').in('line_status', ['NEW', 'RESERVED', 'MAPPING_REQUIRED', 'EXCEPTION'])
  if (error) throw new Error('주문 매칭 후보를 불러오지 못했습니다.')
  const source = (data ?? []) as Array<Record<string, unknown>>
  const candidates = source.map((line) => {
    const orderValue = Array.isArray(line.channel_orders) ? line.channel_orders[0] : line.channel_orders
    const variantValue = Array.isArray(line.product_variants) ? line.product_variants[0] : line.product_variants
    const order = (orderValue ?? {}) as Record<string, unknown>
    const variant = (variantValue ?? {}) as Record<string, unknown>
    const storedOrderId = String(order.external_order_id ?? '')
    const externalOrderId = line.channel === 'naver'
      ? String(line.external_line_id ?? '')
      : storedOrderId.split(':').at(-1) ?? storedOrderId
    return {
      id: Number(line.id),
      externalOrderId,
      sellerSku: typeof variant.seller_sku === 'string' ? variant.seller_sku : null,
      recipientName: String(order.customer_name ?? ''),
      address: String(order.shipping_address ?? ''),
      channel: line.channel as 'naver' | 'coupang',
    }
  })
  const matches = matchTrackingRows(input.rows, candidates)
  const summary = matches.reduce<Record<string, number>>((acc, row) => ({ ...acc, [row.matchStatus]: (acc[row.matchStatus] ?? 0) + 1 }), {})
  const batch = await createTrackingImportBatch({ filename: input.filename, rows: input.rows, validationSummary: summary })
  if (!batch?.id) throw new Error('송장 가져오기 배치를 만들지 못했습니다.')
  const byId = new Map(source.map((line) => [Number(line.id), line]))
  return {
    batchId: Number(batch.id),
    rows: matches.map((match) => {
      if (!match.dispatchable || !match.orderLineId) return match
      const line = byId.get(match.orderLineId)
      const reservations = (line?.inventory_reservations ?? []) as Array<{ id: number; status: string }>
      const reservation = reservations.find((item) => item.status === 'active')
      if (!line || !reservation) return { ...match, matchStatus: 'MISSING' as const, channel: null, dispatchable: false }
      const externalLineId = String(line.external_line_id ?? '')
      const orderValue = Array.isArray(line.channel_orders) ? line.channel_orders[0] : line.channel_orders
      const externalOrderId = String((orderValue as Record<string, unknown> | undefined)?.external_order_id ?? '')
      const [shipmentBoxId, orderId] = externalOrderId.split(':').map(Number)
      const vendorItemId = Number(externalLineId.split(':').at(-1))
      return {
        ...match,
        fulfillmentCandidate: {
          lineId: match.orderLineId,
          reservationId: reservation.id,
          channel: line.channel as 'naver' | 'coupang',
          externalLineId: line.channel === 'naver' ? externalLineId : externalLineId,
          trackingNumber: match.trackingNumber,
          carrier: match.carrier,
          trackingImportBatchId: Number(batch.id),
          ...(line.channel === 'coupang' ? { shipmentBoxId, orderId, vendorItemId } : {}),
        },
      }
    }),
  }
}

export async function finalizeTrackingImport(rows: FulfillmentCandidate[]) {
  const { supabase, user } = await getSupabaseWithUser()
  const result = { externalSucceeded: 0, finalized: 0, reconcileRequired: 0, failed: 0 }
  const keys = rows.map(keyFor)
  const { data: existing, error: existingError } = await supabase.from('order_fulfillments').select('id,idempotency_key,local_status').in('idempotency_key', keys)
  if (existingError) throw new Error('기존 발송 처리 상태를 확인하지 못했습니다.')
  const existingByKey = new Map((existing ?? []).map((item) => [item.idempotency_key, item]))
  for (const item of existing ?? []) {
    result.externalSucceeded += 1
    if (item.local_status === 'fulfilled') {
      result.finalized += 1
      continue
    }
    const retried = await supabase.rpc('finalize_order_fulfillment', { p_fulfillment_id: item.id })
    if (retried.error || !retried.data) result.reconcileRequired += 1
    else result.finalized += 1
  }
  const pendingRows = rows.filter((row) => !existingByKey.has(keyFor(row)))
  const naver = pendingRows.filter((row) => row.channel === 'naver')
  const coupang = pendingRows.filter((row) => row.channel === 'coupang')
  const naverFailures = new Set<string>()
  for (let index = 0; index < naver.length; index += 30) {
    const chunk = naver.slice(index, index + 30)
    const sent = await sendNaverTrackingNumbers(chunk.map((row) => ({ productOrderId: row.externalLineId, trackingNumber: row.trackingNumber })))
    sent.failedOrders.forEach((id) => naverFailures.add(id))
  }
  const coupangSent = coupang.length ? await sendCoupangTrackingNumbers(coupang.map((row) => ({ shipmentBoxId: row.shipmentBoxId ?? 0, orderId: row.orderId ?? 0, vendorItemIds: [row.vendorItemId ?? 0], trackingNumber: row.trackingNumber }))) : { failedBoxes: [] }
  const coupangFailures = new Set(coupangSent.failedBoxes)
  for (const row of pendingRows) {
    const externalFailed = row.channel === 'naver' ? naverFailures.has(row.externalLineId) : coupangFailures.has(row.shipmentBoxId ?? 0)
    if (externalFailed) { result.failed += 1; continue }
    const { data: fulfillment, error } = await supabase.from('order_fulfillments').insert({ user_id: user.id, channel_order_line_id: row.lineId, inventory_reservation_id: row.reservationId, tracking_import_batch_id: row.trackingImportBatchId ?? null, idempotency_key: keyFor(row), external_status: 'success', local_status: 'pending', tracking_number: row.trackingNumber, carrier_code: row.carrier, external_reference: row.externalLineId }).select('id')
    const item = Array.isArray(fulfillment) ? fulfillment[0] : fulfillment
    if (error || !item) { result.failed += 1; continue }
    result.externalSucceeded += 1
    const finalized = await supabase.rpc('finalize_order_fulfillment', { p_fulfillment_id: item.id })
    if (finalized.error || !finalized.data) {
      result.reconcileRequired += 1
      await supabase.from('order_fulfillments').update({ local_status: 'failed', error: 'RECONCILE_REQUIRED' }).eq('id', item.id)
    } else result.finalized += 1
  }
  return result
}

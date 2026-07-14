'use server'

import { getSupabaseWithUser } from '../db'
import { sendCoupangTrackingNumbers, sendNaverTrackingNumbers } from './shipping'
import { BUILT_IN_TRACKING_PRESETS, type TrackingColumnMapping, type TrackingRow } from '../excel'

export type FulfillmentCandidate = { lineId: number; reservationId: number; channel: 'naver' | 'coupang'; externalLineId: string; trackingNumber: string; carrier: string; shipmentBoxId?: number; orderId?: number; vendorItemId?: number }

const keyFor = (row: FulfillmentCandidate) => `${row.channel}:${row.externalLineId}:${row.trackingNumber}`

/** Built-ins are code-owned; only a clone under a new name may be persisted. */
export async function saveTrackingPreset(input: { name: string; channel?: 'naver' | 'coupang'; mapping: TrackingColumnMapping }) {
  if (BUILT_IN_TRACKING_PRESETS.some((preset) => preset.name === input.name)) throw new Error('기본 프리셋은 복제 후 저장할 수 있습니다.')
  const { supabase, user } = await getSupabaseWithUser()
  const { error } = await supabase.from('tracking_import_templates').upsert({ user_id: user.id, name: input.name, channel: input.channel ?? null, column_mapping: input.mapping }, { onConflict: 'user_id,channel,name' })
  if (error) throw new Error('프리셋을 저장하지 못했습니다.')
}

/** Stores only normalized values and a compact validation summary—never uploaded bytes. */
export async function createTrackingImportBatch(input: { filename: string; rows: TrackingRow[]; validationSummary: Record<string, number> }) {
  const { supabase, user } = await getSupabaseWithUser()
  const normalizedRows = input.rows.map(({ rowNumber, orderNumber, trackingNumber, carrier, recipientName, address, shippedAt }) => ({ rowNumber, orderNumber, trackingNumber, carrier, recipientName, address, shippedAt }))
  const { data, error } = await supabase.from('tracking_import_batches').insert({ user_id: user.id, source_filename: input.filename, row_count: normalizedRows.length, status: 'previewed', result_summary: { validation: input.validationSummary, normalizedRows } }).select('id')
  if (error) throw new Error('송장 가져오기 결과를 저장하지 못했습니다.')
  return Array.isArray(data) ? data[0] : data
}

export async function finalizeTrackingImport(rows: FulfillmentCandidate[]) {
  const { supabase, user } = await getSupabaseWithUser()
  const result = { externalSucceeded: 0, finalized: 0, reconcileRequired: 0, failed: 0 }
  const naver = rows.filter((row) => row.channel === 'naver')
  const coupang = rows.filter((row) => row.channel === 'coupang')
  const naverFailures = new Set<string>()
  for (let index = 0; index < naver.length; index += 30) {
    const chunk = naver.slice(index, index + 30)
    const sent = await sendNaverTrackingNumbers(chunk.map((row) => ({ productOrderId: row.externalLineId, trackingNumber: row.trackingNumber })))
    sent.failedOrders.forEach((id) => naverFailures.add(id))
  }
  const coupangSent = coupang.length ? await sendCoupangTrackingNumbers(coupang.map((row) => ({ shipmentBoxId: row.shipmentBoxId ?? 0, orderId: row.orderId ?? 0, vendorItemIds: [row.vendorItemId ?? 0], trackingNumber: row.trackingNumber }))) : { failedBoxes: [] }
  const coupangFailures = new Set(coupangSent.failedBoxes)
  for (const row of rows) {
    const externalFailed = row.channel === 'naver' ? naverFailures.has(row.externalLineId) : coupangFailures.has(row.shipmentBoxId ?? 0)
    if (externalFailed) { result.failed += 1; continue }
    const { data: fulfillment, error } = await supabase.from('order_fulfillments').insert({ user_id: user.id, channel_order_line_id: row.lineId, inventory_reservation_id: row.reservationId, idempotency_key: keyFor(row), external_status: 'success', local_status: 'pending', tracking_number: row.trackingNumber, carrier_code: row.carrier, external_reference: row.externalLineId }).select('id')
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

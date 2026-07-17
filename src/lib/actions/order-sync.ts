'use server'

import { fetchCoupangPendingOrders } from '../api/coupang'
import { fetchNaverPendingOrders } from '../api/naver'
import type { CoupangOrderSheet } from '../api/coupang'
import type { NaverOrder } from '../api/naver'
import { getSupabaseWithUser } from '../db'
import { reservationDisposition } from '../orders'
import { queueVariantInventorySync } from './inventory-sync'
import { getRequiredShippingCredentials } from '../shipping-credentials'

type Channel = 'naver' | 'coupang'

function isCancelled(status: string) {
  return /CANCEL|CANCELED|CANCELLED|취소/i.test(status)
}

export async function syncOrders(channel?: Channel): Promise<{ orders: number; lines: number; reservations: number; mappingRequired: number; exceptions: number; failed: number }> {
  const { supabase, user } = await getSupabaseWithUser()
  const channels: Channel[] = channel ? [channel] : ['naver', 'coupang']
  const result = { orders: 0, lines: 0, reservations: 0, mappingRequired: 0, exceptions: 0, failed: 0 }

  for (const current of channels) {
    try {
      const source = (current === 'naver'
        ? await fetchNaverPendingOrders(await getRequiredShippingCredentials('naver'))
        : await fetchCoupangPendingOrders(await getRequiredShippingCredentials('coupang'))) as Array<NaverOrder & CoupangOrderSheet>
      for (const order of source) {
        const externalOrderId = current === 'naver' ? order.orderId : `${order.shipmentBoxId}:${order.orderId}`
        const orderedAt = current === 'naver' ? order.orderDate : order.orderedAt
        const status = current === 'naver' ? order.productOrderStatus : order.status
        const customerName = current === 'naver' ? order.recipientName : order.receiver.name
        const address = current === 'naver' ? order.recipientAddress : `${order.receiver.addr1} ${order.receiver.addr2}`.trim()
        const orderWrite = supabase.from('channel_orders').upsert({
          user_id: user.id, channel: current, external_order_id: externalOrderId, order_status: status,
          ordered_at: orderedAt, customer_name: customerName, shipping_address: address, raw_payload: order,
        }, { onConflict: 'user_id,channel,external_order_id' })
        const orderResponse = typeof orderWrite.select === 'function' ? await orderWrite.select('id') : await orderWrite
        const orders = Array.isArray(orderResponse.data) ? orderResponse.data : orderResponse.data ? [orderResponse.data] : []
        const orderError = orderResponse.error
        if (orderError || !orders?.[0]) throw new Error('주문을 저장하지 못했습니다.')
        result.orders += 1
        const orderId = orders[0].id
        const lines = current === 'naver'
          ? [{ id: order.productOrderId, quantity: order.quantity, name: order.productName, sellerSku: order.sellerSku, externalProductId: order.externalProductId, externalVariantId: order.externalVariantId }]
          : order.orderItems.map((item) => ({ id: `${order.shipmentBoxId}:${item.vendorItemId}`, quantity: item.shippingCount, name: item.vendorItemName, sellerSku: item.sellerSku, externalProductId: item.externalProductId, externalVariantId: String(item.vendorItemId) }))
        for (const line of lines) {
          const refQuery = supabase.from('channel_product_refs').select('id, variant_id')
          const refResponse = typeof refQuery.eq === 'function'
            ? await refQuery.eq('channel', current).eq('external_variant_id', line.externalVariantId)
            : await refQuery
          const refs = refResponse.data
          const ref = refs?.length === 1 ? refs[0] : null
          const variantId = ref?.variant_id ?? null
          const lineStatus = isCancelled(status) ? 'CANCELLED' : variantId ? 'NEW' : 'MAPPING_REQUIRED'
          const lineWrite = supabase.from('channel_order_lines').upsert({
            user_id: user.id, channel_order_id: orderId, channel: current, external_line_id: line.id,
            channel_product_ref_id: ref?.id ?? null, variant_id: variantId, quantity: line.quantity,
            line_status: lineStatus, raw_payload: { ...line, productName: line.name },
          }, { onConflict: 'user_id,channel,external_line_id' })
          const lineResponse = typeof lineWrite.select === 'function' ? await lineWrite.select('id') : await lineWrite
          const storedLines = Array.isArray(lineResponse.data) ? lineResponse.data : lineResponse.data ? [lineResponse.data] : []
          const lineError = lineResponse.error
          if (lineError || !storedLines?.[0]) throw new Error('주문 항목을 저장하지 못했습니다.')
          result.lines += 1
          const storedLineId = storedLines[0].id
          if (isCancelled(status)) {
            await supabase.from('inventory_reservations').update({ status: 'released', released_at: new Date().toISOString() }).eq('channel_order_line_id', storedLineId).eq('status', 'active')
            if (variantId) await queueVariantInventorySync(supabase, user.id, Number(variantId)).catch(() => undefined)
            continue
          }
          if (!variantId) { result.mappingRequired += 1; continue }
          const { data: active } = await supabase.from('inventory_reservations').select('id').eq('channel_order_line_id', storedLineId).eq('status', 'active')
          if (active?.length) continue
          const { data: variant } = await supabase.from('product_variants').select('model_id,size_id,color_id').eq('id', variantId).single()
          const { data: inventory } = variant ? await supabase.from('inventory').select('warehouse_id,quantity').eq('model_id', variant.model_id).eq('size_id', variant.size_id).eq('color_id', variant.color_id) : { data: [] }
          const { data: activeReservations } = await supabase.from('inventory_reservations').select('warehouse_id,quantity').eq('product_variant_id', variantId).eq('status', 'active')
          const committed = new Map<number, number>()
          for (const reservation of activeReservations ?? []) committed.set(reservation.warehouse_id, (committed.get(reservation.warehouse_id) ?? 0) + reservation.quantity)
          const decision = reservationDisposition(line.quantity, (inventory ?? []).map((row) => ({ warehouseId: row.warehouse_id, quantity: row.quantity, committed: committed.get(row.warehouse_id) ?? 0 })))
          if (decision.status !== 'ACTIVE') {
            await supabase.from('channel_order_lines').update({ line_status: 'EXCEPTION' }).eq('id', storedLineId)
            result.exceptions += 1
            continue
          }
          const { error: reservationError } = await supabase.from('inventory_reservations').insert({ user_id: user.id, channel_order_line_id: storedLineId, product_variant_id: variantId, warehouse_id: decision.warehouseId, quantity: line.quantity, status: 'active' })
          if (reservationError) throw new Error('재고 예약을 저장하지 못했습니다.')
          await supabase.from('channel_order_lines').update({ line_status: 'RESERVED' }).eq('id', storedLineId)
          result.reservations += 1
          await queueVariantInventorySync(supabase, user.id, Number(variantId)).catch(() => undefined)
        }
      }
    } catch { result.failed += 1 }
  }
  return result
}

export async function getOrdersWorkspaceData() {
  const { supabase } = await getSupabaseWithUser()
  const { data, error } = await supabase.from('channel_orders').select('id,channel,external_order_id,order_status,ordered_at,channel_order_lines(id,quantity,line_status,product_variants(seller_sku),inventory_reservations(warehouse_id,status))').order('ordered_at', { ascending: false })
  if (error?.code === 'PGRST205' || error?.message.toLowerCase().includes('could not find the table')) return []
  if (error) throw new Error('주문을 불러오지 못했습니다.')
  return data ?? []
}

export async function assignOrderLine(input: { lineId: number; variantId: number; warehouseId: number }) {
  const { supabase, user } = await getSupabaseWithUser()
  const { data: line, error: lineError } = await supabase.from('channel_order_lines').select('id,channel_order_id,quantity').eq('id', input.lineId).single()
  if (lineError || !line) throw new Error('주문 항목을 찾을 수 없습니다.')
  const { data: orderLines } = await supabase.from('channel_order_lines').select('id').eq('channel_order_id', line.channel_order_id)
  const lineIds = (orderLines ?? []).map((item) => item.id)
  const { data: orderReservations } = await supabase.from('inventory_reservations').select('warehouse_id').in('channel_order_line_id', lineIds).eq('status', 'active')
  if ((orderReservations ?? []).some((reservation) => reservation.warehouse_id !== input.warehouseId)) throw new Error('한 주문은 하나의 창고만 배정할 수 있습니다.')
  const { data: variant } = await supabase.from('product_variants').select('model_id,size_id,color_id').eq('id', input.variantId).single()
  const { data: inventory } = variant ? await supabase.from('inventory').select('quantity').eq('warehouse_id', input.warehouseId).eq('model_id', variant.model_id).eq('size_id', variant.size_id).eq('color_id', variant.color_id).single() : { data: null }
  const { data: activeReservations } = await supabase.from('inventory_reservations').select('quantity').eq('product_variant_id', input.variantId).eq('warehouse_id', input.warehouseId).eq('status', 'active')
  const committed = (activeReservations ?? []).reduce((sum, reservation) => sum + reservation.quantity, 0)
  if (!inventory || inventory.quantity - committed < line.quantity) throw new Error('선택한 창고의 가용 재고가 부족합니다.')
  await supabase.from('inventory_reservations').update({ status: 'released', released_at: new Date().toISOString() }).eq('channel_order_line_id', input.lineId).eq('status', 'active')
  const { error: reservationError } = await supabase.from('inventory_reservations').insert({ user_id: user.id, channel_order_line_id: input.lineId, product_variant_id: input.variantId, warehouse_id: input.warehouseId, quantity: line.quantity, status: 'active' })
  if (reservationError) throw new Error('주문 예약을 저장하지 못했습니다.')
  const { error } = await supabase.from('channel_order_lines').update({ variant_id: input.variantId, line_status: 'RESERVED' }).eq('id', input.lineId)
  if (error) throw new Error('주문 항목을 배정하지 못했습니다.')
  await queueVariantInventorySync(supabase, user.id, input.variantId).catch(() => undefined)
  return { success: true, warehouseId: input.warehouseId }
}

import type { CoupangOrderSheet } from './api/coupang'
import type { NaverOrder } from './api/naver'

export type OrderChannel = 'naver' | 'coupang'

export type NormalizedOrderLine = {
  externalLineId: string
  externalProductId: string | null
  externalVariantId: string | null
  sellerSku: string | null
  productName: string
  quantity: number
  status: string
  rawPayload: unknown
}

export type NormalizedOrder = {
  channel: OrderChannel
  externalOrderId: string
  status: string
  orderedAt: string
  customerName: string
  shippingAddress: string
  rawPayload: unknown
  lines: NormalizedOrderLine[]
}

export function normalizeNaverOrders(orders: NaverOrder[]): NormalizedOrder[] {
  return orders.map((order) => ({
    channel: 'naver', externalOrderId: order.orderId, status: order.productOrderStatus, orderedAt: order.orderDate,
    customerName: order.recipientName, shippingAddress: order.recipientAddress, rawPayload: order,
    lines: [{ externalLineId: order.productOrderId, externalProductId: order.externalProductId ?? null, externalVariantId: order.externalVariantId ?? null, sellerSku: order.sellerSku ?? null, productName: order.productName, quantity: order.quantity, status: order.productOrderStatus, rawPayload: order }],
  }))
}

export function normalizeCoupangOrders(orders: CoupangOrderSheet[]): NormalizedOrder[] {
  return orders.map((order) => ({
    channel: 'coupang', externalOrderId: `${order.shipmentBoxId}:${order.orderId}`, status: order.status, orderedAt: order.orderedAt,
    customerName: order.receiver.name, shippingAddress: `${order.receiver.addr1} ${order.receiver.addr2}`.trim(), rawPayload: order,
    lines: order.orderItems.map((item) => ({ externalLineId: `${order.shipmentBoxId}:${order.orderId}:${item.vendorItemId}`, externalProductId: item.externalProductId ?? null, externalVariantId: String(item.vendorItemId), sellerSku: item.sellerSku ?? null, productName: item.vendorItemName, quantity: item.shippingCount, status: order.status, rawPayload: item })),
  }))
}

export function isCancelledOrderStatus(status: string) {
  return /CANCEL|RETURN|REFUND/.test(status.toUpperCase())
}

export function chooseReservationWarehouse(candidates: Array<{ warehouseId: number; available: number }>, quantity: number) {
  const sufficient = candidates.filter((candidate) => candidate.available >= quantity)
  return sufficient.length === 1 ? sufficient[0].warehouseId : null
}

export function orderViewFor(status: string, fulfillmentStatus: string) {
  if (fulfillmentStatus === '발송 완료') return '발송 완료'
  if (status === 'MAPPING_REQUIRED' || status === 'EXCEPTION') return '확인 필요'
  if (fulfillmentStatus === '출고 준비') return '출고 준비'
  return '신규'
}

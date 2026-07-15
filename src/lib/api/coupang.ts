// 쿠팡 오픈 API 헬퍼 (서버 전용)
// 참고: https://developers.coupangcorp.com/

import crypto from 'crypto'

import type { ChannelProductSnapshot } from '../channel-products'
import type { CoupangCredentials } from '../shipping-credentials'

const BASE_URL = 'https://api-gateway.coupang.com'
const MAX_COUPANG_RANGE_DAYS = 31
const MS_PER_DAY = 24 * 60 * 60 * 1000

export type CoupangOrderItem = {
  vendorItemId: number
  vendorItemName: string
  shippingCount: number
  sellerSku?: string | null
  externalProductId?: string | null
}

export type CoupangOrderSheet = {
  shipmentBoxId: number
  orderId: number
  orderedAt: string
  status: string
  receiver: {
    name: string
    addr1: string
    addr2: string
  }
  orderItems: CoupangOrderItem[]
}

type CoupangSellerProductListItem = { sellerProductId?: number | string }

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {}
}

function asString(value: unknown): string | null {
  return typeof value === 'string' && value.length > 0 ? value : null
}

function asNumber(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null
}

async function mapWithConcurrency<T, R>(items: T[], limit: number, mapper: (item: T) => Promise<R>): Promise<R[]> {
  const results: R[] = []
  for (let index = 0; index < items.length; index += limit) {
    results.push(...await Promise.all(items.slice(index, index + limit).map(mapper)))
  }
  return results
}

function normalizeCoupangProduct(product: unknown, inventories: Map<string, Record<string, unknown>>): ChannelProductSnapshot[] {
  const raw = asRecord(product)
  const sellerProductId = asString(raw.sellerProductId) ?? String(raw.sellerProductId ?? '')
  if (!sellerProductId) return []

  const items = Array.isArray(raw.items) ? raw.items : []
  return items.flatMap((vendorItem) => {
    const item = asRecord(vendorItem)
    const vendorItemId = asString(item.vendorItemId) ?? String(item.vendorItemId ?? '')
    if (!vendorItemId) return []
    const inventory = inventories.get(vendorItemId) ?? {}
    const onSale = inventory.onSale === true
    const stockQuantity = asNumber(inventory.amountInStock)
    const listingStatus = onSale && stockQuantity === 0
        ? 'sold-out' as const
        : onSale
          ? 'active' as const
          : 'paused' as const
    return [{
      channel: 'coupang' as const,
      externalProductId: sellerProductId,
      externalVariantId: vendorItemId,
      sellerSku: asString(item.externalVendorSku),
      productName: asString(raw.sellerProductName ?? raw.productName),
      optionName: asString(item.itemName),
      listingStatus,
      stockQuantity,
      price: asNumber(inventory.salePrice),
      imageUrl: asString(item.mainImage ?? raw.imageUrl),
      rawAttributes: raw,
    }]
  })
}

function requestPath(pathname: string, query?: URLSearchParams) {
  const encodedQuery = query?.toString() ?? ''
  return {
    pathname,
    signedPath: `${pathname}${encodedQuery}`,
    urlPath: encodedQuery ? `${pathname}?${encodedQuery}` : pathname,
  }
}

function getCoupangHeaders(
  method: string,
  path: string,
  credentials: CoupangCredentials,
) {
  return {
    Authorization: getAuthHeader(method, path, credentials),
    'Content-Type': 'application/json',
    'X-Requested-By': credentials.vendorId,
    'X-MARKET': 'KR',
  }
}

export async function fetchCoupangProductSnapshots(
  credentials: CoupangCredentials,
): Promise<ChannelProductSnapshot[]> {
  const sellerProductIds: string[] = []
  let nextToken = ''

  do {
    const params = new URLSearchParams({
      maxPerPage: '100',
      vendorId: credentials.vendorId,
    })
    if (nextToken) params.set('nextToken', nextToken)
    const path = requestPath('/v2/providers/seller_api/apis/api/v1/marketplace/seller-products', params)
    const res = await fetch(`${BASE_URL}${path.urlPath}`, {
      method: 'GET',
      headers: getCoupangHeaders('GET', path.signedPath, credentials),
    })
    if (!res.ok) throw new Error(`쿠팡 상품 목록 조회 실패: ${res.status}`)
    const response = asRecord(await res.json())
    const items = Array.isArray(response.data) ? response.data as CoupangSellerProductListItem[] : []
    sellerProductIds.push(...items.flatMap((item) => {
      const id = item.sellerProductId
      return typeof id === 'string' || typeof id === 'number' ? [String(id)] : []
    }))
    nextToken = typeof response.nextToken === 'string' ? response.nextToken : ''
  } while (nextToken)

  const details = await mapWithConcurrency(sellerProductIds, 4, async (sellerProductId) => {
    const path = `/v2/providers/seller_api/apis/api/v1/marketplace/seller-products/${sellerProductId}`
    const res = await fetch(`${BASE_URL}${path}`, {
      method: 'GET',
      headers: getCoupangHeaders('GET', path, credentials),
    })
    if (!res.ok) throw new Error(`쿠팡 상품 상세 조회 실패: ${res.status}`)
    const response = asRecord(await res.json())
    return asRecord(response.data)
  })

  const vendorItemIds = details.flatMap((product) => (Array.isArray(product.items) ? product.items : []).flatMap((item) => {
    const value = asRecord(item).vendorItemId
    return typeof value === 'string' || typeof value === 'number' ? [String(value)] : []
  }))
  const inventories = await mapWithConcurrency(vendorItemIds, 4, async (vendorItemId) => {
    const path = `/v2/providers/seller_api/apis/api/v1/marketplace/vendor-items/${vendorItemId}/inventories`
    const res = await fetch(`${BASE_URL}${path}`, { method: 'GET', headers: getCoupangHeaders('GET', path, credentials) })
    if (!res.ok) throw new Error(`쿠팡 상품 재고 조회 실패: ${res.status}`)
    const response = asRecord(await res.json())
    return [vendorItemId, asRecord(response.data)] as const
  })

  const inventoryByVendorItemId = new Map(inventories)
  return details.flatMap((detail) => normalizeCoupangProduct(detail, inventoryByVendorItemId))
}

function generateHmacSignature(
  method: string,
  path: string,
  datetime: string,
  secretKey: string,
): string {
  const message = `${datetime}${method}${path}`
  return crypto.createHmac('sha256', secretKey).update(message).digest('hex')
}

function getAuthHeader(
  method: string,
  path: string,
  credentials: Pick<CoupangCredentials, 'accessKey' | 'secretKey'>,
): string {
  const datetime = new Date()
    .toISOString()
    .replace(/[-:]/g, '')
    .replace(/\.\d{3}/, '')
    .slice(2)

  const signature = generateHmacSignature(method, path, datetime, credentials.secretKey)

  return `CEA algorithm=HmacSHA256, access-key=${credentials.accessKey}, signed-date=${datetime}, signature=${signature}`
}

function parseDateOnly(value?: string) {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return null
  }

  const date = new Date(`${value}T00:00:00.000Z`)
  return Number.isNaN(date.getTime()) ? null : date
}

function formatDateOnly(date: Date) {
  return date.toISOString().slice(0, 10)
}

function getCurrentKstDate() {
  return formatDateOnly(new Date(Date.now() + 9 * 60 * 60 * 1000))
}

function normalizeDateRange(input?: { fromDate?: string; toDate?: string }) {
  const today = parseDateOnly(getCurrentKstDate()) ?? new Date()
  const fallbackFrom = new Date(today.getTime() - 6 * MS_PER_DAY)

  let fromDate = parseDateOnly(input?.fromDate) ?? fallbackFrom
  let toDate = parseDateOnly(input?.toDate) ?? today

  if (fromDate.getTime() > toDate.getTime()) {
    ;[fromDate, toDate] = [toDate, fromDate]
  }

  const maxToDate = new Date(fromDate.getTime() + (MAX_COUPANG_RANGE_DAYS - 1) * MS_PER_DAY)
  if (toDate.getTime() > maxToDate.getTime()) {
    toDate = maxToDate
  }

  return {
    fromDate: formatDateOnly(fromDate),
    toDate: formatDateOnly(toDate),
  }
}

function formatCoupangDateParam(date: string) {
  return `${date}+09:00`
}

function mapOrderSheet(order: {
  shipmentBoxId: number
  orderId: number
  orderedAt: string
  status: string
  receiver?: {
    name?: string
    addr1?: string
    addr2?: string
  }
  orderItems?: Array<{
    vendorItemId?: number
    vendorItemName?: string
    shippingCount?: number
    externalVendorSkuCode?: string
    sellerProductId?: number | string
    holdCountForCancel?: number
    cancelCount?: number
  }>
}): CoupangOrderSheet {
  return {
    shipmentBoxId: order.shipmentBoxId,
    orderId: order.orderId,
    orderedAt: order.orderedAt,
    status: order.status,
    receiver: {
      name: order.receiver?.name ?? '',
      addr1: order.receiver?.addr1 ?? '',
      addr2: order.receiver?.addr2 ?? '',
    },
    orderItems: (order.orderItems ?? []).flatMap((item) => {
      const shippingCount = Math.max(0, (item.shippingCount ?? 0) - (item.holdCountForCancel ?? 0) - (item.cancelCount ?? 0))
      return shippingCount === 0 ? [] : [{
        vendorItemId: item.vendorItemId ?? 0,
        vendorItemName: item.vendorItemName ?? '',
        shippingCount,
        sellerSku: item.externalVendorSkuCode ?? null,
        externalProductId: item.sellerProductId === undefined ? null : String(item.sellerProductId),
      }]
    }),
  }
}

export async function fetchCoupangPendingOrders(
  credentials: CoupangCredentials,
  input?: { fromDate?: string; toDate?: string },
): Promise<CoupangOrderSheet[]> {
  const { fromDate, toDate } = normalizeDateRange(input)
  const orders: CoupangOrderSheet[] = []

  let nextToken = ''

  do {
    const params = new URLSearchParams({
      createdAtFrom: formatCoupangDateParam(fromDate),
      createdAtTo: formatCoupangDateParam(toDate),
      status: 'INSTRUCT',
      maxPerPage: '50',
    })

    if (nextToken) {
      params.set('nextToken', nextToken)
    }

    const path = requestPath(`/v2/providers/openapi/apis/api/v5/vendors/${credentials.vendorId}/ordersheets`, params)
    const authorization = getAuthHeader('GET', path.signedPath, credentials)

    const res = await fetch(`${BASE_URL}${path.urlPath}`, {
      method: 'GET',
      headers: {
        Authorization: authorization,
        'Content-Type': 'application/json',
      },
    })

    if (!res.ok) {
      throw new Error(`쿠팡 주문 조회 실패: ${res.status}`)
    }

    const data = await res.json()
    const pageOrders = Array.isArray(data.data) ? data.data : []
    orders.push(...pageOrders.map(mapOrderSheet))
    nextToken = typeof data.nextToken === 'string' ? data.nextToken : ''
  } while (nextToken)

  return orders
}

export async function confirmCoupangShipments(
  shipments: {
    shipmentBoxId: number
    orderId: number
    vendorItemIds: number[]
    trackingNumber: string
  }[],
  credentials: CoupangCredentials,
): Promise<{ success: boolean; failedBoxes: number[]; error?: string }> {
  const path = `/v2/providers/openapi/apis/api/v4/vendors/${credentials.vendorId}/orders/invoices`
  const refreshedOrders = await mapWithConcurrency([...new Set(shipments.map((shipment) => shipment.orderId))], 4, async (orderId) => {
    const detailPath = `/v2/providers/openapi/apis/api/v5/vendors/${credentials.vendorId}/${orderId}/ordersheets`
    const res = await fetch(`${BASE_URL}${detailPath}`, { method: 'GET', headers: getCoupangHeaders('GET', detailPath, credentials) })
    if (!res.ok) return [orderId, null] as const
    const response = asRecord(await res.json())
    return [orderId, mapOrderSheet(asRecord(response.data) as Parameters<typeof mapOrderSheet>[0])] as const
  })
  const refreshedByOrderId = new Map(refreshedOrders)
  const invalidBoxes = new Set<number>()
  const validShipments = shipments.flatMap((shipment) => {
    const refreshed = refreshedByOrderId.get(shipment.orderId)
    if (!refreshed || isCancelledOrder(refreshed.status)) {
      invalidBoxes.add(shipment.shipmentBoxId)
      return []
    }
    const itemById = new Map(refreshed.orderItems.map((item) => [item.vendorItemId, item]))
    const vendorItemIds = shipment.vendorItemIds.filter((vendorItemId) => itemById.has(vendorItemId))
    if (vendorItemIds.length !== shipment.vendorItemIds.length) {
      invalidBoxes.add(shipment.shipmentBoxId)
      return []
    }
    return [{ ...shipment, shipmentBoxId: refreshed.shipmentBoxId || shipment.shipmentBoxId, vendorItemIds }]
  })
  if (validShipments.length === 0) return { success: false, failedBoxes: [...invalidBoxes], error: '쿠팡 주문 상태를 다시 확인해 주세요.' }

  const authorization = getAuthHeader('POST', path, credentials)
  const requestBody = {
    vendorId: credentials.vendorId,
    orderSheetInvoiceApplyDtos: validShipments.flatMap((shipment) =>
      shipment.vendorItemIds.map((vendorItemId) => ({
        shipmentBoxId: shipment.shipmentBoxId,
        orderId: shipment.orderId,
        vendorItemId,
        deliveryCompanyCode: credentials.defaultDeliveryCompanyCode,
        invoiceNumber: shipment.trackingNumber,
        splitShipping: false,
        preSplitShipped: false,
        estimatedShippingDate: '',
      })),
    ),
  }

  const res = await fetch(`${BASE_URL}${path}`, {
    method: 'POST',
    headers: {
      Authorization: authorization,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(requestBody),
  })

  if (!res.ok) {
    throw new Error(`쿠팡 발송 처리 실패: ${res.status}`)
  }

  const data = await res.json()
  const responseList: Array<{ succeed?: boolean; shipmentBoxId?: number }> =
    Array.isArray(data.data?.responseList) ? data.data.responseList : []
  const failedBoxes = [...new Set(
    responseList
      .filter((item: { succeed?: boolean }) => item.succeed === false)
      .flatMap((item) => typeof item.shipmentBoxId === 'number' ? [item.shipmentBoxId] : []),
  )]
  const responseCode = typeof data.data?.responseCode === 'number' ? data.data.responseCode : 99
  const failed = [...new Set([...invalidBoxes, ...failedBoxes])]

  return {
    success: responseCode === 0 && failed.length === 0,
    failedBoxes: failed,
    error: responseCode === 0 && failed.length === 0 ? undefined : '쿠팡 발송 처리에 실패했습니다.',
  }
}

function isCancelledOrder(status: string) {
  return /CANCEL|CANCELED|CANCELLED|취소/i.test(status)
}

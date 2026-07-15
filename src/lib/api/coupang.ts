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
  shipmentBoxId: string
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

function asShipmentBoxId(value: unknown): string | null {
  if (typeof value === 'string') return /^\d+$/.test(value) ? value : null
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= 0 ? String(value) : null
}

async function readCoupangJson(response: { text?: () => Promise<string>; json: () => Promise<unknown> }): Promise<unknown> {
  if (typeof response.text !== 'function') return response.json()
  const body = await response.text()
  return JSON.parse(body.replace(/("shipmentBoxId"\s*:\s*)(0|[1-9]\d*)(?=\s*[,}])/g, '$1"$2"'))
}

function serializeInvoiceRequest(value: unknown): string {
  return JSON.stringify(value).replace(/("shipmentBoxId":)"(\d+)"/g, '$1$2')
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

function mapOrderSheet(order: unknown): CoupangOrderSheet | null {
  const raw = asRecord(order)
  const shipmentBoxId = asShipmentBoxId(raw.shipmentBoxId)
  if (!shipmentBoxId) return null
  const receiver = asRecord(raw.receiver)
  const orderItems = Array.isArray(raw.orderItems) ? raw.orderItems : []
  return {
    shipmentBoxId,
    orderId: asNumber(raw.orderId) ?? 0,
    orderedAt: asString(raw.orderedAt) ?? '',
    status: asString(raw.status) ?? '',
    receiver: {
      name: asString(receiver.name) ?? '',
      addr1: asString(receiver.addr1) ?? '',
      addr2: asString(receiver.addr2) ?? '',
    },
    orderItems: orderItems.flatMap((value) => {
      const item = asRecord(value)
      const shippingCount = Math.max(0, (asNumber(item.shippingCount) ?? 0) - (asNumber(item.holdCountForCancel) ?? 0) - (asNumber(item.cancelCount) ?? 0))
      return shippingCount === 0 ? [] : [{
        vendorItemId: asNumber(item.vendorItemId) ?? 0,
        vendorItemName: asString(item.vendorItemName) ?? '',
        shippingCount: Math.trunc(shippingCount),
        sellerSku: asString(item.externalVendorSkuCode),
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

    const data = asRecord(await readCoupangJson(res))
    const pageOrders = Array.isArray(data.data) ? data.data : []
    orders.push(...pageOrders.flatMap((order) => {
      const mapped = mapOrderSheet(order)
      return mapped ? [mapped] : []
    }))
    nextToken = typeof data.nextToken === 'string' ? data.nextToken : ''
  } while (nextToken)

  return orders
}

export async function confirmCoupangShipments(
  shipments: {
    shipmentBoxId: string
    orderId: number
    vendorItemIds: number[]
    trackingNumber: string
  }[],
  credentials: CoupangCredentials,
): Promise<{ success: boolean; failedBoxes: string[]; error?: string }> {
  const path = `/v2/providers/openapi/apis/api/v4/vendors/${credentials.vendorId}/orders/invoices`
  const refreshedOrders = await mapWithConcurrency([...new Set(shipments.map((shipment) => shipment.orderId))], 4, async (orderId) => {
    const detailPath = `/v2/providers/openapi/apis/api/v5/vendors/${credentials.vendorId}/${orderId}/ordersheets`
    const res = await fetch(`${BASE_URL}${detailPath}`, { method: 'GET', headers: getCoupangHeaders('GET', detailPath, credentials) })
    if (!res.ok) return [orderId, null] as const
    const response = asRecord(await readCoupangJson(res))
    const orderSheets = Array.isArray(response.data)
      ? response.data.flatMap((orderSheet) => {
        const mapped = mapOrderSheet(orderSheet)
        return mapped ? [mapped] : []
      })
      : []
    return [orderId, orderSheets] as const
  })
  const refreshedByOrderId = new Map(refreshedOrders)
  const invalidBoxes = new Set<string>()
  const validShipments = shipments.flatMap((shipment) => {
    const refreshed = refreshedByOrderId.get(shipment.orderId)?.find((orderSheet) =>
      orderSheet.orderId === shipment.orderId
      && shipment.vendorItemIds.every((vendorItemId) => orderSheet.orderItems.some((item) => item.vendorItemId === vendorItemId)),
    )
    if (!refreshed || refreshed.status !== 'INSTRUCT') {
      invalidBoxes.add(shipment.shipmentBoxId)
      return []
    }
    const itemById = new Map(refreshed.orderItems.map((item) => [item.vendorItemId, item]))
    const vendorItemIds = shipment.vendorItemIds.filter((vendorItemId) => itemById.has(vendorItemId))
    if (vendorItemIds.length !== shipment.vendorItemIds.length) {
      invalidBoxes.add(shipment.shipmentBoxId)
      return []
    }
    return [{ ...shipment, shipmentBoxId: refreshed.shipmentBoxId, vendorItemIds }]
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
    body: serializeInvoiceRequest(requestBody),
  })

  if (!res.ok) {
    throw new Error(`쿠팡 발송 처리 실패: ${res.status}`)
  }

  const data = asRecord(await readCoupangJson(res))
  const responseData = asRecord(data.data)
  const responseList: Array<{ succeed?: unknown; shipmentBoxId?: unknown }> =
    Array.isArray(responseData.responseList) ? responseData.responseList.map(asRecord) : []
  const failedBoxes = [...new Set(
    responseList
      .filter((item) => item.succeed === false)
      .flatMap((item) => {
        const shipmentBoxId = asShipmentBoxId(item.shipmentBoxId)
        return shipmentBoxId ? [shipmentBoxId] : []
      }),
  )]
  const responseCode = asNumber(responseData.responseCode) ?? 99
  const failed = [...new Set([...invalidBoxes, ...failedBoxes])]

  return {
    success: responseCode === 0 && failed.length === 0,
    failedBoxes: failed,
    error: responseCode === 0 && failed.length === 0 ? undefined : '쿠팡 발송 처리에 실패했습니다.',
  }
}

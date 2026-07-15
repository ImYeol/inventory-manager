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

function normalizeCoupangProduct(product: unknown): ChannelProductSnapshot[] {
  const raw = asRecord(product)
  const sellerProductId = asString(raw.sellerProductId) ?? String(raw.sellerProductId ?? '')
  if (!sellerProductId) return []

  const vendorItems = Array.isArray(raw.vendorItems) ? raw.vendorItems : []
  return vendorItems.flatMap((vendorItem) => {
    const item = asRecord(vendorItem)
    const vendorItemId = asString(item.vendorItemId) ?? String(item.vendorItemId ?? '')
    if (!vendorItemId) return []
    const approvalStatus = asString(item.approvalStatus ?? raw.status ?? raw.statusName)
    const onSale = item.onSale === true
    const stockQuantity = asNumber(item.amountInStock)
    const listingStatus = approvalStatus === 'PENDING'
      ? 'approval-pending' as const
      : onSale && stockQuantity === 0
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
      optionName: asString(item.vendorItemName ?? item.itemName),
      listingStatus,
      stockQuantity,
      price: asNumber(item.salePrice ?? item.price),
      imageUrl: asString(item.mainImage ?? raw.imageUrl),
      rawAttributes: raw,
    }]
  })
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
    const path = `/v2/providers/seller_api/apis/api/v1/marketplace/seller-products?${params.toString()}`
    const res = await fetch(`${BASE_URL}${path}`, {
      method: 'GET',
      headers: getCoupangHeaders('GET', path, credentials),
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
    return normalizeCoupangProduct(response.data)
  })

  return details.flat()
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
    .replace('T', 'T')

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
    externalVendorSku?: string
    sellerProductId?: number | string
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
    orderItems: (order.orderItems ?? []).map((item) => ({
      vendorItemId: item.vendorItemId ?? 0,
      vendorItemName: item.vendorItemName ?? '',
      shippingCount: item.shippingCount ?? 0,
      sellerSku: item.externalVendorSku ?? null,
      externalProductId: item.sellerProductId === undefined ? null : String(item.sellerProductId),
    })),
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

    const path = `/v2/providers/openapi/apis/api/v5/vendors/${credentials.vendorId}/ordersheets?${params.toString()}`
    const authorization = getAuthHeader('GET', path, credentials)

    const res = await fetch(`${BASE_URL}${path}`, {
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
  const authorization = getAuthHeader('POST', path, credentials)
  const requestBody = {
    vendorId: credentials.vendorId,
    orderSheetInvoiceApplyDtos: shipments.flatMap((shipment) =>
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
  const responseMessage =
    typeof data.data?.responseMessage === 'string' && data.data.responseMessage.length > 0
      ? data.data.responseMessage
      : undefined

  return {
    success: responseCode === 0 && failedBoxes.length === 0,
    failedBoxes,
    error: responseCode === 0 ? undefined : responseMessage,
  }
}

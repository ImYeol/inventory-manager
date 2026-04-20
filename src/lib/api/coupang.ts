// 쿠팡 오픈 API 헬퍼 (서버 전용)
// 참고: https://developers.coupangcorp.com/

import crypto from 'crypto'

import type { CoupangCredentials } from '../shipping-credentials'

const BASE_URL = 'https://api-gateway.coupang.com'
const MAX_COUPANG_RANGE_DAYS = 31
const MS_PER_DAY = 24 * 60 * 60 * 1000

export type CoupangOrderItem = {
  vendorItemId: number
  vendorItemName: string
  shippingCount: number
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
      const text = await res.text()
      throw new Error(`쿠팡 주문 조회 실패: ${res.status} ${text}`)
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
    const text = await res.text()
    throw new Error(`쿠팡 발송 처리 실패: ${res.status} ${text}`)
  }

  const data = await res.json()
  const responseList = Array.isArray(data.data?.responseList) ? data.data.responseList : []
  const failedBoxes = [...new Set(
    responseList
      .filter((item: { succeed?: boolean }) => item.succeed === false)
      .map((item: { shipmentBoxId: number }) => item.shipmentBoxId),
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

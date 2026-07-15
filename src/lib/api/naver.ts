// 네이버 커머스 API 헬퍼 (서버 전용)
// 참고: https://apicenter.commerce.naver.com/ko/basic/commerce-api

import bcrypt from 'bcryptjs';

import type { ChannelProductSnapshot } from '../channel-products';
import type { NaverCredentials } from '../shipping-credentials';

const BASE_URL = 'https://api.commerce.naver.com/external';

export type NaverOrder = {
  productOrderId: string;
  orderId: string;
  productName: string;
  recipientName: string;
  recipientAddress: string;
  quantity: number;
  orderDate: string;
  productOrderStatus: string;
  sellerSku?: string | null;
  externalProductId?: string | null;
  externalVariantId?: string | null;
};

async function getAccessToken(credentials: NaverCredentials): Promise<string> {
  const clientId = credentials.clientId;
  const clientSecret = credentials.clientSecret;

  // Naver Commerce OAuth uses bcrypt(clientId_timestamp, clientSecret), then Base64.
  const timestamp = Date.now();
  const password = `${clientId}_${timestamp}`;
  const signature = Buffer.from(bcrypt.hashSync(password, clientSecret)).toString('base64');

  const params = new URLSearchParams({
    client_id: clientId,
    timestamp: String(timestamp),
    client_secret_sign: signature,
    grant_type: 'client_credentials',
    type: 'SELF',
  });

  const res = await fetch(`${BASE_URL}/v1/oauth2/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params.toString(),
  });

  if (!res.ok) {
    throw new Error(`네이버 인증 실패: ${res.status}`);
  }

  const data = await res.json();
  return data.access_token;
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {}
}

function asString(value: unknown): string | null {
  return typeof value === 'string' && value.length > 0 ? value : null
}

function asIdentifier(value: unknown): string | null {
  return asString(value) ?? (typeof value === 'number' && Number.isFinite(value) ? String(value) : null)
}

function asNumber(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null
}

function normalizeNaverProduct(product: unknown): ChannelProductSnapshot | null {
  const raw = asRecord(product)
  const originProduct = asRecord(raw.originProduct)
  const channelProduct = asRecord(raw.smartstoreChannelProduct ?? raw.channelProduct)
  const externalProductId = asNumber(originProduct.originProductNo)
  const externalVariantId = asNumber(channelProduct.channelProductNo) ?? externalProductId

  if (externalProductId === null || externalVariantId === null) return null

  const displayStatus = asString(channelProduct.channelProductDisplayStatusType)
  const status = asString(originProduct.statusType)
  const isDisplayed = !displayStatus || ['ON', 'ACTIVE', 'SALE'].includes(displayStatus)
  const isSellable = !status || ['SALE', 'ON', 'ACTIVE'].includes(status)
  const stockQuantity = asNumber(originProduct.stockQuantity)
  const images = Array.isArray(originProduct.images) ? originProduct.images : []
  const firstImage = asRecord(images[0])

  return {
    channel: 'naver',
    externalProductId: String(externalProductId),
    externalVariantId: String(externalVariantId),
    sellerSku: asString(originProduct.sellerManagementCode),
    productName: asString(originProduct.name),
    optionName: null,
    listingStatus: isDisplayed && isSellable
      ? stockQuantity === 0 ? 'sold-out' : 'active'
      : 'paused',
    stockQuantity,
    price: asNumber(originProduct.salePrice ?? originProduct.price),
    imageUrl: asString(firstImage.url ?? firstImage.imageUrl),
    rawAttributes: raw,
  }
}

export async function fetchNaverProductSnapshots(
  credentials: NaverCredentials,
): Promise<ChannelProductSnapshot[]> {
  const token = await getAccessToken(credentials)
  const snapshots: ChannelProductSnapshot[] = []
  let page = 1
  let totalPages = 1

  while (page <= totalPages) {
    const res = await fetch(`${BASE_URL}/v1/products/search`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ page, size: 500 }),
    })

    if (!res.ok) throw new Error(`네이버 상품 조회 실패: ${res.status}`)

    const data = asRecord(await res.json())
    const payload = asRecord(data.data)
    const contents = Array.isArray(payload.contents) ? payload.contents : []
    snapshots.push(...contents.map(normalizeNaverProduct).filter((item): item is ChannelProductSnapshot => item !== null))

    const pagination = asRecord(payload.pagination)
    const nextTotalPages = asNumber(pagination.totalPages)
    totalPages = nextTotalPages ?? (contents.length === 500 ? page + 1 : page)
    page += 1
  }

  return snapshots
}

// 미발송 주문 조회 (PAYED 상태)
export async function fetchNaverPendingOrders(
  credentials: NaverCredentials
): Promise<NaverOrder[]> {
  const token = await getAccessToken(credentials);

  // 최근 7일간 주문 조회
  const now = new Date();
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  const productOrderIds = new Set<string>();
  let moreFrom: string | null = null;
  let moreSequence: string | null = null;

  do {
    const params = new URLSearchParams({
      lastChangedFrom: moreFrom ?? weekAgo.toISOString(),
      lastChangedTo: now.toISOString(),
      lastChangedType: 'PAYED',
      limitCount: '300',
    });
    if (moreSequence) params.set('moreSequence', moreSequence);

    const res = await fetch(
      `${BASE_URL}/v1/pay-order/seller/product-orders/last-changed-statuses?${params.toString()}`,
      {
        method: 'GET',
        headers: { Authorization: `Bearer ${token}` },
      }
    );

    if (!res.ok) {
      throw new Error(`네이버 주문 조회 실패: ${res.status}`);
    }

    const payload = asRecord(asRecord(await res.json()).data);
    const statuses = Array.isArray(payload.lastChangeStatuses) ? payload.lastChangeStatuses : [];
    for (const status of statuses) {
      const productOrderId = asString(asRecord(status).productOrderId);
      if (productOrderId) productOrderIds.add(productOrderId);
    }

    const more = asRecord(payload.more);
    moreFrom = asString(more.moreFrom);
    moreSequence = asString(more.moreSequence);
  } while (moreFrom && moreSequence);

  if (productOrderIds.size === 0) return [];

  const detailedOrders: Record<string, unknown>[] = [];
  const ids = [...productOrderIds];
  for (let index = 0; index < ids.length; index += 300) {
    const detailRes = await fetch(
      `${BASE_URL}/v1/pay-order/seller/product-orders/query`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ productOrderIds: ids.slice(index, index + 300) }),
      }
    );

    if (!detailRes.ok) {
      throw new Error(`네이버 주문 상세 조회 실패: ${detailRes.status}`);
    }

    const data = asRecord(await detailRes.json());
    const orders = Array.isArray(data.data) ? data.data : [];
    detailedOrders.push(...orders.map(asRecord));
  }

  return detailedOrders
    .filter((order) => asString(order.productOrderStatus) === 'PAYED')
    .map((order) => {
      const shippingAddress = asRecord(order.shippingAddress);
      const productOrderId = asString(order.productOrderId) ?? '';
      return {
        productOrderId,
        orderId: asString(order.orderId) ?? '',
        productName: asString(order.productName) ?? '',
        recipientName: asString(shippingAddress.name) ?? '',
        recipientAddress: `${asString(shippingAddress.baseAddress) ?? ''} ${asString(shippingAddress.detailAddress) ?? ''}`.trim(),
        quantity: asNumber(order.quantity) ?? 0,
        orderDate: asString(order.orderDate) ?? '',
        productOrderStatus: asString(order.productOrderStatus) ?? '',
        sellerSku: asString(order.sellerManagementCode) ?? asString(order.productSellerCode),
        externalProductId: asIdentifier(order.productId) ?? asIdentifier(order.originProductNo),
        externalVariantId: asIdentifier(order.channelProductId) ?? productOrderId,
      };
    });
}

// 운송장 발송 처리
export async function dispatchNaverOrders(
  dispatches: {
    productOrderId: string;
    trackingNumber: string;
    deliveryCompanyCode?: string;
  }[],
  credentials: NaverCredentials
): Promise<{ success: boolean; failedOrders: string[] }> {
  const token = await getAccessToken(credentials);

  const failedOrders: string[] = [];

  // 건별 처리 (API 안정성을 위해 순차 처리)
  for (const dispatch of dispatches) {
    try {
      const res = await fetch(
        `${BASE_URL}/v1/pay-order/seller/product-orders/dispatch`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            dispatchProductOrders: [
              {
                productOrderId: dispatch.productOrderId,
                deliveryMethod: 'DELIVERY',
                deliveryCompanyCode: dispatch.deliveryCompanyCode ?? 'CJGLS',
                trackingNumber: dispatch.trackingNumber,
                dispatchDate: new Date().toISOString(),
              },
            ],
          }),
        }
      );

      if (!res.ok) {
        failedOrders.push(dispatch.productOrderId);
      }
    } catch {
      failedOrders.push(dispatch.productOrderId);
    }
  }

  return {
    success: failedOrders.length === 0,
    failedOrders,
  };
}

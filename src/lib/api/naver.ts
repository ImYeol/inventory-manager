// 네이버 커머스 API 헬퍼 (서버 전용)
// 참고: https://apicenter.commerce.naver.com/ko/basic/commerce-api

import crypto from 'crypto';

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
};

async function getAccessToken(credentials: NaverCredentials): Promise<string> {
  const clientId = credentials.clientId;
  const clientSecret = credentials.clientSecret;

  // bcrypt 타입 시그니처 생성
  const timestamp = Date.now();
  const password = `${clientId}_${timestamp}`;
  const signature = crypto
    .createHmac('sha256', clientSecret)
    .update(password)
    .digest('base64');

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
    const text = await res.text();
    throw new Error(`네이버 인증 실패: ${res.status} ${text}`);
  }

  const data = await res.json();
  return data.access_token;
}

// 미발송 주문 조회 (PAYED 상태)
export async function fetchNaverPendingOrders(
  credentials: NaverCredentials
): Promise<NaverOrder[]> {
  const token = await getAccessToken(credentials);

  // 최근 7일간 주문 조회
  const now = new Date();
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  const body = {
    lastChangedFrom: weekAgo.toISOString(),
    lastChangedTo: now.toISOString(),
    lastChangedType: 'PAYED',
  };

  const res = await fetch(
    `${BASE_URL}/v1/pay-order/seller/product-orders/last-changed-statuses`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    }
  );

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`네이버 주문 조회 실패: ${res.status} ${text}`);
  }

  const data = await res.json();
  const productOrderIds: string[] = (data.data?.lastChangeStatuses ?? []).map(
    (s: { productOrderId: string }) => s.productOrderId
  );

  if (productOrderIds.length === 0) return [];

  // 주문 상세 조회
  const detailRes = await fetch(
    `${BASE_URL}/v1/pay-order/seller/product-orders/query`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ productOrderIds }),
    }
  );

  if (!detailRes.ok) {
    const text = await detailRes.text();
    throw new Error(`네이버 주문 상세 조회 실패: ${detailRes.status} ${text}`);
  }

  const detailData = await detailRes.json();
  return (detailData.data ?? []).map(
    (order: {
      productOrderId: string;
      orderId: string;
      productName: string;
      shippingAddress: {
        name: string;
        baseAddress: string;
        detailAddress: string;
      };
      quantity: number;
      orderDate: string;
      productOrderStatus: string;
    }) => ({
      productOrderId: order.productOrderId,
      orderId: order.orderId,
      productName: order.productName,
      recipientName: order.shippingAddress?.name ?? '',
      recipientAddress: `${order.shippingAddress?.baseAddress ?? ''} ${order.shippingAddress?.detailAddress ?? ''}`.trim(),
      quantity: order.quantity,
      orderDate: order.orderDate,
      productOrderStatus: order.productOrderStatus,
    })
  );
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

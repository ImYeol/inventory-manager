// 쿠팡 오픈 API 헬퍼 (서버 전용)
// 참고: https://developers.coupangcorp.com/

import crypto from 'crypto';

const BASE_URL = 'https://api-gateway.coupang.com';

export type CoupangOrder = {
  shipmentBoxId: number;
  orderId: number;
  receiverName: string;
  receiverAddr: string;
  productName: string;
  quantity: number;
  orderDate: string;
  status: string;
};

function generateHmacSignature(
  method: string,
  path: string,
  datetime: string,
  secretKey: string
): string {
  const message = `${datetime}${method}${path}`;
  return crypto
    .createHmac('sha256', secretKey)
    .update(message)
    .digest('hex');
}

function getAuthHeader(method: string, path: string): string {
  const accessKey = process.env.COUPANG_ACCESS_KEY;
  const secretKey = process.env.COUPANG_SECRET_KEY;

  if (!accessKey || !secretKey) {
    throw new Error('COUPANG_ACCESS_KEY와 COUPANG_SECRET_KEY 환경변수를 설정해주세요.');
  }

  const datetime = new Date()
    .toISOString()
    .replace(/[-:]/g, '')
    .replace(/\.\d{3}/, '')
    .replace('T', 'T');

  const signature = generateHmacSignature(method, path, datetime, secretKey);

  return `CEA algorithm=HmacSHA256, access-key=${accessKey}, signed-date=${datetime}, signature=${signature}`;
}

// 미발송 주문 조회
export async function fetchCoupangPendingOrders(): Promise<CoupangOrder[]> {
  const vendorId = process.env.COUPANG_VENDOR_ID;
  if (!vendorId) {
    throw new Error('COUPANG_VENDOR_ID 환경변수를 설정해주세요.');
  }

  const now = new Date();
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  const createdAtFrom = weekAgo.toISOString().slice(0, 10);
  const createdAtTo = now.toISOString().slice(0, 10);

  const path = `/v2/providers/openapi/apis/api/v4/vendors/${vendorId}/ordersheets?createdAtFrom=${createdAtFrom}&createdAtTo=${createdAtTo}&status=ACCEPT`;

  const authorization = getAuthHeader('GET', path);

  const res = await fetch(`${BASE_URL}${path}`, {
    method: 'GET',
    headers: {
      Authorization: authorization,
      'Content-Type': 'application/json',
    },
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`쿠팡 주문 조회 실패: ${res.status} ${text}`);
  }

  const data = await res.json();
  return (data.data ?? []).map(
    (order: {
      shipmentBoxId: number;
      orderId: number;
      receiver: { name: string; addr1: string; addr2: string };
      items?: { vendorItemName: string; shippingCount: number }[];
      orderedAt: string;
      status: string;
    }) => ({
      shipmentBoxId: order.shipmentBoxId,
      orderId: order.orderId,
      receiverName: order.receiver?.name ?? '',
      receiverAddr: `${order.receiver?.addr1 ?? ''} ${order.receiver?.addr2 ?? ''}`.trim(),
      productName: order.items?.[0]?.vendorItemName ?? '',
      quantity: order.items?.[0]?.shippingCount ?? 1,
      orderDate: order.orderedAt,
      status: order.status,
    })
  );
}

// 배송 확인 (운송장 전송)
export async function confirmCoupangShipments(
  shipments: {
    shipmentBoxId: number;
    trackingNumber: string;
    deliveryCompanyCode?: string;
  }[]
): Promise<{ success: boolean; failedBoxes: number[] }> {
  const vendorId = process.env.COUPANG_VENDOR_ID;
  if (!vendorId) {
    throw new Error('COUPANG_VENDOR_ID 환경변수를 설정해주세요.');
  }

  const failedBoxes: number[] = [];

  for (const shipment of shipments) {
    try {
      const path = `/v2/providers/openapi/apis/api/v4/vendors/${vendorId}/ordersheets/${shipment.shipmentBoxId}/shipments`;
      const authorization = getAuthHeader('PUT', path);

      const res = await fetch(`${BASE_URL}${path}`, {
        method: 'PUT',
        headers: {
          Authorization: authorization,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          vendorId,
          shipmentBoxId: shipment.shipmentBoxId,
          deliveryCompanyCode: shipment.deliveryCompanyCode ?? 'CJGLS',
          invoiceNumber: shipment.trackingNumber,
        }),
      });

      if (!res.ok) {
        failedBoxes.push(shipment.shipmentBoxId);
      }
    } catch {
      failedBoxes.push(shipment.shipmentBoxId);
    }
  }

  return {
    success: failedBoxes.length === 0,
    failedBoxes,
  };
}

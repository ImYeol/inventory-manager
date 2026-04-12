'use server'

import { fetchNaverPendingOrders, dispatchNaverOrders, type NaverOrder } from '../api/naver'
import { fetchCoupangPendingOrders, confirmCoupangShipments, type CoupangOrder } from '../api/coupang'

export type { NaverOrder, CoupangOrder }

export async function fetchNaverOrders(): Promise<{
  success: boolean;
  orders: NaverOrder[];
  error?: string;
}> {
  try {
    const orders = await fetchNaverPendingOrders()
    return { success: true, orders }
  } catch (e) {
    return {
      success: false,
      orders: [],
      error: e instanceof Error ? e.message : '네이버 주문 조회 중 오류 발생',
    }
  }
}

export async function sendNaverTrackingNumbers(
  matches: { productOrderId: string; trackingNumber: string }[]
): Promise<{
  success: boolean;
  failedOrders: string[];
  error?: string;
}> {
  try {
    const result = await dispatchNaverOrders(matches)
    return result
  } catch (e) {
    return {
      success: false,
      failedOrders: matches.map((m) => m.productOrderId),
      error: e instanceof Error ? e.message : '네이버 발송 처리 중 오류 발생',
    }
  }
}

export async function fetchCoupangOrders(): Promise<{
  success: boolean;
  orders: CoupangOrder[];
  error?: string;
}> {
  try {
    const orders = await fetchCoupangPendingOrders()
    return { success: true, orders }
  } catch (e) {
    return {
      success: false,
      orders: [],
      error: e instanceof Error ? e.message : '쿠팡 주문 조회 중 오류 발생',
    }
  }
}

export async function sendCoupangTrackingNumbers(
  matches: { shipmentBoxId: number; trackingNumber: string }[]
): Promise<{
  success: boolean;
  failedBoxes: number[];
  error?: string;
}> {
  try {
    const result = await confirmCoupangShipments(matches)
    return result
  } catch (e) {
    return {
      success: false,
      failedBoxes: matches.map((m) => m.shipmentBoxId),
      error: e instanceof Error ? e.message : '쿠팡 발송 처리 중 오류 발생',
    }
  }
}

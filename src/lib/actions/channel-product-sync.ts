'use server'

import type { ChannelName } from '../channel-products'

/**
 * Legacy compatibility boundary. Full provider catalog snapshots are intentionally
 * unavailable: mappings are created only from operator-entered identifiers.
 */
export async function syncProducts(_channel?: ChannelName): Promise<never> {
  void _channel
  throw new Error('전량 채널 상품 동기화는 더 이상 지원하지 않습니다.')
}

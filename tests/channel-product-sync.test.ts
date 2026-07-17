import { describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  fetchNaverProductSnapshots: vi.fn(),
  fetchCoupangProductSnapshots: vi.fn(),
}))

vi.mock('@/lib/api/naver', () => ({ fetchNaverProductSnapshots: mocks.fetchNaverProductSnapshots }))
vi.mock('@/lib/api/coupang', () => ({ fetchCoupangProductSnapshots: mocks.fetchCoupangProductSnapshots }))

import { syncProducts } from '@/lib/actions/channel-product-sync'

describe('legacy channel product sync', () => {
  it('is unavailable and never reads a provider catalog', async () => {
    await expect(syncProducts()).rejects.toThrow('전량 채널 상품 동기화는 더 이상 지원하지 않습니다.')
    expect(mocks.fetchNaverProductSnapshots).not.toHaveBeenCalled()
    expect(mocks.fetchCoupangProductSnapshots).not.toHaveBeenCalled()
  })
})

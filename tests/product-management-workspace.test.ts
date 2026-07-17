// @vitest-environment jsdom
import React from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'

const mocks = vi.hoisted(() => ({
  refresh: vi.fn(),
  linkVariant: vi.fn(),
  createInternalProduct: vi.fn(),
}))

vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh: mocks.refresh }) }))
vi.mock('@/lib/actions/channel-product-link', () => ({ linkVariant: mocks.linkVariant }))
vi.mock('@/lib/actions/internal-product', () => ({ createInternalProduct: mocks.createInternalProduct }))
vi.mock('@/lib/actions', () => ({
  createWarehouse: vi.fn(), createModel: vi.fn(), createModelSize: vi.fn(), createModelColor: vi.fn(),
  deleteWarehouse: vi.fn(), deleteModel: vi.fn(),
}))

import MasterDataManager from '@/app/(protected)/master-data/MasterDataManager'

const props = {
  models: [{ id: 1, name: 'LP01', sizes: [{ id: 11, name: 'M' }], colors: [{ id: 21, name: '네이비', rgbCode: '#111111', textWhite: true }] }],
  warehouses: [],
  variants: [{ id: 101, modelName: 'LP01', sizeName: 'M', colorName: '네이비', sellerSku: 'LP01-M-NV', available: 8 }],
  channelProductRefs: [
    { id: 501, variantId: 101, channel: 'coupang' as const, externalProductId: 'CP-1', externalVariantId: 'CPV-1', productName: 'LP01', optionName: 'M / 네이비', sellerSku: 'LP01-M-NV', listingStatus: 'active' as const, channelReported: 5, lastSyncedAt: '2026-07-15T03:00:00Z', lastSyncError: null, imageUrl: 'https://example.test/coupang.jpg', price: 25000 },
    { id: 502, variantId: null, channel: 'naver' as const, externalProductId: 'NV-1', externalVariantId: 'NVV-1', productName: 'LP01', optionName: 'M / 네이비', sellerSku: 'LP01-M-NV', listingStatus: 'paused' as const, channelReported: 8, lastSyncedAt: '2026-07-15T02:00:00Z', lastSyncError: '권한 확인 필요', imageUrl: null, price: 24000 },
  ],
}

beforeEach(() => Object.values(mocks).forEach((mock) => mock.mockReset()))

describe('Product management workspace', () => {
  it('renders one ProductVariant table with fixed channel slots and compact views', () => {
    render(React.createElement(MasterDataManager, props))

    expect(screen.getByRole('columnheader', { name: '상품 / 옵션' })).toBeTruthy()
    expect(screen.getByRole('columnheader', { name: '판매자 SKU' })).toBeTruthy()
    expect(screen.getByRole('columnheader', { name: '쿠팡' })).toBeTruthy()
    expect(screen.getByRole('columnheader', { name: '네이버' })).toBeTruthy()
    expect(screen.getByText('쿠팡 · 판매 중')).toBeTruthy()
    expect(screen.getByText('연결 필요')).toBeTruthy()
    expect(screen.getByText('재고 불일치')).toBeTruthy()
    expect(screen.getByText('판매 중지')).toBeTruthy()

    expect(screen.getAllByRole('row', { name: /LP01/ })).toHaveLength(2)
    fireEvent.click(screen.getByText('연결 필요'))
    expect(screen.getAllByText('LP01-M-NV')).toHaveLength(2)
    fireEvent.change(screen.getByRole('textbox', { name: '상품 검색' }), { target: { value: '없는 SKU' } })
    expect(screen.queryAllByText('LP01-M-NV')).toHaveLength(0)
  })

  it('opens one channel detail modal from the badge and links an unlinked ref', async () => {
    mocks.linkVariant.mockResolvedValue({ success: true })
    render(React.createElement(MasterDataManager, props))

    fireEvent.click(screen.getByText('네이버 · 연결 필요'))
    const dialog = screen.getByRole('dialog', { name: '네이버 채널 상품' })
    expect(within(dialog).getByText('NV-1')).toBeTruthy()
    expect(within(dialog).getByText('권한 확인 필요')).toBeTruthy()

    fireEvent.click(within(dialog).getByRole('button', { name: '연결' }))
    await waitFor(() => expect(mocks.linkVariant).toHaveBeenCalledWith(502, 101))
    expect(mocks.refresh).toHaveBeenCalled()
  })

  it('does not request a link until an internal variant is selected', async () => {
    const unmatchedRef = {
      ...props.channelProductRefs[1],
      sellerSku: 'UNMATCHED-SKU',
    }
    render(React.createElement(MasterDataManager, { ...props, channelProductRefs: [props.channelProductRefs[0], unmatchedRef] }))

    fireEvent.click(screen.getByText('네이버 · 연결 필요'))
    const dialog = screen.getByRole('dialog', { name: '네이버 채널 상품' })
    const linkButton = within(dialog).getByRole('button', { name: '연결' }) as HTMLButtonElement

    expect(linkButton.disabled).toBe(true)
    fireEvent.click(linkButton)
    expect(mocks.linkVariant).not.toHaveBeenCalled()
  })

  it('renders the internal SKU empty state and internal product creation preview', () => {
    render(React.createElement(MasterDataManager, { ...props, variants: [], channelProductRefs: [] }))
    expect(screen.getByText(/등록된 내부 판매 옵션이 없습니다/)).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: '내부 상품 등록' }))
    const dialog = screen.getByRole('dialog', { name: '내부 상품 등록' })
    fireEvent.change(within(dialog).getByLabelText(/사이즈/), { target: { value: 'S, M' } })
    fireEvent.change(within(dialog).getByLabelText(/색상/), { target: { value: '블랙' } })
    fireEvent.change(within(dialog).getByLabelText('SKU prefix'), { target: { value: 'LP' } })
    expect(within(dialog).getByText(/판매 옵션 2개 · 예시 LP-S-블랙/)).toBeTruthy()
  })

  it('supports a single-SKU internal product without artificial size or color input', () => {
    render(React.createElement(MasterDataManager, { ...props, variants: [], channelProductRefs: [] }))
    fireEvent.click(screen.getByRole('button', { name: '내부 상품 등록' }))
    const dialog = screen.getByRole('dialog', { name: '내부 상품 등록' })
    fireEvent.change(within(dialog).getByLabelText('SKU prefix'), { target: { value: 'LP01' } })

    expect(within(dialog).getByText(/판매 옵션 1개 · 예시 LP01/)).toBeTruthy()
    expect(within(dialog).getAllByText(/옵션이 없으면 비워두세요/)).toHaveLength(2)
  })

})

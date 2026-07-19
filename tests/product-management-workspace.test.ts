// @vitest-environment jsdom
import React from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'

const mocks = vi.hoisted(() => ({
  refresh: vi.fn(),
  createChannelProductMapping: vi.fn(),
  updateChannelProductMapping: vi.fn(),
  unlinkChannelProductMapping: vi.fn(),
  createInternalProduct: vi.fn(),
  confirmSupplierSkuMapping: vi.fn(),
  reassignSupplierSkuMapping: vi.fn(),
  deactivateSupplierSkuMapping: vi.fn(),
}))

vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh: mocks.refresh }) }))
vi.mock('@/lib/actions/channel-product-link', () => ({
  createChannelProductMapping: mocks.createChannelProductMapping,
  updateChannelProductMapping: mocks.updateChannelProductMapping,
  unlinkChannelProductMapping: mocks.unlinkChannelProductMapping,
}))
vi.mock('@/lib/actions/internal-product', () => ({ createInternalProduct: mocks.createInternalProduct }))
vi.mock('@/lib/actions/supplier-sku-mapping', () => ({
  confirmSupplierSkuMapping: mocks.confirmSupplierSkuMapping,
  reassignSupplierSkuMapping: mocks.reassignSupplierSkuMapping,
  deactivateSupplierSkuMapping: mocks.deactivateSupplierSkuMapping,
}))
vi.mock('@/lib/actions', () => ({
  createWarehouse: vi.fn(), createModel: vi.fn(), createModelSize: vi.fn(), createModelColor: vi.fn(),
  deleteWarehouse: vi.fn(), deleteModel: vi.fn(),
}))

import MasterDataManager from '@/app/(protected)/master-data/MasterDataManager'

const props = {
  models: [{ id: 1, name: 'LP01', sizes: [{ id: 11, name: 'M' }], colors: [{ id: 21, name: '네이비', rgbCode: '#111111', textWhite: true }] }],
  warehouses: [],
  variants: [{ id: 101, modelName: 'LP01', sizeName: 'M', colorName: '네이비', sellerSku: 'LP01-M-NV', onHand: 12, committed: 4, committedByWarehouse: {}, available: 8, incoming: 6, incomingByWarehouse: {} }],
  channelProductRefs: [
    { id: 501, variantId: 101, channel: 'coupang' as const, externalProductId: 'CP-1', externalVariantId: 'CPV-1', productName: 'LP01', optionName: 'M / 네이비', sellerSku: 'LP01-M-NV', listingStatus: 'active' as const, channelReported: 5, lastSyncedAt: '2026-07-15T03:00:00Z', lastSyncError: null, verificationStatus: 'verified' as const, imageUrl: 'https://example.test/coupang.jpg', price: 25000 },
    { id: 502, variantId: 101, channel: 'naver' as const, externalProductId: 'NV-1', externalVariantId: 'NVV-1', productName: 'LP01', optionName: 'M / 네이비', sellerSku: 'LP01-M-NV', listingStatus: 'paused' as const, channelReported: 8, lastSyncedAt: '2026-07-15T02:00:00Z', lastSyncError: '권한 확인 필요', verificationStatus: 'unverified' as const, imageUrl: null, price: 24000 },
  ],
  suppliers: [{ id: 4, name: '한빛 공장' }],
  supplierSkuMappings: [{ id: 701, supplierId: 4, supplierName: '한빛 공장', externalSku: 'FAC-RED-M', normalizedExternalSku: 'FAC-RED-M', productVariantId: 101, isActive: true, deactivatedAt: null, deactivationReason: null, createdAt: '2026-07-18T00:00:00Z' }],
  supplierSkuMappingAudits: [{ id: 801, supplierId: 4, action: 'CONFIRMED', externalSku: 'FAC-RED-M', previousSellerSku: null, newSellerSku: 'LP01-M-NV', reason: null, createdAt: '2026-07-18T00:00:00Z' }],
}

beforeEach(() => Object.values(mocks).forEach((mock) => mock.mockReset()))

describe('Product management workspace', () => {
  it('renders an internal SKU table with inventory summary, mapping counts, and compact filters', () => {
    render(React.createElement(MasterDataManager, props))

    expect(screen.getByRole('columnheader', { name: 'SKU / 옵션' })).toBeTruthy()
    expect(screen.getByRole('columnheader', { name: '재고' })).toBeTruthy()
    expect(screen.getByRole('columnheader', { name: '판매 옵션' })).toBeTruthy()
    expect(screen.getByRole('columnheader', { name: '마지막 보고 / 오류' })).toBeTruthy()
    expect(screen.getByText('12 / 4 / 8 / 6')).toBeTruthy()
    expect(screen.getByText('네이버 1 · 쿠팡 1')).toBeTruthy()
    expect(screen.getByRole('combobox', { name: '채널 필터' })).toBeTruthy()
    expect(screen.getByRole('combobox', { name: '매핑 상태 필터' })).toBeTruthy()
    expect(screen.getByText('1개 SKU')).toBeTruthy()

    fireEvent.change(screen.getByRole('textbox', { name: '상품 검색' }), { target: { value: '없는 SKU' } })
    expect(screen.queryAllByText('LP01-M-NV')).toHaveLength(0)
  })

  it('opens a SKU mapping modal and adds an approved-identifier mapping', async () => {
    mocks.createChannelProductMapping.mockResolvedValue({ success: true })
    render(React.createElement(MasterDataManager, props))

    fireEvent.click(screen.getByRole('button', { name: '상세' }))
    const dialog = screen.getByRole('dialog', { name: 'SKU 매핑' })
    expect(within(dialog).getByText('쿠팡 · 판매 중')).toBeTruthy()
    expect(within(dialog).getByText('권한 확인 필요')).toBeTruthy()

    fireEvent.click(within(dialog).getByRole('button', { name: '매핑 추가' }))
    fireEvent.change(within(dialog).getByLabelText('판매자 SKU'), { target: { value: 'LP01-M-NV' } })
    fireEvent.change(within(dialog).getByLabelText('채널 상품 ID'), { target: { value: 'NV-2' } })
    fireEvent.change(within(dialog).getByLabelText('채널 옵션 ID'), { target: { value: 'NVV-2' } })
    fireEvent.click(within(dialog).getByRole('button', { name: '저장' }))

    await waitFor(() => expect(mocks.createChannelProductMapping).toHaveBeenCalledWith({ variantId: 101, channel: 'naver', sellerSku: 'LP01-M-NV', externalProductId: 'NV-2', externalVariantId: 'NVV-2' }))
    expect(mocks.refresh).toHaveBeenCalled()
  })

  it('edits and unlinks a mapping from its SKU modal', async () => {
    mocks.updateChannelProductMapping.mockResolvedValue({ success: true })
    mocks.unlinkChannelProductMapping.mockResolvedValue({ success: true })
    render(React.createElement(MasterDataManager, props))

    fireEvent.click(screen.getByRole('button', { name: '상세' }))
    const dialog = screen.getByRole('dialog', { name: 'SKU 매핑' })
    fireEvent.click(within(dialog).getAllByRole('button', { name: '수정' })[0])
    fireEvent.change(within(dialog).getByLabelText('채널 옵션 ID'), { target: { value: 'CPV-2' } })
    fireEvent.click(within(dialog).getByRole('button', { name: '저장' }))
    await waitFor(() => expect(mocks.updateChannelProductMapping).toHaveBeenCalledWith(501, expect.objectContaining({ variantId: 101, externalVariantId: 'CPV-2' })))

    fireEvent.click(within(dialog).getAllByRole('button', { name: '해제' })[0])
    await waitFor(() => expect(mocks.unlinkChannelProductMapping).toHaveBeenCalledWith(501))
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

  it('maintains supplier SKU mappings with reassign, deactivate, and visible audit history', async () => {
    mocks.reassignSupplierSkuMapping.mockResolvedValue({ id: 702 })
    mocks.deactivateSupplierSkuMapping.mockResolvedValue(undefined)
    render(React.createElement(MasterDataManager, props))

    fireEvent.mouseDown(screen.getByRole('tab', { name: '공급자 SKU' }))
    fireEvent.click(screen.getByRole('tab', { name: '공급자 SKU' }))
    expect(screen.getByRole('columnheader', { name: '외부 SKU' })).toBeTruthy()
    expect(screen.getByText('FAC-RED-M')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: '관리' }))
    const dialog = screen.getByRole('dialog', { name: '공급자 SKU 관리' })
    expect(within(dialog).getByText('최근 변경 이력')).toBeTruthy()
    expect(within(dialog).getByText('연결')).toBeTruthy()

    fireEvent.click(within(dialog).getByRole('button', { name: '재지정' }))
    fireEvent.change(within(dialog).getByLabelText('재지정 사유'), { target: { value: '잘못된 옵션 수정' } })
    fireEvent.click(within(dialog).getByRole('button', { name: '재지정 확정' }))
    await waitFor(() => expect(mocks.reassignSupplierSkuMapping).toHaveBeenCalledWith({ supplierId: 4, externalSku: 'FAC-RED-M', productVariantId: 101, reason: '잘못된 옵션 수정' }))

    fireEvent.click(within(dialog).getByRole('button', { name: '비활성화' }))
    fireEvent.change(within(dialog).getByLabelText('비활성화 사유'), { target: { value: '공급 종료' } })
    fireEvent.click(within(dialog).getByRole('button', { name: '비활성화 확정' }))
    await waitFor(() => expect(mocks.deactivateSupplierSkuMapping).toHaveBeenCalledWith({ supplierId: 4, externalSku: 'FAC-RED-M', reason: '공급 종료' }))
  })

})

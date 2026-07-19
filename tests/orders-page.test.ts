// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'

const mocks = vi.hoisted(() => ({
  getCatalogData: vi.fn(),
  getOrdersWorkspaceData: vi.fn(),
  getProductWorkspaceData: vi.fn(),
  listTrackingPresets: vi.fn(),
}))
vi.mock('@/lib/actions/order-sync', () => ({ getOrdersWorkspaceData: mocks.getOrdersWorkspaceData }))
vi.mock('@/lib/actions/tracking-import', () => ({ listTrackingPresets: mocks.listTrackingPresets }))
vi.mock('@/lib/data', () => ({
  getCatalogData: mocks.getCatalogData,
  getProductWorkspaceData: mocks.getProductWorkspaceData,
}))

import OrdersPage from '@/app/(protected)/orders/page'

describe('OrdersPage', () => {
  it('renders fixed views, a shared filter toolbar, and the bare table contract', async () => {
    mocks.getOrdersWorkspaceData.mockResolvedValue([])
    mocks.getCatalogData.mockResolvedValue({ warehouses: [] })
    mocks.getProductWorkspaceData.mockResolvedValue({ variants: [] })
    mocks.listTrackingPresets.mockResolvedValue([])
    render(await OrdersPage({ searchParams: Promise.resolve({ view: 'exception' }) }))
    expect(screen.getByRole('heading', { name: '주문' })).toBeTruthy()
    expect(screen.getByText('출고 준비')).toBeTruthy()
    expect(screen.getByText('확인 필요')).toBeTruthy()
    expect(screen.getByRole('tab', { name: '확인 필요' }).getAttribute('aria-selected')).toBe('true')
    expect(screen.getByRole('searchbox', { name: '주문 검색' })).toBeTruthy()
    expect(screen.getByRole('combobox', { name: '채널 선택' })).toBeTruthy()
    expect(screen.getByText('0건')).toBeTruthy()
    expect(screen.getByRole('button', { name: '필터 초기화' })).toBeTruthy()
    expect(screen.getByRole('button', { name: '주문 동기화' })).toBeTruthy()
    expect(screen.getByRole('button', { name: '송장 등록' })).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: '송장 등록' }))
    expect(screen.getByRole('dialog', { name: '송장 업로드' })).toBeTruthy()
    expect(screen.getByRole('table', { name: '주문 목록' })).toBeTruthy()
    expect(screen.getByRole('columnheader', { name: '채널' }).className).toContain('px-3')
    expect(screen.getByRole('columnheader', { name: '채널' }).className).toContain('py-2.5')
    expect(screen.getByText('조건에 맞는 주문이 없습니다.')).toBeTruthy()
  })

  it('provides named product and warehouse selectors instead of raw IDs for exception rows', async () => {
    mocks.getOrdersWorkspaceData.mockResolvedValue([{
      id: 1,
      channel: 'naver',
      external_order_id: 'ORDER-1',
      order_status: 'PAYED',
      ordered_at: null,
      channel_order_lines: [{
        id: 10,
        quantity: 1,
        line_status: 'MAPPING_REQUIRED',
        product_variants: null,
        inventory_reservations: [],
      }],
    }])
    mocks.getCatalogData.mockResolvedValue({ warehouses: [{ id: 2, name: '서울 창고' }] })
    mocks.getProductWorkspaceData.mockResolvedValue({
      variants: [{ id: 3, modelName: 'LP01', sizeName: 'S', colorName: '네이비', sellerSku: 'LP01-NV-S' }],
    })
    mocks.listTrackingPresets.mockResolvedValue([])

    render(await OrdersPage({ searchParams: Promise.resolve({ view: 'exception' }) }))

    expect(screen.getByRole('combobox', { name: '상품 옵션 선택' })).toBeTruthy()
    expect(screen.getByRole('combobox', { name: '배정 창고 선택' })).toBeTruthy()
    expect(screen.queryByLabelText('Variant ID')).toBeNull()
    expect(screen.queryByLabelText('창고 ID')).toBeNull()
  })
})

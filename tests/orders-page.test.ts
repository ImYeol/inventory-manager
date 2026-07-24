// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { afterEach } from 'vitest'

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

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

describe('OrdersPage', () => {
  it('renders the canonical Orders hierarchy and detached standalone controls', async () => {
    mocks.getOrdersWorkspaceData.mockResolvedValue([])
    mocks.getCatalogData.mockResolvedValue({ warehouses: [] })
    mocks.getProductWorkspaceData.mockResolvedValue({ variants: [] })
    mocks.listTrackingPresets.mockResolvedValue([])
    render(await OrdersPage({ searchParams: Promise.resolve({ view: 'exception' }) }))
    expect(screen.getByRole('heading', { name: '주문' })).toBeTruthy()
    expect(screen.getByText('주문 조회, 예약 상태 확인, 송장 등록/반영을 한곳에서 처리합니다.')).toBeTruthy()
    expect(screen.getByRole('link', { name: '대시보드' })).toBeTruthy()
    expect(screen.getByText('출고 준비')).toBeTruthy()
    expect(screen.getByText('확인 필요')).toBeTruthy()
    expect(screen.getByRole('tab', { name: '확인 필요' }).getAttribute('aria-selected')).toBe('true')
    expect(screen.getByRole('searchbox', { name: '주문 검색' })).toBeTruthy()
    expect(screen.getByRole('combobox', { name: '채널 선택' })).toBeTruthy()
    expect(screen.getAllByText('0건').length).toBeGreaterThanOrEqual(1)
    const queryRow = screen.getByRole('searchbox', { name: '주문 검색' }).closest('[data-slot="data-query-row"]') as HTMLElement | null
    const actionRow = screen.getAllByText('0건').map((element) => element.closest('[data-slot="data-action-row"]')).find(Boolean) as HTMLElement | null
    const surface = screen.getByRole('table', { name: '주문 목록' }).closest('[data-slot="table-surface"]') as HTMLElement | null
    expect(queryRow).toBeTruthy()
    expect(actionRow).toBeTruthy()
    expect(surface).toBeTruthy()
    expect(surface).not.toContainElement(queryRow)
    expect(surface).not.toContainElement(actionRow)
    expect(screen.getByRole('button', { name: '컬럼' })).toHaveClass('w-fit', 'shrink-0')
    expect(screen.getByRole('button', { name: '주문 동기화' })).toBeTruthy()
    expect(screen.getByRole('button', { name: '송장 등록' })).toBeTruthy()
    expect(actionRow).not.toHaveAttribute('role', 'group')
    expect(actionRow?.querySelector('[data-slot="button-group"]')).toBeNull()
    expect(screen.getByRole('table', { name: '주문 목록' })).toBeTruthy()
    expect(screen.getByRole('columnheader', { name: '채널' }).className).toContain('px-4')
    expect(screen.getByRole('columnheader', { name: '채널' }).className).toContain('py-2')
    expect(screen.getByText('등록된 주문이 없습니다.')).toBeTruthy()

    // WorkDialog is a true modal (base-ui default: background is inert while open).
    fireEvent.click(screen.getByRole('button', { name: '송장 등록' }))
    const trackingDialog = screen.getByRole('dialog', { name: '송장 업로드' })
    expect(trackingDialog).toHaveAttribute('data-slot', 'work-dialog-content')
    expect(trackingDialog).toHaveClass('sm:max-w-[min(960px,calc(100%-2rem))]')
    expect(screen.getByText('파일을 선택하면 정규화된 행을 미리봅니다.')).toBeTruthy()
  })

  it('distinguishes a filtered-empty result from an empty dataset and exposes reset', async () => {
    mocks.getOrdersWorkspaceData.mockResolvedValue([{
      id: 1,
      channel: 'naver',
      external_order_id: 'ORDER-1',
      order_status: 'PAYED',
      ordered_at: null,
      channel_order_lines: [{
        id: 10,
        quantity: 1,
        line_status: 'NEW',
        product_variants: { seller_sku: 'SKU-1' },
        inventory_reservations: [],
      }],
    }])
    mocks.getCatalogData.mockResolvedValue({ warehouses: [] })
    mocks.getProductWorkspaceData.mockResolvedValue({ variants: [] })
    mocks.listTrackingPresets.mockResolvedValue([])

    render(await OrdersPage({ searchParams: Promise.resolve({ view: 'exception' }) }))

    const table = screen.getByRole('table', { name: '주문 목록' })
    fireEvent.change(screen.getByRole('searchbox', { name: '주문 검색' }), { target: { value: 'missing-order' } })
    expect(within(table).getByText('조건에 맞는 주문이 없습니다.')).toBeTruthy()
    expect(within(table).getByRole('button', { name: '필터 초기화' })).toBeTruthy()
    expect(within(table).queryByText('등록된 주문이 없습니다.')).toBeNull()
  })

  it('uses the shared responsive filter control for channel filtering', async () => {
    mocks.getOrdersWorkspaceData.mockResolvedValue([])
    mocks.getCatalogData.mockResolvedValue({ warehouses: [] })
    mocks.getProductWorkspaceData.mockResolvedValue({ variants: [] })
    mocks.listTrackingPresets.mockResolvedValue([])

    render(await OrdersPage({ searchParams: Promise.resolve({}) }))

    expect(screen.getByRole('combobox', { name: '채널 선택' }).closest('[data-slot="responsive-filter-controls"]')).toBeTruthy()
    expect(screen.getByRole('combobox', { name: '채널 선택' }).closest('[data-filter-mode]')).toBeTruthy()
  })

  it('opens the channel filter in the shared full-screen mobile Dialog', async () => {
    mocks.getOrdersWorkspaceData.mockResolvedValue([])
    mocks.getCatalogData.mockResolvedValue({ warehouses: [] })
    mocks.getProductWorkspaceData.mockResolvedValue({ variants: [] })
    mocks.listTrackingPresets.mockResolvedValue([])
    const originalWidth = window.innerWidth
    window.innerWidth = 500

    render(await OrdersPage({ searchParams: Promise.resolve({}) }))
    await waitFor(() => expect(screen.getByRole('button', { name: '필터' })).toBeTruthy())
    fireEvent.click(screen.getByRole('button', { name: '필터' }))

    expect(screen.getByRole('dialog')).toHaveClass('inset-0', 'rounded-none')
    expect(screen.getByRole('heading', { name: '필터' })).toBeTruthy()
    window.innerWidth = originalWidth
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

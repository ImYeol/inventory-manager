// @vitest-environment jsdom
import React from 'react'
import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'

const navigation = vi.hoisted(() => ({ refresh: vi.fn() }))

vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: navigation.refresh }),
}))

vi.mock('next/link', () => ({
  default: ({
    href,
    children,
    className,
    'aria-label': ariaLabel,
  }: {
    href: string
    children: React.ReactNode
    className?: string
    'aria-label'?: string
  }) => React.createElement('a', { href, className, ...(ariaLabel && { 'aria-label': ariaLabel }) }, children),
}))

vi.mock('@/app/(protected)/inout/InOutForm', () => ({
  default: ({
    initialType,
    operation,
    lockedWarehouseId,
    initialVariant,
  }: {
    initialType?: string
    operation?: string
    lockedWarehouseId?: number | null
    initialVariant?: { modelId: number; sizeId: number; colorId: number }
  }) =>
    React.createElement(
      'div',
      {},
      `InOutForm:${operation ?? initialType ?? '입고'}:${lockedWarehouseId ?? 'all'}:${
        initialVariant ? `${initialVariant.modelId}-${initialVariant.sizeId}-${initialVariant.colorId}` : 'none'
      }`,
    ),
}))

vi.mock('@/app/components/inventory/WarehouseTransferForm', () => ({
  default: ({
    initialVariant,
  }: {
    initialVariant?: { modelId: number; sizeId: number; colorId: number }
  }) =>
    React.createElement(
      'div',
      {},
      `WarehouseTransferForm:${
        initialVariant ? `${initialVariant.modelId}-${initialVariant.sizeId}-${initialVariant.colorId}` : 'none'
      }`,
    ),
}))

vi.mock('@/app/(protected)/history/HistoryView', () => ({
  default: ({
    filters,
    onFiltersChange,
    embedded,
  }: {
    filters?: { warehouseId: number | ''; search: string }
    onFiltersChange?: (next: { warehouseId: number | ''; type: string; search: string; dateFrom: string; dateTo: string }) => void
    embedded?: boolean
  }) =>
    React.createElement(
      'div',
      {},
      React.createElement('div', {}, `HistoryWarehouse:${filters?.warehouseId || 'all'}`),
      React.createElement('div', {}, `HistorySearch:${filters?.search || '-'}`),
      React.createElement('div', {}, `HistoryEmbedded:${embedded ? 'yes' : 'no'}`),
      React.createElement(
        'button',
        {
          type: 'button',
          onClick: () =>
            onFiltersChange?.({
              warehouseId: 1,
              type: '',
              search: filters?.search ?? '',
              dateFrom: '',
              dateTo: '',
            }),
        },
        'SetHistoryWarehouse1',
      ),
      React.createElement(
        'button',
        {
          type: 'button',
          onClick: () =>
            onFiltersChange?.({
              warehouseId: filters?.warehouseId ?? '',
              type: '',
              search: 'LP',
              dateFrom: '',
              dateTo: '',
            }),
        },
        'SetHistorySearchLP',
      ),
    ),
}))

import InventoryWorkspace from '@/app/components/inventory/InventoryWorkspace'

describe('InventoryWorkspace', () => {
  async function openComboboxAndPick(label: string, option: string) {
    const trigger = screen.getByRole('combobox', { name: label })
    fireEvent.click(trigger)
    fireEvent.click(await screen.findByRole('option', { name: option }))
    return trigger
  }

  it('renders a table-first workspace with compact filters and action buttons', async () => {
    render(
      React.createElement(InventoryWorkspace, {
        warehouses: [
          { id: 1, name: '오금동' },
          { id: 2, name: '대자동' },
        ],
        models: [
          {
            id: 1,
            name: 'LP01',
            sizes: [{ id: 11, name: 'S', sortOrder: 1, modelId: 1 }],
            colors: [{ id: 21, name: '네이비', rgbCode: '#111111', textWhite: true, sortOrder: 1, modelId: 1 }],
            inventory: [
              { id: 101, modelId: 1, sizeId: 11, colorId: 21, warehouseId: 1, warehouseName: '오금동', quantity: 2 },
              { id: 102, modelId: 1, sizeId: 11, colorId: 21, warehouseId: 2, warehouseName: '대자동', quantity: 8 },
            ],
          },
        ],
        transactions: [
          {
            id: 1,
            date: '26.04.19',
            type: '입고',
            quantity: 4,
            warehouseId: 1,
            warehouseName: '오금동',
            sourceChannel: null,
            referenceType: null,
            referenceId: null,
            memo: null,
            createdAt: '2026-04-19T00:00:00.000Z',
            modelName: 'LP01',
            sizeName: 'S',
            colorName: '네이비',
            colorRgb: '#111111',
            canRevert: true,
            revertDisabledReason: null,
            revertSummary: null,
          },
        ],
      }),
    )

    expect(screen.getByRole('heading', { name: '재고 운영' })).toBeTruthy()
    expect(screen.getAllByRole('heading', { name: '재고 운영' })).toHaveLength(1)
    expect(screen.getByRole('tab', { name: '목록' })).toBeTruthy()
    expect(screen.getByRole('tab', { name: '이력' })).toBeTruthy()
    expect(screen.queryByRole('button', { name: '목록' })).toBeNull()
    expect(screen.queryByRole('button', { name: '이력' })).toBeNull()
    expect(screen.getByRole('combobox', { name: '창고 선택' }).textContent).toContain('전체 창고')
    expect(screen.getByLabelText('상품명 검색')).toBeTruthy()
    expect(screen.getByLabelText('상태 필터')).toBeTruthy()
    expect(screen.getByRole('button', { name: '컬럼' })).toBeTruthy()
    expect(screen.getByRole('button', { name: '수동 입고' })).toBeTruthy()
    expect(screen.queryByRole('button', { name: '수동 출고' })).toBeNull()
    expect(screen.queryByRole('button', { name: '실사 조정' })).toBeNull()
    expect(screen.queryByRole('button', { name: '창고 이동' })).toBeNull()
    expect(screen.getByRole('button', { name: '다른 재고 운영 action 더보기' })).toBeTruthy()
    expect(screen.queryByRole('button', { name: '재고 추가' })).toBeNull()
    expect(within(screen.getByRole('table')).getByText('현재 재고')).toBeTruthy()
    expect(within(screen.getByRole('table')).getByText('예약 재고')).toBeTruthy()
    expect(within(screen.getByRole('table')).getByText('출고 가능')).toBeTruthy()
    expect(within(screen.getByRole('table')).getByText('입고 예정')).toBeTruthy()
    expect(within(screen.getByRole('table')).queryByText('채널 보고')).toBeNull()

    fireEvent.change(screen.getByLabelText('상품명 검색'), { target: { value: 'LP01' } })
    await openComboboxAndPick('상태 필터', '정상')
    await openComboboxAndPick('창고 선택', '대자동')

    const table = screen.getByRole('table')
    expect(within(table).getByText('LP01')).toBeTruthy()
    expect(within(table).getByText('대자동')).toBeTruthy()
    expect(within(table).queryByText('오금동')).toBeNull()

    fireEvent.pointerDown(screen.getByRole('button', { name: '컬럼' }))
    const menu = screen.getByRole('menu')
    fireEvent.click(within(menu).getByText('창고'))
    expect(within(screen.getByRole('table')).queryByText('창고')).toBeNull()

    fireEvent.click(screen.getByRole('button', { name: '수동 입고' }))
    expect(screen.getByRole('dialog', { name: '수동 입고' })).toBeTruthy()
    expect(screen.getByText('InOutForm:inbound:2:none')).toBeTruthy()

    // Sheet is a true modal (base-ui default: background is inert while open),
    // so switching to another quick-action mode closes the current sheet first.
    fireEvent.keyDown(document, { key: 'Escape' })
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())

    fireEvent.pointerDown(screen.getByRole('button', { name: '다른 재고 운영 action 더보기' }))
    let operationsMenu = screen.getByRole('menu')
    fireEvent.click(within(operationsMenu).getByText('수동 출고'))
    expect(screen.getByRole('dialog', { name: '수동 출고' })).toBeTruthy()
    expect(screen.getByText('InOutForm:manual-outbound:2:none')).toBeTruthy()

    fireEvent.keyDown(document, { key: 'Escape' })
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())

    fireEvent.pointerDown(screen.getByRole('button', { name: '다른 재고 운영 action 더보기' }))
    operationsMenu = screen.getByRole('menu')
    fireEvent.click(within(operationsMenu).getByText('실사 조정'))
    expect(screen.getByRole('dialog', { name: '실사 수량 조정' })).toBeTruthy()
    expect(screen.getByText('InOutForm:count-adjustment:2:none')).toBeTruthy()

    fireEvent.keyDown(document, { key: 'Escape' })
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())

    fireEvent.pointerDown(screen.getByRole('button', { name: '다른 재고 운영 action 더보기' }))
    operationsMenu = screen.getByRole('menu')
    fireEvent.click(within(operationsMenu).getByText('창고 이동'))
    expect(screen.getByRole('dialog', { name: '창고 이동' })).toBeTruthy()
    expect(screen.getByText('WarehouseTransferForm:none')).toBeTruthy()
  })

  it('opens a mode-locked count-adjustment sheet pre-filled with the row variant and warehouse, and clears the prefill for toolbar-triggered actions', async () => {
    render(
      React.createElement(InventoryWorkspace, {
        warehouses: [
          { id: 1, name: '오금동' },
          { id: 2, name: '대자동' },
        ],
        models: [
          {
            id: 1,
            name: 'LP01',
            sizes: [{ id: 11, name: 'S', sortOrder: 1, modelId: 1 }],
            colors: [{ id: 21, name: '네이비', rgbCode: '#111111', textWhite: true, sortOrder: 1, modelId: 1 }],
            inventory: [{ id: 101, modelId: 1, sizeId: 11, colorId: 21, warehouseId: 1, warehouseName: '오금동', quantity: 2 }],
          },
        ],
        transactions: [],
      }),
    )

    fireEvent.click(screen.getByRole('button', { name: '조정' }))
    expect(screen.getByRole('dialog', { name: '실사 수량 조정' })).toBeTruthy()
    expect(screen.getByText('InOutForm:count-adjustment:1:1-11-21')).toBeTruthy()

    // Sheet is a true modal (base-ui default: background is inert while open),
    // so the toolbar action is reachable again only after the sheet closes.
    fireEvent.keyDown(document, { key: 'Escape' })
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())

    fireEvent.click(screen.getByRole('button', { name: '수동 입고' }))
    expect(screen.getByRole('dialog', { name: '수동 입고' })).toBeTruthy()
    expect(screen.getByText('InOutForm:inbound:all:none')).toBeTruthy()
  })

  it('does not render oversized summary chrome when the table is empty', () => {
    render(
      React.createElement(InventoryWorkspace, {
        warehouses: [{ id: 1, name: '오금동' }],
        models: [],
        transactions: [],
      }),
    )

    expect(screen.getByText('조회 조건에 맞는 재고가 없습니다.')).toBeTruthy()
    expect(screen.queryByText('운영 SKU')).toBeNull()
    expect(screen.queryByText('주의 항목')).toBeNull()
  })

  it('renders warehouse-specific incoming stock before an inventory row exists', () => {
    render(
      React.createElement(InventoryWorkspace, {
        warehouses: [{ id: 1, name: '오금동' }],
        models: [{
          id: 1,
          name: 'LP01',
          sizes: [{ id: 11, name: 'S', sortOrder: 1, modelId: 1 }],
          colors: [{ id: 21, name: '네이비', rgbCode: '#111111', textWhite: true, sortOrder: 1, modelId: 1 }],
          inventory: [],
        }],
        transactions: [],
        variants: [{ id: 501, modelId: 1, sizeId: 11, colorId: 21 }],
        incomingByVariant: { '1:11:21:1': 7 },
      }),
    )

    expect(screen.getByText('오금동')).toBeTruthy()
    expect(screen.getAllByText('0').length).toBeGreaterThan(0)
    expect(screen.getByRole('link', { name: '입고 예정 7개 보기' }).getAttribute('href')).toBe('/sourcing/arrivals')
  })

  it('summarizes explicit channel mappings in the SKU cell and distinguishes sync errors from unmapped SKUs', () => {
    render(
      React.createElement(InventoryWorkspace, {
        warehouses: [{ id: 1, name: '오금동' }],
        models: [
          {
            id: 1,
            name: 'LP01',
            sizes: [
              { id: 11, name: 'S', sortOrder: 1, modelId: 1 },
              { id: 12, name: 'M', sortOrder: 2, modelId: 1 },
            ],
            colors: [{ id: 21, name: '네이비', rgbCode: '#111111', textWhite: true, sortOrder: 1, modelId: 1 }],
            inventory: [
              { id: 101, modelId: 1, sizeId: 11, colorId: 21, warehouseId: 1, warehouseName: '오금동', quantity: 8 },
              { id: 102, modelId: 1, sizeId: 12, colorId: 21, warehouseId: 1, warehouseName: '오금동', quantity: 6 },
            ],
          },
        ],
        transactions: [],
        variants: [
          { id: 501, modelId: 1, sizeId: 11, colorId: 21 },
          { id: 502, modelId: 1, sizeId: 12, colorId: 21 },
        ],
        channelProductRefs: [
          { id: 1, variantId: 501, channel: 'naver', listingStatus: 'active', lastSyncError: null },
          { id: 2, variantId: 501, channel: 'coupang', listingStatus: 'active', lastSyncError: '권한 확인 필요' },
        ],
      }),
    )

    expect(screen.getByText('네이버 1 · 쿠팡 1')).toBeTruthy()
    expect(screen.getByText('쿠팡 동기화 오류')).toBeTruthy()
    expect(screen.getByText('매핑 없음')).toBeTruthy()
    expect(screen.queryByText('CP-1')).toBeNull()
    expect(screen.queryByText('CPV-1')).toBeNull()
  })

  it('switches to the embedded history view through tabs without duplicating top-level filters and keeps history filters independent', async () => {
    render(
      React.createElement(InventoryWorkspace, {
        warehouses: [
          { id: 1, name: '오금동' },
          { id: 2, name: '대자동' },
        ],
        models: [],
        transactions: [],
      }),
    )

    await openComboboxAndPick('창고 선택', '대자동')

    const historyTab = screen.getByRole('tab', { name: '이력' })
    fireEvent.mouseDown(historyTab)
    fireEvent.click(historyTab)
    expect(screen.getByText('HistoryWarehouse:all')).toBeTruthy()
    expect(screen.getByText('HistorySearch:-')).toBeTruthy()
    expect(screen.getByText('HistoryEmbedded:yes')).toBeTruthy()
    expect(screen.queryByRole('heading', { name: '이력 필터' })).toBeNull()
    expect(screen.queryByRole('button', { name: '수동 입고' })).toBeNull()
    expect(screen.queryByRole('button', { name: '수동 출고' })).toBeNull()

    fireEvent.click(screen.getByRole('button', { name: 'SetHistoryWarehouse1' }))
    fireEvent.click(screen.getByRole('button', { name: 'SetHistorySearchLP' }))

    const listTab = screen.getByRole('tab', { name: '목록' })
    fireEvent.mouseDown(listTab)
    fireEvent.click(listTab)

    expect(screen.getByRole('combobox', { name: '창고 선택' }).textContent).toContain('대자동')

    fireEvent.mouseDown(historyTab)
    fireEvent.click(historyTab)

    expect(screen.getByText('HistoryWarehouse:1')).toBeTruthy()
    expect(screen.getByText('HistorySearch:LP')).toBeTruthy()
  })

  it('renders incoming stock as a link to sourcing arrivals when incoming > 0', () => {
    render(
      React.createElement(InventoryWorkspace, {
        warehouses: [
          { id: 1, name: '오금동' },
        ],
        models: [
          {
            id: 1,
            name: 'LP01',
            sizes: [{ id: 11, name: 'S', sortOrder: 1, modelId: 1 }],
            colors: [{ id: 21, name: '네이비', rgbCode: '#111111', textWhite: true, sortOrder: 1, modelId: 1 }],
            inventory: [
              { id: 101, modelId: 1, sizeId: 11, colorId: 21, warehouseId: 1, warehouseName: '오금동', quantity: 2 },
            ],
          },
        ],
        transactions: [],
        incomingByVariant: { '1:11:21:1': 3 },
      }),
    )

    const link = screen.getByRole('link', { name: '입고 예정 3개 보기' })
    expect(link).toBeTruthy()
    expect(link.getAttribute('href')).toBe('/sourcing/arrivals')
  })
})

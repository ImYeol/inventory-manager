// @vitest-environment jsdom
import React from 'react'
import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, within } from '@testing-library/react'

vi.mock('next/link', () => ({
  default: ({
    href,
    children,
    className,
  }: {
    href: string
    children: React.ReactNode
    className?: string
  }) => React.createElement('a', { href, className }, children),
}))

vi.mock('@/app/(protected)/inout/InOutForm', () => ({
  default: ({
    initialType,
    lockedWarehouseId,
  }: {
    initialType?: string
    lockedWarehouseId?: number | null
  }) =>
    React.createElement(
      'div',
      {},
      `InOutForm:${initialType ?? '입고'}:${lockedWarehouseId ?? 'all'}`,
    ),
}))

vi.mock('@/app/(protected)/history/HistoryView', () => ({
  default: ({ controlledWarehouseId }: { controlledWarehouseId?: number | '' }) =>
    React.createElement('div', {}, `HistoryView:${controlledWarehouseId || 'all'}`),
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
            createdAt: '2026-04-19T00:00:00.000Z',
            modelName: 'LP01',
            sizeName: 'S',
            colorName: '네이비',
            colorRgb: '#111111',
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
    expect(screen.getByRole('button', { name: '입고' })).toBeTruthy()
    expect(screen.getByRole('button', { name: '출고' })).toBeTruthy()

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

    fireEvent.click(screen.getByRole('button', { name: '입고' }))
    expect(screen.getByRole('dialog', { name: '빠른 입고' })).toBeTruthy()
    expect(screen.getByText('InOutForm:입고:2')).toBeTruthy()

    fireEvent.click(screen.getByRole('button', { name: '출고' }))
    expect(screen.getByRole('dialog', { name: '빠른 출고' })).toBeTruthy()
    expect(screen.getByText('InOutForm:출고:2')).toBeTruthy()
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

  it('switches to the embedded history view through tabs without duplicating top-level filters', () => {
    render(
      React.createElement(InventoryWorkspace, {
        warehouses: [{ id: 1, name: '오금동' }],
        models: [],
        transactions: [],
      }),
    )

    const historyTab = screen.getByRole('tab', { name: '이력' })
    fireEvent.mouseDown(historyTab)
    fireEvent.click(historyTab)
    expect(screen.getByText('HistoryView:all')).toBeTruthy()
    expect(screen.queryByRole('heading', { name: '이력 필터' })).toBeNull()
    expect(screen.queryByRole('combobox', { name: '창고' })).toBeNull()
    expect(screen.queryByRole('button', { name: '입고' })).toBeNull()
    expect(screen.queryByRole('button', { name: '출고' })).toBeNull()
  })
})

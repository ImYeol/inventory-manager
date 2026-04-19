// @vitest-environment jsdom
import React from 'react'
import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'

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
    entryMode,
  }: {
    initialType?: string
    lockedWarehouseId?: number | null
    entryMode?: string
  }) =>
    React.createElement(
      'div',
      {},
      `InOutForm:${initialType ?? '입고'}:${lockedWarehouseId ?? 'all'}:${entryMode ?? 'manual'}`,
    ),
}))

vi.mock('@/app/(protected)/history/HistoryView', () => ({
  default: ({ controlledWarehouseId }: { controlledWarehouseId?: number | '' }) =>
    React.createElement('div', {}, `HistoryView:${controlledWarehouseId || 'all'}`),
}))

import InventoryWorkspace from '@/app/components/inventory/InventoryWorkspace'

describe('InventoryWorkspace', () => {
  it('keeps the hub chrome to one header/context block and a compact utility row', () => {
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
    expect(
      screen.getByText('선택한 창고를 기준으로 개요, 입고, 출고, CSV, 이력을 한 화면에서 다룹니다.'),
    ).toBeTruthy()
    expect(
      screen.getAllByText('선택한 창고를 기준으로 개요, 입고, 출고, CSV, 이력을 한 화면에서 다룹니다.'),
    ).toHaveLength(1)
    expect((screen.getByRole('combobox', { name: '창고 선택' }) as HTMLSelectElement).value).toBe('1')

    expect(screen.queryByLabelText('검색')).toBeNull()
    expect(screen.queryByLabelText('상태')).toBeNull()
    expect(screen.queryByText('Warehouse Operations')).toBeNull()
    expect(screen.queryByText('창고 컨텍스트')).toBeNull()
    expect(screen.queryByText('현재 재고와 상태를 창고 기준으로 확인합니다.')).toBeNull()
    expect(screen.queryByText('선택된 창고:')).toBeNull()
    expect(screen.queryByText('운영 SKU')).toBeNull()
    expect(screen.queryByText('주의 항목')).toBeNull()
    expect(screen.queryByText('금일 흐름')).toBeNull()
    expect(screen.queryByText('예정 입고')).toBeNull()

    expect(screen.getByRole('button', { name: '개요' })).toBeTruthy()
    expect(screen.getAllByRole('button', { name: '입고' }).length).toBe(2)
    expect(screen.getAllByRole('button', { name: '출고' }).length).toBe(2)
    expect(screen.getAllByRole('button', { name: 'CSV' }).length).toBe(2)
    expect(screen.getByRole('button', { name: '이력' })).toBeTruthy()
    expect(screen.getAllByRole('button', { name: '이력' })).toHaveLength(1)

    fireEvent.click(screen.getAllByRole('button', { name: '입고' })[0])
    expect(screen.getByRole('heading', { name: '빠른 입고' })).toBeTruthy()

    fireEvent.click(screen.getAllByRole('button', { name: 'CSV' })[0])
    expect(screen.getByRole('heading', { name: 'CSV' })).toBeTruthy()

    fireEvent.change(screen.getByLabelText('창고 선택'), { target: { value: '2' } })

    fireEvent.click(screen.getAllByRole('button', { name: '입고' })[1])
    expect(screen.getByText('InOutForm:입고:2:manual')).toBeTruthy()
  })

  it('does not render placeholder summary or inbound metric blocks', () => {
    render(
      React.createElement(InventoryWorkspace, {
        warehouses: [{ id: 1, name: '오금동' }],
        models: [],
        transactions: [],
      }),
    )

    expect(screen.getAllByText('조회 조건에 맞는 재고가 없습니다.')).toHaveLength(2)
    expect(screen.queryByText('운영 SKU')).toBeNull()
    expect(screen.queryByText('주의 항목')).toBeNull()
    expect(screen.queryByText('금일 흐름')).toBeNull()
    expect(screen.queryByRole('columnheader', { name: '예정 입고' })).toBeNull()
    expect(screen.queryByText('창고 컨텍스트')).toBeNull()
  })

  it('renders the embedded history compactly without duplicating the top-level chrome', () => {
    render(
      React.createElement(InventoryWorkspace, {
        warehouses: [{ id: 1, name: '오금동' }],
        models: [],
        transactions: [],
      }),
    )

    fireEvent.click(screen.getByRole('button', { name: /이력/ }))
    expect(screen.getByText('HistoryView:1')).toBeTruthy()
    expect(screen.queryByRole('heading', { name: '이력 필터' })).toBeNull()
    expect(screen.queryByRole('combobox', { name: '창고' })).toBeNull()

    fireEvent.click(screen.getAllByRole('button', { name: /CSV/ })[1])
    expect(screen.getByText('InOutForm:입고:1:csv')).toBeTruthy()
  })
})

// @vitest-environment jsdom
import React from 'react'
import { describe, expect, it } from 'vitest'
import { fireEvent, render, screen, within } from '@testing-library/react'

import HistoryView from '@/app/(protected)/history/HistoryView'

describe('HistoryView', () => {
  it('filters by dynamic warehouse id and adjustment type', () => {
    render(
      React.createElement(HistoryView, {
        models: [{ id: 1, name: 'LP01' }],
        warehouses: [
          { id: 1, name: '오금동' },
          { id: 2, name: '대자동' },
        ],
        transactions: [
          {
            id: 1,
            date: '26.04.13',
            type: '입고',
            quantity: 3,
            warehouse: '오금동',
            warehouseId: 1,
            createdAt: '2026-04-13T00:00:00.000Z',
            modelName: 'LP01',
            sizeName: 'S',
            colorName: '네이비',
            colorRgb: '#111111',
          },
          {
            id: 2,
            date: '26.04.13',
            type: '재고조정',
            quantity: 8,
            warehouse: '대자동',
            warehouseId: 2,
            createdAt: '2026-04-13T00:00:00.000Z',
            modelName: 'LP01',
            sizeName: 'M',
            colorName: '블랙',
            colorRgb: '#000000',
          },
        ],
      }),
    )

    const selects = screen.getAllByRole('combobox')
    fireEvent.change(selects[1], { target: { value: '재고조정' } })
    fireEvent.change(selects[2], { target: { value: '2' } })

    expect(screen.getByText('1건 조회됨')).toBeTruthy()

    const table = screen.getByRole('table')
    expect(within(table).getByText('대자동')).toBeTruthy()
    expect(within(table).queryByText('오금동')).toBeNull()
  })
})

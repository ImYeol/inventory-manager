// @vitest-environment jsdom
import React from 'react'
import { describe, expect, it } from 'vitest'
import { fireEvent, render, screen, within } from '@testing-library/react'

import HistoryView from '@/app/(protected)/history/HistoryView'

describe('HistoryView', () => {
  it('shows source metadata and filters by source channel', () => {
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
            sourceChannel: 'manual',
            referenceType: null,
            referenceId: null,
            memo: null,
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
            sourceChannel: 'factory-arrival',
            referenceType: 'factory_arrival',
            referenceId: 10,
            memo: '1차 납품',
            createdAt: '2026-04-13T00:00:00.000Z',
            modelName: 'LP01',
            sizeName: 'M',
            colorName: '블랙',
            colorRgb: '#000000',
          },
        ],
      }),
    )

    fireEvent.change(screen.getByLabelText('등록 방식'), { target: { value: 'factory-arrival' } })

    expect(screen.getByText('1건 조회됨')).toBeTruthy()

    const table = screen.getByRole('table')
    expect(within(table).getByText('예정입고 반영')).toBeTruthy()
    expect(within(table).getByText('공장 예정입고 #10')).toBeTruthy()
    expect(within(table).getByText('1차 납품')).toBeTruthy()
    expect(within(table).queryByText('오금동')).toBeNull()
  })

  it('applies the controlled warehouse context when embedded in the inventory hub', () => {
    render(
      React.createElement(HistoryView, {
        models: [{ id: 1, name: 'LP01' }],
        warehouses: [
          { id: 1, name: '오금동' },
          { id: 2, name: '대자동' },
        ],
        controlledWarehouseId: 1,
        embedded: true,
        transactions: [
          {
            id: 1,
            date: '26.04.13',
            type: '입고',
            quantity: 3,
            warehouse: '오금동',
            warehouseId: 1,
            sourceChannel: 'manual',
            createdAt: '2026-04-13T00:00:00.000Z',
            modelName: 'LP01',
            sizeName: 'S',
            colorName: '네이비',
            colorRgb: '#111111',
          },
          {
            id: 2,
            date: '26.04.13',
            type: '입고',
            quantity: 8,
            warehouse: '대자동',
            warehouseId: 2,
            sourceChannel: 'manual',
            createdAt: '2026-04-13T00:00:00.000Z',
            modelName: 'LP01',
            sizeName: 'M',
            colorName: '블랙',
            colorRgb: '#000000',
          },
        ],
      }),
    )

    expect(screen.getAllByText('오금동').length).toBeGreaterThan(0)
    expect(screen.getByText('1건 조회됨')).toBeTruthy()
    expect(screen.queryByRole('combobox', { name: '창고' })).toBeNull()
  })
})

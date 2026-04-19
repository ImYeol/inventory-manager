// @vitest-environment jsdom
import React from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'

const mocks = vi.hoisted(() => ({
  refresh: vi.fn(),
  createFactoryArrivalBatch: vi.fn(),
  receiveFactoryArrival: vi.fn(),
}))

vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: mocks.refresh }),
}))

vi.mock('@/lib/actions', () => ({
  createFactoryArrivalBatch: mocks.createFactoryArrivalBatch,
  receiveFactoryArrival: mocks.receiveFactoryArrival,
}))

import ArrivalsView from '@/app/(protected)/sourcing/arrivals/ArrivalsView'

beforeEach(() => {
  Object.values(mocks).forEach((mock) => mock.mockReset())
})

async function openSelectAndChoose(label: string, optionName: string) {
  fireEvent.click(screen.getByRole('combobox', { name: label }))
  fireEvent.click(await screen.findByRole('option', { name: optionName }))
}

describe('ArrivalsView', () => {
  it('imports CSV rows and submits valid staging arrivals', async () => {
    mocks.createFactoryArrivalBatch.mockResolvedValue({ success: true, count: 1 })

    render(
      React.createElement(ArrivalsView, {
        factories: [{ id: 1, name: '광주 협력사', isActive: true }],
        warehouses: [
          { id: 11, name: '오금동' },
          { id: 12, name: '대자동' },
        ],
        models: [
          {
            id: 1,
            name: 'LP01',
            sizes: [{ id: 10, name: 'S' }],
            colors: [{ id: 20, name: '네이비', rgbCode: '#111111' }],
          },
        ],
        arrivals: [],
      }),
    )

    fireEvent.click(screen.getByRole('button', { name: 'CSV 등록' }))
    fireEvent.change(screen.getByLabelText('CSV 붙여넣기'), {
      target: { value: '모델,사이즈,색상,수량\nLP01,S,네이비,12' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'CSV 행 가져오기' }))

    await openSelectAndChoose('공장', '광주 협력사')
    await openSelectAndChoose('항목 #1 모델', 'LP01')
    await openSelectAndChoose('항목 #1 사이즈', 'S')
    await openSelectAndChoose('항목 #1 색상', '네이비')

    fireEvent.click(screen.getByRole('button', { name: '예정 입고 등록' }))

    await waitFor(() =>
      expect(mocks.createFactoryArrivalBatch).toHaveBeenCalledWith(
        expect.objectContaining({
          factoryId: 1,
          sourceChannel: 'csv',
          items: [{ modelId: 1, sizeId: 10, colorId: 20, orderedQuantity: 12 }],
        }),
      ),
    )
  })

  it('receives partial arrival quantities into the selected warehouse', async () => {
    mocks.receiveFactoryArrival.mockResolvedValue({ success: true })

    render(
      React.createElement(ArrivalsView, {
        factories: [{ id: 1, name: '광주 협력사', isActive: true }],
        warehouses: [
          { id: 11, name: '오금동' },
          { id: 12, name: '대자동' },
        ],
        models: [
          {
            id: 1,
            name: 'LP01',
            sizes: [{ id: 10, name: 'S' }],
            colors: [{ id: 20, name: '네이비', rgbCode: '#111111' }],
          },
        ],
        arrivals: [
          {
            id: 101,
            factoryName: '광주 협력사',
            expectedDate: '2026-04-21',
            status: '예정',
            sourceChannel: 'manual',
            memo: '1차 입고',
            totalOrderedQuantity: 5,
            remainingQuantity: 5,
            items: [
              {
                id: 201,
                modelName: 'LP01',
                sizeName: 'S',
                colorName: '네이비',
                colorRgb: '#111111',
                orderedQuantity: 5,
                receivedQuantity: 0,
                remainingQuantity: 5,
              },
            ],
          },
        ],
      }),
    )

    await openSelectAndChoose('입고 창고', '대자동')
    fireEvent.change(screen.getByLabelText('입고 수량'), { target: { value: '2' } })
    fireEvent.click(screen.getByRole('button', { name: '입고 반영' }))

    await waitFor(() =>
      expect(mocks.receiveFactoryArrival).toHaveBeenCalledWith({
        arrivalId: 101,
        warehouseId: 12,
        items: [{ arrivalItemId: 201, quantity: 2 }],
      }),
    )
    expect(mocks.refresh).toHaveBeenCalled()
  })
})

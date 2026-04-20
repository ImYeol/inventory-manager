// @vitest-environment jsdom
import React from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'

const mocks = vi.hoisted(() => ({
  getTransactionsWithRelations: vi.fn(),
  historyView: vi.fn(),
}))

vi.mock('@/lib/data', () => ({
  getTransactionsWithRelations: mocks.getTransactionsWithRelations,
}))

vi.mock('@/app/(protected)/history/HistoryView', () => ({
  default: (props: unknown) => {
    mocks.historyView(props)
    return React.createElement('div', { 'data-testid': 'history-view' })
  },
}))

import HistoryPage from '@/app/(protected)/history/page'

afterEach(() => {
  cleanup()
  mocks.getTransactionsWithRelations.mockReset()
  mocks.historyView.mockReset()
})

describe('HistoryPage', () => {
  it('loads history data and renders the standalone history workspace with the shared core filters', async () => {
    const transactions = [{ id: 1, warehouseId: 1, type: '입고', quantity: 2 }]
    const models = [{ id: 10, name: 'LP01' }]
    const warehouses = [{ id: 1, name: '오금동' }]

    mocks.getTransactionsWithRelations.mockResolvedValue({ transactions, models, warehouses })

    render(await HistoryPage())

    expect(mocks.getTransactionsWithRelations).toHaveBeenCalledTimes(1)
    expect(mocks.historyView).toHaveBeenCalledWith(
      expect.objectContaining({
        transactions,
        models,
        warehouses,
      }),
    )
    expect(screen.getByRole('heading', { name: '이력 조회' })).toBeTruthy()
    expect(screen.getByTestId('history-view')).toBeTruthy()
  })
})

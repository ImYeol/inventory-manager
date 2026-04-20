// @vitest-environment jsdom
import React from 'react'
import { describe, expect, it, vi, beforeEach } from 'vitest'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'

const mocks = vi.hoisted(() => ({
  revertTransaction: vi.fn(),
}))

vi.mock('@/lib/actions', () => ({
  revertTransaction: mocks.revertTransaction,
}))

import HistoryView from '@/app/(protected)/history/HistoryView'

describe('HistoryView', () => {
  beforeEach(() => {
    mocks.revertTransaction.mockReset()
    mocks.revertTransaction.mockResolvedValue({ success: true })
  })

  async function openComboboxAndPick(label: string, option: string) {
    const trigger = screen.getByRole('combobox', { name: label })
    fireEvent.click(trigger)
    fireEvent.click(await screen.findByRole('option', { name: option }))
    return trigger
  }

  it('keeps only the core history filters in a two-row toolbar and preserves source metadata in the table', async () => {
    render(
      React.createElement(HistoryView, {
        models: [
          { id: 1, name: 'LP01' },
          { id: 2, name: 'LP02' },
        ],
        warehouses: [
          { id: 1, name: '오금동' },
          { id: 2, name: '대자동' },
        ],
        transactions: [
          {
            id: 1,
            date: '26.04.15',
            type: '입고',
            quantity: 3,
            warehouse: '오금동',
            warehouseId: 1,
            sourceChannel: 'manual',
            referenceType: null,
            referenceId: null,
            memo: null,
            createdAt: '2026-04-15T09:00:00.000Z',
            modelName: 'LP01',
            sizeName: 'S',
            colorName: '네이비',
            colorRgb: '#111111',
            canRevert: true,
            revertDisabledReason: null,
            revertSummary: '같은 수량의 출고 보정 이력이 추가됩니다.',
          },
          {
            id: 2,
            date: '26.04.14',
            type: '입고',
            quantity: 2,
            warehouse: '오금동',
            warehouseId: 1,
            sourceChannel: 'csv',
            referenceType: null,
            referenceId: null,
            memo: null,
            createdAt: '2026-04-14T09:00:00.000Z',
            modelName: 'LP02',
            sizeName: 'M',
            colorName: '블랙',
            colorRgb: '#000000',
            canRevert: false,
            revertDisabledReason: 'CSV 반영',
            revertSummary: null,
          },
          {
            id: 3,
            date: '26.04.13',
            type: '출고',
            quantity: 1,
            warehouse: '대자동',
            warehouseId: 2,
            sourceChannel: 'history-revert',
            referenceType: 'transaction_revert',
            referenceId: 99,
            memo: '되돌리기 완료',
            createdAt: '2026-04-13T09:00:00.000Z',
            modelName: 'LP02',
            sizeName: 'L',
            colorName: '화이트',
            colorRgb: '#ffffff',
            canRevert: false,
            revertDisabledReason: '이미 시스템 참조가 있는 행',
            revertSummary: null,
          },
          {
            id: 4,
            date: '26.04.12',
            type: '입고',
            quantity: 5,
            warehouse: '오금동',
            warehouseId: 1,
            sourceChannel: 'factory-arrival',
            referenceType: 'factory_arrival',
            referenceId: 17,
            memo: null,
            createdAt: '2026-04-12T09:00:00.000Z',
            modelName: 'LP02',
            sizeName: 'S',
            colorName: '네이비',
            colorRgb: '#111111',
            canRevert: false,
            revertDisabledReason: '예정입고 반영',
            revertSummary: null,
          },
        ],
      }),
    )

    expect(screen.queryByRole('heading', { name: '이력 필터' })).toBeNull()
    expect(screen.queryByText('모델, 창고, 기간을 좁혀 입고·출고·재고조정 이력을 빠르게 확인하세요.')).toBeNull()
    expect(screen.queryByText('최근순 정렬')).toBeNull()
    expect(screen.queryByRole('combobox', { name: '모델' })).toBeNull()
    expect(screen.queryByRole('combobox', { name: '등록 방식' })).toBeNull()

    const basicFilters = screen.getByRole('group', { name: '기본 필터' })
    const queryFilters = screen.getByRole('group', { name: '조회 필터' })
    const metaGroup = screen.getByRole('group', { name: '필터 메타' })

    expect(within(basicFilters).getByRole('combobox', { name: '창고' })).toBeTruthy()
    expect(within(basicFilters).getByRole('combobox', { name: '구분' })).toBeTruthy()
    expect(within(queryFilters).getByLabelText('모델명 검색')).toBeTruthy()
    expect(within(queryFilters).getByLabelText('시작일')).toBeTruthy()
    expect(within(queryFilters).getByLabelText('종료일')).toBeTruthy()
    expect(within(metaGroup).getByText('조회 4건')).toBeTruthy()
    expect(within(metaGroup).queryByRole('button', { name: '필터 초기화' })).toBeNull()
    expect(screen.getByTestId('history-search-field').className).not.toContain('flex-1')

    const table = screen.getByRole('table')
    expect(within(table).getByRole('button', { name: '되돌리기' })).toBeTruthy()
    expect(within(table).getByText('CSV 반영')).toBeTruthy()
    expect(within(table).getAllByText('예정입고 반영')).toHaveLength(2)
    expect(within(table).getByText('이력 되돌리기')).toBeTruthy()

    fireEvent.change(screen.getByLabelText('모델명 검색'), { target: { value: 'LP01' } })
    await openComboboxAndPick('구분', '입고')

    expect(within(metaGroup).getByText('조회 1건')).toBeTruthy()
    expect(within(metaGroup).getByRole('button', { name: '필터 초기화' })).toBeTruthy()
    expect(within(screen.getByRole('table')).getByText('LP01')).toBeTruthy()
    expect(within(screen.getByRole('table')).queryByText('LP02')).toBeNull()
  })

  it('keeps the embedded history view on the same dropdown vocabulary and emits controlled filter changes', async () => {
    const handleFiltersChange = vi.fn()

    render(
      React.createElement(HistoryView, {
        models: [{ id: 1, name: 'LP01' }],
        warehouses: [
          { id: 1, name: '오금동' },
          { id: 2, name: '대자동' },
        ],
        filters: {
          warehouseId: '',
          type: '',
          search: '',
          dateFrom: '',
          dateTo: '',
        },
        onFiltersChange: handleFiltersChange,
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
            referenceType: null,
            referenceId: null,
            memo: null,
            createdAt: '2026-04-13T00:00:00.000Z',
            modelName: 'LP01',
            sizeName: 'S',
            colorName: '네이비',
            colorRgb: '#111111',
            canRevert: true,
            revertDisabledReason: null,
            revertSummary: '같은 수량의 출고 보정 이력이 추가됩니다.',
          },
        ],
      }),
    )

    expect(screen.getByRole('combobox', { name: '창고' })).toBeTruthy()
    expect(screen.queryByText('창고: 오금동')).toBeNull()
    expect(screen.getByText('조회 1건')).toBeTruthy()

    await openComboboxAndPick('창고', '오금동')

    expect(handleFiltersChange).toHaveBeenCalledWith({
      warehouseId: 1,
      type: '',
      search: '',
      dateFrom: '',
      dateTo: '',
    })
  })

  it('confirms a revert action through the modal and submits the memo', async () => {
    render(
      React.createElement(HistoryView, {
        models: [{ id: 1, name: 'LP01' }],
        warehouses: [{ id: 1, name: '오금동' }],
        transactions: [
          {
            id: 7,
            date: '26.04.15',
            type: '재고조정',
            quantity: 4,
            warehouse: '오금동',
            warehouseId: 1,
            sourceChannel: 'manual',
            referenceType: null,
            referenceId: null,
            memo: null,
            createdAt: '2026-04-15T09:00:00.000Z',
            modelName: 'LP01',
            sizeName: 'S',
            colorName: '네이비',
            colorRgb: '#111111',
            canRevert: true,
            revertDisabledReason: null,
            revertSummary: '직전 재고값으로 재고조정 이력이 추가됩니다.',
          },
        ],
      }),
    )

    fireEvent.click(within(screen.getByRole('table')).getByRole('button', { name: '되돌리기' }))

    const dialog = screen.getByRole('dialog', { name: '이력 되돌리기 확인' })
    expect(within(dialog).getByText('LP01')).toBeTruthy()
    expect(within(dialog).getByText('직전 재고값으로 재고조정 이력이 추가됩니다.')).toBeTruthy()

    fireEvent.change(within(dialog).getByLabelText('되돌리기 메모'), { target: { value: '잘못 조정함' } })
    fireEvent.click(within(dialog).getByRole('button', { name: '되돌리기' }))

    await waitFor(() => {
      expect(mocks.revertTransaction).toHaveBeenCalledWith(7, '잘못 조정함')
    })
    expect(screen.getByText('이력이 되돌려졌습니다.')).toBeTruthy()
  })
})

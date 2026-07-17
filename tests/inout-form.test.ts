// @vitest-environment jsdom
import React from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'

const mocks = vi.hoisted(() => ({
  refresh: vi.fn(),
}))

vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: mocks.refresh }),
}))

vi.mock('@/lib/actions', () => ({
  createTransactions: vi.fn(),
  createManualInventoryOperations: vi.fn(),
  getCurrentStock: vi.fn(),
}))

import InOutForm from '@/app/(protected)/inout/InOutForm'

beforeEach(() => {
  mocks.refresh.mockReset()
})

afterEach(() => {
  cleanup()
  vi.useRealTimers()
})

describe('InOutForm', () => {
  async function openComboboxAndPick(label: string, option: string, index = 0) {
    const trigger = screen.getAllByRole('combobox', { name: label })[index]
    fireEvent.click(trigger)
    fireEvent.click(await screen.findByRole('option', { name: option }))
    return trigger
  }

  it('shows the warehouse setup CTA when no warehouses exist', () => {
    render(
      React.createElement(InOutForm, {
        warehouses: [],
        models: [],
      }),
    )

    expect(screen.getByText('창고가 없습니다.')).toBeTruthy()
    expect(screen.getByRole('link', { name: '창고 등록하러 가기' }).getAttribute('href')).toBe('/products')
  })

  it('uses the local calendar date instead of the previous UTC date', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-07-14T16:00:00.000Z'))

    render(React.createElement(InOutForm, { warehouses: [], models: [] }))

    expect((screen.getByLabelText('날짜') as HTMLInputElement).value).toBe('2026-07-15')
  })

  it('selects the only warehouse by default', () => {
    render(
      React.createElement(InOutForm, {
        warehouses: [{ id: 7, name: '본사 창고' }],
        models: [],
      }),
    )

    expect(screen.getByRole('combobox', { name: '창고' }).textContent).toContain('본사 창고')
  })

  it('keeps the first warehouse selected and lets the user switch warehouses', async () => {
    render(
      React.createElement(InOutForm, {
        warehouses: [
          { id: 7, name: '본사 창고' },
          { id: 9, name: '대전 창고' },
        ],
        models: [],
      }),
    )

    expect(screen.getByRole('combobox', { name: '창고' }).textContent).toContain('본사 창고')

    await openComboboxAndPick('창고', '대전 창고')
    expect(screen.getByRole('combobox', { name: '창고' }).textContent).toContain('대전 창고')
  })

  it('keeps the editor manual-only and removes the old paste-import panel', () => {
    render(
      React.createElement(InOutForm, {
        warehouses: [{ id: 7, name: '본사 창고' }],
        models: [
          {
            id: 1,
            name: 'LP01',
            sizes: [{ id: 11, name: 'S', sortOrder: 1, modelId: 1 }],
            colors: [{ id: 21, name: '네이비', rgbCode: '#111111', textWhite: true, sortOrder: 1, modelId: 1 }],
          },
        ],
      }),
    )

    expect(screen.queryByRole('button', { name: '표 붙여넣기' })).toBeNull()
    expect(screen.queryByLabelText('붙여넣기')).toBeNull()
    expect(screen.queryByRole('button', { name: '행으로 가져오기' })).toBeNull()
    expect(screen.queryByRole('button', { name: '초기화' })).toBeNull()
    expect(screen.getByRole('button', { name: '행 추가' })).toBeTruthy()
    expect(screen.getAllByRole('button', { name: '행 복제' }).length).toBeGreaterThan(0)
  })

  it('shows incomplete row validation through the editable table', async () => {
    render(
      React.createElement(InOutForm, {
        warehouses: [{ id: 7, name: '본사 창고' }],
        models: [
          {
            id: 1,
            name: 'LP01',
            sizes: [{ id: 11, name: 'S', sortOrder: 1, modelId: 1 }],
            colors: [{ id: 21, name: '네이비', rgbCode: '#111111', textWhite: true, sortOrder: 1, modelId: 1 }],
          },
        ],
      }),
    )

    await openComboboxAndPick('상품', 'LP01')

    expect(screen.getByRole('alert').textContent).toContain('사이즈, 색상, 수량 필요')
  })

  it('locks the overlay to the requested transaction type', () => {
    render(
      React.createElement(InOutForm, {
        warehouses: [{ id: 7, name: '본사 창고' }],
        models: [],
        initialType: '출고',
      }),
    )

    expect(screen.getByLabelText('날짜')).toBeTruthy()
    expect(screen.getByText('창고')).toBeTruthy()
    expect(screen.getByRole('button', { name: '수동 출고 등록 (0건)' })).toBeTruthy()
    expect(screen.queryByRole('button', { name: '입고/출고 전환' })).toBeNull()
    expect(screen.queryByText('표 붙여넣기')).toBeNull()
  })

  it('requires an auditable reason for quick inbound, manual outbound, and stock counts', () => {
    const { rerender } = render(
      React.createElement(InOutForm, {
        warehouses: [{ id: 7, name: '본사 창고' }],
        models: [],
        operation: 'inbound',
      }),
    )

    expect(screen.getByLabelText('빠른 입고 사유')).toBeTruthy()
    expect(screen.getByRole('button', { name: '입고 등록 (0건)' })).toBeTruthy()

    rerender(
      React.createElement(InOutForm, {
        warehouses: [{ id: 7, name: '본사 창고' }],
        models: [],
        operation: 'manual-outbound',
      }),
    )

    expect(screen.getByLabelText('수동 출고 사유')).toBeTruthy()
    expect(screen.getByRole('button', { name: '수동 출고 등록 (0건)' })).toBeTruthy()

    rerender(
      React.createElement(InOutForm, {
        warehouses: [{ id: 7, name: '본사 창고' }],
        models: [],
        operation: 'count-adjustment',
      }),
    )

    expect(screen.getByLabelText('실사 조정 사유')).toBeTruthy()
    expect(screen.getByRole('columnheader', { name: '실사 수량' })).toBeTruthy()
  })

  it('uses product language rather than the legacy model label in the editor', () => {
    render(
      React.createElement(InOutForm, {
        warehouses: [{ id: 7, name: '본사 창고' }],
        models: [],
      }),
    )

    expect(screen.getByRole('columnheader', { name: '상품' })).toBeTruthy()
    expect(screen.queryByRole('columnheader', { name: '모델' })).toBeNull()
    expect(screen.getAllByRole('combobox', { name: '상품' }).length).toBeGreaterThan(0)
  })
})

// @vitest-environment jsdom
import React from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'

const mocks = vi.hoisted(() => ({
  refresh: vi.fn(),
}))

vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: mocks.refresh }),
}))

vi.mock('@/lib/actions', () => ({
  createTransactions: vi.fn(),
  getCurrentStock: vi.fn(),
}))

import InOutForm from '@/app/(protected)/inout/InOutForm'

beforeEach(() => {
  mocks.refresh.mockReset()
})

describe('InOutForm', () => {
  function getWarehouseSelect() {
    const label = screen.getByText('창고')
    const select = label.parentElement?.querySelector('select')
    if (!select) throw new Error('warehouse select not found')
    return select
  }

  it('shows the warehouse setup CTA when no warehouses exist', () => {
    render(
      React.createElement(InOutForm, {
        warehouses: [],
        models: [],
      }),
    )

    expect(screen.getByText('창고가 없습니다.')).toBeTruthy()
    expect(screen.getByRole('link', { name: '창고 등록하러 가기' }).getAttribute('href')).toBe('/settings/master-data')
    expect(screen.getByText('입출고 등록은 창고 등록 후 이용할 수 있습니다.')).toBeTruthy()
  })

  it('selects the only warehouse by default', () => {
    render(
      React.createElement(InOutForm, {
        warehouses: [{ id: 7, name: '본사 창고' }],
        models: [],
      }),
    )

    expect((getWarehouseSelect() as HTMLSelectElement).value).toBe('7')
  })

  it('keeps the first warehouse selected and lets the user switch warehouses', () => {
    render(
      React.createElement(InOutForm, {
        warehouses: [
          { id: 7, name: '본사 창고' },
          { id: 9, name: '대전 창고' },
        ],
        models: [],
      }),
    )

    const warehouseSelect = getWarehouseSelect()
    expect((warehouseSelect as HTMLSelectElement).value).toBe('7')

    fireEvent.change(warehouseSelect, { target: { value: '9' } })
    expect((warehouseSelect as HTMLSelectElement).value).toBe('9')
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
    expect(screen.getAllByRole('button', { name: '행 복제' }).length).toBeGreaterThan(0)
  })
})

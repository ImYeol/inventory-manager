// @vitest-environment jsdom
import React from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, within, waitFor } from '@testing-library/react'

const mocks = vi.hoisted(() => ({
  refresh: vi.fn(),
  createFactory: vi.fn(),
  setFactoryActive: vi.fn(),
}))

vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: mocks.refresh }),
}))

vi.mock('@/lib/actions', () => ({
  createFactory: mocks.createFactory,
  setFactoryActive: mocks.setFactoryActive,
}))

import FactoriesView from '@/app/(protected)/sourcing/factories/FactoriesView'

beforeEach(() => {
  Object.values(mocks).forEach((mock) => mock.mockReset())
})

async function chooseSelectOption(label: string, optionName: string) {
  fireEvent.click(screen.getByRole('combobox', { name: label }))
  fireEvent.click(await screen.findByRole('option', { name: optionName }))
}

describe('FactoriesView', () => {
  it('shows the toolbar, filters the table, and opens the detail modal', async () => {
    mocks.setFactoryActive.mockResolvedValue({ success: true })

    render(
      React.createElement(FactoriesView, {
        schemaState: { status: 'ready', message: null },
        factories: [
          {
            id: 1,
            name: '광주 협력사',
            contactName: '홍길동',
            phone: '010-1111-2222',
            email: 'gwangju@example.com',
            notes: '주력 공장',
            isActive: true,
            arrivalCount: 2,
            pendingQuantity: 24,
          },
          {
            id: 2,
            name: '부산 협력사',
            contactName: '김철수',
            phone: '010-3333-4444',
            email: null,
            notes: null,
            isActive: false,
            arrivalCount: 1,
            pendingQuantity: 6,
          },
        ],
        factorySourcingItems: {
          2: [
            {
              expectedDate: '2026-04-22',
              status: '예정',
              modelName: 'LP01',
              sizeName: 'S',
              colorName: '네이비',
              orderedQuantity: 6,
              receivedQuantity: 0,
              remainingQuantity: 6,
            },
          ],
        },
      }),
    )

    expect(screen.getByRole('heading', { name: '외부 공장' })).toBeTruthy()
    expect(screen.getByRole('button', { name: '공장 등록' })).toBeTruthy()
    expect(screen.queryByRole('heading', { name: '공장 목록' })).toBeNull()
    expect(screen.queryByText('행의 상세 버튼으로 공장 정보를 확인하고 상태를 변경합니다.')).toBeNull()
    expect(screen.queryByText(/총 \d+개/)).toBeNull()
    expect(screen.getByRole('table', { name: '공장 목록' })).toBeTruthy()
    expect(screen.getByRole('table', { name: '공장 목록' }).closest('.ui-table-shell')).toBeTruthy()

    fireEvent.change(screen.getByRole('searchbox', { name: '공장 검색' }), { target: { value: '부산' } })
    expect(screen.getByRole('row', { name: /부산 협력사/ })).toBeTruthy()
    expect(screen.queryByRole('row', { name: /광주 협력사/ })).toBeNull()

    await chooseSelectOption('상태 필터', '비활성')
    expect(screen.getByRole('row', { name: /부산 협력사/ })).toBeTruthy()
    expect(screen.queryByRole('row', { name: /광주 협력사/ })).toBeNull()

    fireEvent.click(screen.getByRole('button', { name: '상세' }))

    expect(screen.getByRole('dialog', { name: '부산 협력사' })).toBeTruthy()
    expect(screen.getByText('김철수')).toBeTruthy()
    expect(screen.getByText('잔여 6개')).toBeTruthy()
    expect(screen.getByRole('table', { name: '상품 소싱 내역' })).toBeTruthy()
    expect(screen.getByText('LP01')).toBeTruthy()
    expect(screen.getByText('네이비 / S')).toBeTruthy()

    fireEvent.click(screen.getByRole('button', { name: '다시 활성화' }))

    await waitFor(() => expect(mocks.setFactoryActive).toHaveBeenCalledWith(2, true))
  })

  it('opens the register modal and submits a new factory', async () => {
    mocks.createFactory.mockResolvedValue({ success: true })

    render(
      React.createElement(FactoriesView, {
        schemaState: { status: 'ready', message: null },
        factories: [],
        factorySourcingItems: {},
      }),
    )

    fireEvent.click(screen.getByRole('button', { name: '공장 등록' }))

    const dialog = screen.getByRole('dialog', { name: '공장 등록' })
    const form = within(dialog)
    fireEvent.change(form.getByPlaceholderText('예: 광주 봉제 협력사'), { target: { value: '부산 협력사' } })
    fireEvent.change(form.getByPlaceholderText('담당자 이름'), { target: { value: '홍길동' } })
    fireEvent.change(form.getByPlaceholderText('010-0000-0000'), { target: { value: '010-2222-3333' } })
    fireEvent.change(form.getByPlaceholderText('factory@example.com'), { target: { value: 'factory@example.com' } })
    fireEvent.change(form.getByPlaceholderText('납기 메모, 연락 가능 시간, 특이사항'), { target: { value: '야간 연락' } })
    fireEvent.click(form.getByRole('button', { name: '등록' }))

    await waitFor(() =>
      expect(mocks.createFactory).toHaveBeenCalledWith(
        expect.objectContaining({
          name: '부산 협력사',
          contactName: '홍길동',
          phone: '010-2222-3333',
          email: 'factory@example.com',
          notes: '야간 연락',
        }),
      ),
    )
  })

  it('shows the setup banner and disables factory registration when sourcing schema is missing', async () => {
    render(
      React.createElement(FactoriesView, {
        schemaState: {
          status: 'missing',
          message: '소싱 스키마가 아직 배포되지 않았습니다. supabase/schema.sql 적용 후 다시 시도하세요.',
        },
        factories: [],
        factorySourcingItems: {},
      }),
    )

    expect(screen.getByText('소싱 스키마가 아직 배포되지 않았습니다. supabase/schema.sql 적용 후 다시 시도하세요.')).toBeTruthy()
    expect(screen.getByRole('button', { name: '공장 등록' }).getAttribute('disabled')).not.toBeNull()

    fireEvent.click(screen.getByRole('button', { name: '공장 등록' }))

    expect(screen.queryByRole('dialog', { name: '공장 등록' })).toBeNull()
  })
})

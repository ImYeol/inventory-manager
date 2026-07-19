// @vitest-environment jsdom
import React from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, within, waitFor } from '@testing-library/react'

const mocks = vi.hoisted(() => ({
  refresh: vi.fn(),
  createFactory: vi.fn(),
  setFactoryActive: vi.fn(),
  getInboundTemplatesForSupplier: vi.fn(),
  createInboundTemplateVersion: vi.fn(),
  inspectInboundTemplateSample: vi.fn(),
  setInboundTemplateActive: vi.fn(),
}))

vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: mocks.refresh }),
}))

vi.mock('@/lib/actions', () => ({
  createFactory: mocks.createFactory,
  setFactoryActive: mocks.setFactoryActive,
}))

vi.mock('@/lib/actions/inbound-import', () => ({
  getInboundTemplatesForSupplier: mocks.getInboundTemplatesForSupplier,
  createInboundTemplateVersion: mocks.createInboundTemplateVersion,
  inspectInboundTemplateSample: mocks.inspectInboundTemplateSample,
  setInboundTemplateActive: mocks.setInboundTemplateActive,
}))

import FactoriesView from '@/app/(protected)/sourcing/factories/FactoriesView'

beforeEach(() => {
  Object.values(mocks).forEach((mock) => mock.mockReset())
  mocks.getInboundTemplatesForSupplier.mockResolvedValue([])
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

    expect(screen.getByRole('heading', { name: '입고처' })).toBeTruthy()
    expect(screen.getByRole('button', { name: '입고처 등록' })).toBeTruthy()
    expect(screen.queryByRole('heading', { name: '공장 목록' })).toBeNull()
    expect(screen.queryByText('행의 상세 버튼으로 공장 정보를 확인하고 상태를 변경합니다.')).toBeNull()
    expect(screen.queryByText(/총 \d+개/)).toBeNull()
    expect(screen.getByRole('table', { name: '입고처 목록' })).toBeTruthy()
    expect(screen.getByRole('table', { name: '입고처 목록' }).closest('.ui-data-surface')).toBeTruthy()

    fireEvent.change(screen.getByRole('searchbox', { name: '입고처 검색' }), { target: { value: '부산' } })
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
    await waitFor(() => expect(mocks.getInboundTemplatesForSupplier).toHaveBeenCalledWith(2))

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

    fireEvent.click(screen.getByRole('button', { name: '입고처 등록' }))

    const dialog = screen.getByRole('dialog', { name: '입고처 등록' })
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
    expect(screen.getByRole('button', { name: '입고처 등록' }).getAttribute('disabled')).not.toBeNull()

    fireEvent.click(screen.getByRole('button', { name: '입고처 등록' }))

    expect(screen.queryByRole('dialog', { name: '입고처 등록' })).toBeNull()
  })

  it('manages parse templates for the selected 입고처 from the detail modal', async () => {
    mocks.getInboundTemplatesForSupplier.mockResolvedValue([
      { id: 7, name: '중국 공장 기본', versionId: 11, versionNumber: 2, active: true },
    ])
    mocks.inspectInboundTemplateSample.mockResolvedValue({ sheets: [{ name: '입고', rows: [['외부 SKU', '수량'], ['EXT-1', '3']] }] })
    mocks.createInboundTemplateVersion.mockResolvedValue({ id: 8, name: '새 템플릿', versionId: 20, versionNumber: 1 })

    render(
      React.createElement(FactoriesView, {
        schemaState: { status: 'ready', message: null },
        factories: [
          { id: 1, name: '광주 협력사', contactName: null, phone: null, email: null, notes: null, isActive: true, arrivalCount: 0, pendingQuantity: 0 },
        ],
        factorySourcingItems: {},
      }),
    )

    fireEvent.click(screen.getByRole('button', { name: '상세' }))
    await waitFor(() => expect(mocks.getInboundTemplatesForSupplier).toHaveBeenCalledWith(1))
    expect(await screen.findByText('중국 공장 기본')).toBeTruthy()
    expect(screen.getByText('v2')).toBeTruthy()

    fireEvent.click(screen.getByRole('button', { name: '새 파싱 템플릿' }))
    const versionDialog = await screen.findByRole('dialog', { name: '새 입고 파싱 템플릿' })
    const versionForm = within(versionDialog)
    fireEvent.change(versionForm.getByLabelText('파싱 템플릿 이름'), { target: { value: '새 템플릿' } })
    const file = new File(['contents'], 'sample.xlsx')
    fireEvent.change(versionForm.getByLabelText('샘플 파일'), { target: { files: [file] } })
    await waitFor(() => expect(mocks.inspectInboundTemplateSample).toHaveBeenCalledWith(file))
    fireEvent.click(versionForm.getByRole('combobox', { name: '외부 SKU 열' }))
    fireEvent.click(await screen.findByRole('option', { name: '외부 SKU' }))
    fireEvent.click(versionForm.getByRole('combobox', { name: '수량 열' }))
    fireEvent.click(await screen.findByRole('option', { name: '수량' }))
    fireEvent.click(versionForm.getByRole('button', { name: '버전 저장' }))

    await waitFor(() => expect(mocks.createInboundTemplateVersion).toHaveBeenCalledWith(expect.objectContaining({ supplierId: 1, name: '새 템플릿' })))
  })
})

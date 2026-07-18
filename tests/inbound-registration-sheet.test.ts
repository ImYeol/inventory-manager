// @vitest-environment jsdom
import React from 'react'
import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'

const mocks = vi.hoisted(() => ({
  previewInboundTemplateFile: vi.fn(),
  saveInboundTemplateDraft: vi.fn(),
  inspectInboundTemplateSample: vi.fn(),
  createInboundTemplateVersion: vi.fn(),
}))

vi.mock('@/lib/actions/inbound-import', () => mocks)

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
}))

import InboundRegistrationSheet from '@/app/components/inventory/InboundRegistrationSheet'

const templates = [{ id: 7, name: '중국 공장 기본', versionId: 11, versionNumber: 1 }]

describe('InboundRegistrationSheet', () => {
  it('shows one unified entry surface with template, a large upload area, and editable manual rows', () => {
    render(React.createElement(InboundRegistrationSheet, {
      suppliers: [{ id: 4, name: '한빛 공장' }], warehouses: [{ id: 2, name: '대자동' }], templates,
      initialWarehouseId: 2,
    }))

    expect(screen.getByRole('combobox', { name: '입고 템플릿' })).toBeTruthy()
    expect(screen.getByLabelText('입고 파일 업로드')).toBeTruthy()
    expect(screen.getByText('파일을 놓거나 선택하세요')).toBeTruthy()
    expect(screen.getByRole('button', { name: '행 추가' })).toBeTruthy()
    expect(screen.getByRole('button', { name: '초안 저장' })).toBeTruthy()
    expect(screen.queryByRole('tab')).toBeNull()
  })

  it('uses the selected template to preview a file, then keeps the preview editable before draft save', async () => {
    mocks.previewInboundTemplateFile.mockResolvedValue({
      supplierId: 4, warehouseId: 2, templateId: 7, templateVersionId: 11, sheetName: '입고', headerRowNumber: 1, headers: ['외부 SKU', '수량'], fileHash: 'hash',
      rows: [{ sourceRowNumber: 2, externalSku: 'EXT-1', quantity: 3, validationError: null, productVariantId: null, sourceValues: {} }],
    })
    mocks.saveInboundTemplateDraft.mockResolvedValue({ success: true, id: 88 })
    const onSaved = vi.fn()
    render(React.createElement(InboundRegistrationSheet, {
      suppliers: [{ id: 4, name: '한빛 공장' }], warehouses: [{ id: 2, name: '대자동' }], templates,
      initialWarehouseId: 2, onSaved,
    }))

    fireEvent.click(screen.getByRole('combobox', { name: '공급자' }))
    fireEvent.click(await screen.findByRole('option', { name: '한빛 공장' }))
    fireEvent.click(screen.getByRole('combobox', { name: '입고 템플릿' }))
    fireEvent.click(await screen.findByRole('option', { name: '중국 공장 기본 v1' }))
    const file = new File(['contents'], 'inbound.xlsx', { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
    fireEvent.change(screen.getByLabelText('입고 파일 업로드'), { target: { files: [file] } })

    await waitFor(() => expect(mocks.previewInboundTemplateFile).toHaveBeenCalledWith({ supplierId: 4, warehouseId: 2, templateVersionId: 11, file }))
    expect(await screen.findByDisplayValue('EXT-1')).toBeTruthy()
    fireEvent.change(screen.getByLabelText('외부 출고 번호'), { target: { value: 'SHIP-1' } })
    fireEvent.change(screen.getByDisplayValue('3'), { target: { value: '4' } })
    fireEvent.click(screen.getByRole('button', { name: '초안 저장' }))
    await waitFor(() => expect(mocks.saveInboundTemplateDraft).toHaveBeenCalledWith(expect.objectContaining({
      rows: [expect.objectContaining({ externalSku: 'EXT-1', quantity: 4 })], file,
      shipmentNumber: 'SHIP-1',
    })))
    expect(onSaved).toHaveBeenCalledWith(88)
  })

  it('opens template creation from the selection context', () => {
    render(React.createElement(InboundRegistrationSheet, {
      suppliers: [{ id: 4, name: '한빛 공장' }], warehouses: [{ id: 2, name: '대자동' }], templates,
    }))
    fireEvent.click(screen.getByRole('button', { name: '템플릿 만들기' }))
    expect(screen.getByRole('dialog', { name: '입고 템플릿 만들기' })).toBeTruthy()
    expect(screen.getByLabelText('샘플 파일')).toBeTruthy()
  })
})

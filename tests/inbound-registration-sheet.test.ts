// @vitest-environment jsdom
import React from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'

const mocks = vi.hoisted(() => ({
  previewInboundTemplateFile: vi.fn(),
  saveInboundTemplateDraft: vi.fn(),
  inspectInboundTemplateSample: vi.fn(),
  createInboundTemplateVersion: vi.fn(),
  promoteInboundImportRevision: vi.fn(),
  confirmSupplierSkuMapping: vi.fn(),
  listResumableInboundReviews: vi.fn(),
  loadInboundReviewRevision: vi.fn(),
  refresh: vi.fn(),
}))

vi.mock('@/lib/actions/inbound-import', () => mocks)
vi.mock('@/lib/actions/supplier-sku-mapping', () => ({ confirmSupplierSkuMapping: mocks.confirmSupplierSkuMapping }))

vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: mocks.refresh }),
}))

import InboundRegistrationSheet from '@/app/components/inventory/InboundRegistrationSheet'

const templates = [{ id: 7, name: '중국 공장 기본', versionId: 11, versionNumber: 1 }]

beforeEach(() => {
  Object.values(mocks).forEach((mock) => mock.mockReset())
  mocks.listResumableInboundReviews.mockResolvedValue([])
})

describe('InboundRegistrationSheet', () => {
  it('requires a supplier file and keeps manual row entry out of the import surface', () => {
    render(React.createElement(InboundRegistrationSheet, {
      suppliers: [{ id: 4, name: '한빛 공장' }], warehouses: [{ id: 2, name: '대자동' }], templates,
      initialWarehouseId: 2,
    }))

    expect(screen.getByRole('combobox', { name: '입고 파싱 템플릿' })).toBeTruthy()
    expect(screen.getByLabelText('입고 파일 업로드')).toBeTruthy()
    expect(screen.getByText('파일을 놓거나 선택하세요')).toBeTruthy()
    expect(screen.queryByRole('button', { name: '행 추가' })).toBeNull()
    expect(screen.queryByLabelText('외부 SKU')).toBeNull()
    expect(screen.getByRole('button', { name: '검토 저장' })).toBeTruthy()
    expect(screen.queryByRole('combobox', { name: '입고 창고' })).toBeNull()
    expect(screen.queryByRole('tab')).toBeNull()
  })

  it('maps repeated exact SKUs, saves evidence, then promotes before closing', async () => {
    mocks.previewInboundTemplateFile.mockResolvedValue({
      supplierId: 4, warehouseId: 2, templateId: 7, templateVersionId: 11, sheetName: '입고', headerRowNumber: 1, headers: ['외부 SKU', '수량'], fileHash: 'hash',
      rows: [
        { sourceRowNumber: 2, externalSku: ' EXT-1 ', rawQuantity: '3', quantity: 3, validationError: null, productVariantId: null, sourceValues: {} },
        { sourceRowNumber: 3, externalSku: ' EXT-1 ', rawQuantity: '001', quantity: 1, validationError: null, productVariantId: null, sourceValues: {} },
      ],
    })
    mocks.saveInboundTemplateDraft.mockResolvedValue({ success: true, id: 88 })
    mocks.confirmSupplierSkuMapping.mockResolvedValue({ id: 91 })
    mocks.promoteInboundImportRevision.mockResolvedValue(99)
    const onSaved = vi.fn()
    render(React.createElement(InboundRegistrationSheet, {
      suppliers: [{ id: 4, name: '한빛 공장' }], warehouses: [{ id: 2, name: '대자동' }], templates,
      initialWarehouseId: 2, onSaved,
      productVariants: [{ id: 9, label: '티셔츠 · M / 블랙 · TS-M-BLK' }],
    }))

    fireEvent.click(screen.getByRole('combobox', { name: '공급자' }))
    fireEvent.click(await screen.findByRole('option', { name: '한빛 공장' }))
    fireEvent.click(screen.getByRole('combobox', { name: '입고 파싱 템플릿' }))
    fireEvent.click(await screen.findByRole('option', { name: '중국 공장 기본 v1' }))
    const file = new File(['contents'], 'inbound.xlsx', { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
    fireEvent.change(screen.getByLabelText('입고 파일 업로드'), { target: { files: [file] } })

    await waitFor(() => expect(mocks.previewInboundTemplateFile).toHaveBeenCalledWith({ supplierId: 4, templateVersionId: 11, file }))
    expect(screen.queryByRole('combobox', { name: '입고 창고' })).toBeNull()
    await waitFor(() => expect(screen.getAllByText('EXT-1')).toHaveLength(2))
    expect(screen.getByText('상품 관리에서 SKU 만들기')).toBeTruthy()
    fireEvent.click(screen.getAllByRole('combobox', { name: '내부 SKU' })[0])
    fireEvent.click(await screen.findByRole('option', { name: '티셔츠 · M / 블랙 · TS-M-BLK' }))
    fireEvent.click(screen.getAllByRole('button', { name: '연결' })[0])
    await waitFor(() => expect(mocks.confirmSupplierSkuMapping).toHaveBeenCalledWith({ supplierId: 4, externalSku: ' EXT-1 ', productVariantId: 9 }))
    await waitFor(() => expect(screen.getAllByText('연결됨')).toHaveLength(2))
    fireEvent.change(screen.getByLabelText('외부 출고 번호'), { target: { value: 'SHIP-1' } })
    fireEvent.click(screen.getByRole('button', { name: '검토 저장' }))
    await waitFor(() => expect(mocks.saveInboundTemplateDraft).toHaveBeenCalledWith(expect.objectContaining({
      rows: [expect.objectContaining({ externalSku: ' EXT-1 ', quantity: 3 }), expect.objectContaining({ rawQuantity: '001' })], file,
      shipmentNumber: 'SHIP-1',
    })))
    expect(onSaved).not.toHaveBeenCalled()
    expect(await screen.findByText('2단계 · 입고 예정 전환')).toBeTruthy()
    expect(screen.getByRole('combobox', { name: '입고 창고' })).toBeTruthy()
    await waitFor(() => expect((screen.getByRole('button', { name: '입고 예정 전환' }) as HTMLButtonElement).disabled).toBe(false))
    fireEvent.click(screen.getByRole('button', { name: '입고 예정 전환' }))
    await waitFor(() => expect(mocks.promoteInboundImportRevision).toHaveBeenCalledWith({ revisionId: 88, defaultWarehouseId: 2 }))
    expect(onSaved).toHaveBeenCalledWith(99)
  })

  it('opens template creation from the selection context', () => {
    render(React.createElement(InboundRegistrationSheet, {
      suppliers: [{ id: 4, name: '한빛 공장' }], warehouses: [{ id: 2, name: '대자동' }], templates,
    }))
    fireEvent.click(screen.getByRole('button', { name: '파싱 템플릿 만들기' }))
    expect(screen.getByRole('dialog', { name: '입고 파싱 템플릿 만들기' })).toBeTruthy()
    expect(screen.getByLabelText('샘플 파일')).toBeTruthy()
  })

  it('does not expose product creation until file review finds an unresolved SKU', () => {
    render(React.createElement(InboundRegistrationSheet, {
      suppliers: [{ id: 4, name: '한빛 공장' }], warehouses: [{ id: 2, name: '대자동' }], templates,
    }))

    expect(screen.queryByRole('link', { name: '상품 관리에서 SKU 만들기' })).toBeNull()
    expect(mocks.refresh).not.toHaveBeenCalled()
  })

  it('does not create a separate manual supplier-import path when launched from arrivals', () => {
    render(React.createElement(InboundRegistrationSheet, {
      suppliers: [], warehouses: [], templates: [], returnTo: '/sourcing/arrivals',
    }))

    expect(screen.queryByRole('button', { name: '행 추가' })).toBeNull()
    expect(screen.getByText('파일을 올리면 원본 행을 검토하고 내부 SKU를 연결할 수 있습니다.')).toBeTruthy()
  })

  it('saves invalid or unmapped evidence while keeping promotion blocked', async () => {
    mocks.previewInboundTemplateFile.mockResolvedValue({
      supplierId: 4, templateId: 7, templateVersionId: 11, sheetName: '입고', headerRowNumber: 1, headers: ['외부 SKU', '수량'], fileHash: 'hash',
      rows: [{ sourceRowNumber: 2, externalSku: 'UNKNOWN', rawQuantity: 'oops', quantity: null, validationError: '수량은 양의 정수여야 합니다.', productVariantId: null, sourceValues: { '상품명': '原本商品' } }],
    })
    mocks.saveInboundTemplateDraft.mockResolvedValue({ success: true, id: 88, blockers: [2] })
    render(React.createElement(InboundRegistrationSheet, {
      suppliers: [{ id: 4, name: '한빛 공장' }], warehouses: [{ id: 2, name: '대자동' }], templates,
    }))

    fireEvent.click(screen.getByRole('combobox', { name: '공급자' }))
    fireEvent.click(await screen.findByRole('option', { name: '한빛 공장' }))
    fireEvent.click(screen.getByRole('combobox', { name: '입고 파싱 템플릿' }))
    fireEvent.click(await screen.findByRole('option', { name: '중국 공장 기본 v1' }))
    const file = new File(['contents'], 'invalid.xlsx')
    fireEvent.change(screen.getByLabelText('입고 파일 업로드'), { target: { files: [file] } })
    await screen.findByText('UNKNOWN')
    fireEvent.change(screen.getByLabelText('외부 출고 번호'), { target: { value: 'SHIP-BLOCKED' } })

    const save = screen.getByRole('button', { name: '검토 저장' }) as HTMLButtonElement
    expect(save.disabled).toBe(false)
    fireEvent.click(save)
    await waitFor(() => expect(mocks.saveInboundTemplateDraft).toHaveBeenCalled())
    expect(screen.getByRole('button', { name: '입고 예정 전환' })).toHaveProperty('disabled', true)
    expect(screen.getByText(/2행.*보정/)).toBeTruthy()
  })

  it('lists and resumes a saved review with ordered raw evidence and issues', async () => {
    mocks.listResumableInboundReviews.mockResolvedValue([{ id: 88, supplierName: '한빛 공장', shipmentNumber: 'SHIP-1', filename: 'arrival.xlsx', createdAt: '2026-07-19T00:00:00Z', rowCount: 2, blockerCount: 1 }])
    mocks.loadInboundReviewRevision.mockResolvedValue({
      revisionId: 88, supplierId: 4, shipmentNumber: 'SHIP-1', templateId: 7, templateVersionId: 11, sheetName: '입고', headerRowNumber: 1, headers: ['외부 SKU', '수량'], fileHash: 'hash',
      rows: [
        { sourceRowId: 901, sourceRowNumber: 7, externalSku: 'A-RED', rawQuantity: '001', quantity: 1, validationError: null, productVariantId: 9, sourceValues: { color: '红' } },
        { sourceRowId: 902, sourceRowNumber: 8, externalSku: 'A-BLUE', rawQuantity: 'bad', quantity: null, validationError: '수량 오류', productVariantId: null, sourceValues: { color: '蓝' } },
      ],
    })
    render(React.createElement(InboundRegistrationSheet, {
      suppliers: [{ id: 4, name: '한빛 공장' }], warehouses: [{ id: 2, name: '대자동' }], templates,
    }))

    expect(await screen.findByText('arrival.xlsx')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: '이어서 검토' }))
    await waitFor(() => expect(mocks.loadInboundReviewRevision).toHaveBeenCalledWith(88))
    const skuCells = screen.getAllByText(/A-(RED|BLUE)/).map((node) => node.textContent)
    expect(skuCells).toEqual(['A-RED', 'A-BLUE'])
    expect(screen.getByText('001')).toBeTruthy()
    expect(screen.getByText(/color: 红/)).toBeTruthy()
    expect(screen.getByText('수량 오류')).toBeTruthy()
  })
})

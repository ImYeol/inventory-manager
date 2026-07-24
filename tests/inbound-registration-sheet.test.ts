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
  getActiveInboundTemplatesForSupplier: vi.fn(),
  refresh: vi.fn(),
}))

vi.mock('@/lib/actions/inbound-import', () => mocks)
vi.mock('@/lib/actions/supplier-sku-mapping', () => ({ confirmSupplierSkuMapping: mocks.confirmSupplierSkuMapping }))

vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: mocks.refresh }),
}))

import InboundRegistrationSheet from '@/app/components/inventory/InboundRegistrationSheet'

const chooseSupplier = async (name: string) => {
  fireEvent.click(screen.getByRole('combobox', { name: '입고처' }))
  fireEvent.click(await screen.findByRole('option', { name }))
}

beforeEach(() => {
  Object.values(mocks).forEach((mock) => mock.mockReset())
  mocks.listResumableInboundReviews.mockResolvedValue([])
  mocks.getActiveInboundTemplatesForSupplier.mockResolvedValue([])
})

describe('InboundRegistrationSheet', () => {
  it('uses the shared wide work dialog for template mapping instead of the legacy modal', async () => {
    render(React.createElement(InboundRegistrationSheet, {
      suppliers: [{ id: 4, name: '한빛 공장' }], warehouses: [{ id: 2, name: '대자동' }],
    }))

    await chooseSupplier('한빛 공장')
    fireEvent.click(screen.getByRole('button', { name: '파싱 템플릿 만들기' }))

    const dialog = screen.getByRole('dialog', { name: '입고 파싱 템플릿 만들기' })
    expect(dialog.getAttribute('data-slot')).toBe('work-dialog-content')
  })

  it('keeps the template select and template-creation button disabled until a 입고처 is chosen', () => {
    render(React.createElement(InboundRegistrationSheet, {
      suppliers: [{ id: 4, name: '한빛 공장' }], warehouses: [{ id: 2, name: '대자동' }],
    }))

    expect((screen.getByRole('combobox', { name: '입고 파싱 템플릿' }) as HTMLButtonElement).disabled).toBe(true)
    expect((screen.getByRole('button', { name: '파싱 템플릿 만들기' }) as HTMLButtonElement).disabled).toBe(true)
  })

  it('scopes the template select to the chosen 입고처 and auto-selects a single active template', async () => {
    mocks.getActiveInboundTemplatesForSupplier.mockResolvedValue([{ id: 7, name: '사용 중 양식', versionId: 11, versionNumber: 1 }])
    render(React.createElement(InboundRegistrationSheet, {
      suppliers: [{ id: 4, name: '한빛 공장' }], warehouses: [{ id: 2, name: '대자동' }],
    }))

    await chooseSupplier('한빛 공장')
    await waitFor(() => expect(mocks.getActiveInboundTemplatesForSupplier).toHaveBeenCalledWith(4))
    expect((screen.getByRole('combobox', { name: '입고 파싱 템플릿' }) as HTMLButtonElement).disabled).toBe(false)
    expect((screen.getByRole('button', { name: '파싱 템플릿 만들기' }) as HTMLButtonElement).disabled).toBe(false)
    await waitFor(() => expect(screen.getByRole('combobox', { name: '입고 파싱 템플릿' }).textContent).toContain('사용 중 양식 v1'))
  })

  it('does not auto-select when the chosen 입고처 has more than one active template', async () => {
    mocks.getActiveInboundTemplatesForSupplier.mockResolvedValue([
      { id: 7, name: '사용 중 양식', versionId: 11, versionNumber: 1 },
      { id: 8, name: '다른 양식', versionId: 12, versionNumber: 1 },
    ])
    render(React.createElement(InboundRegistrationSheet, {
      suppliers: [{ id: 4, name: '한빛 공장' }], warehouses: [{ id: 2, name: '대자동' }],
    }))

    await chooseSupplier('한빛 공장')
    await waitFor(() => expect(mocks.getActiveInboundTemplatesForSupplier).toHaveBeenCalledWith(4))
    fireEvent.click(screen.getByRole('combobox', { name: '입고 파싱 템플릿' }))
    expect(await screen.findByRole('option', { name: '사용 중 양식 v1' })).toBeTruthy()
    expect(screen.getByRole('option', { name: '다른 양식 v1' })).toBeTruthy()
  })

  it('resets the template selection when switching to a different 입고처', async () => {
    mocks.getActiveInboundTemplatesForSupplier.mockImplementation((supplierId: number) =>
      Promise.resolve(supplierId === 4 ? [{ id: 7, name: '사용 중 양식', versionId: 11, versionNumber: 1 }] : []))
    render(React.createElement(InboundRegistrationSheet, {
      suppliers: [{ id: 4, name: '한빛 공장' }, { id: 5, name: '새 공장' }], warehouses: [{ id: 2, name: '대자동' }],
    }))

    await chooseSupplier('한빛 공장')
    await waitFor(() => expect(screen.getByRole('combobox', { name: '입고 파싱 템플릿' }).textContent).toContain('사용 중 양식 v1'))

    await chooseSupplier('새 공장')
    await waitFor(() => expect(mocks.getActiveInboundTemplatesForSupplier).toHaveBeenCalledWith(5))
    expect((screen.getByRole('combobox', { name: '입고 파싱 템플릿' }) as HTMLButtonElement).disabled).toBe(false)
    expect(screen.getByRole('combobox', { name: '입고 파싱 템플릿' }).textContent).not.toContain('사용 중 양식')
  })

  it('requires a supplier file and keeps manual row entry out of the import surface', () => {
    render(React.createElement(InboundRegistrationSheet, {
      suppliers: [{ id: 4, name: '한빛 공장' }], warehouses: [{ id: 2, name: '대자동' }],
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
    mocks.getActiveInboundTemplatesForSupplier.mockResolvedValue([{ id: 7, name: '중국 공장 기본', versionId: 11, versionNumber: 1 }])
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
      suppliers: [{ id: 4, name: '한빛 공장' }], warehouses: [{ id: 2, name: '대자동' }],
      initialWarehouseId: 2, onSaved,
      productVariants: [{ id: 9, label: '티셔츠 · M / 블랙 · TS-M-BLK' }],
    }))

    await chooseSupplier('한빛 공장')
    await waitFor(() => expect(screen.getByRole('combobox', { name: '입고 파싱 템플릿' }).textContent).toContain('중국 공장 기본 v1'))
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

  it('creates a new template under the currently selected 입고처', async () => {
    mocks.getActiveInboundTemplatesForSupplier.mockResolvedValue([])
    mocks.inspectInboundTemplateSample.mockResolvedValue({ sheets: [{ name: '입고', rows: [['외부 SKU', '수량'], ['EXT-1', '3']] }] })
    mocks.createInboundTemplateVersion.mockResolvedValue({ id: 20, name: '새 템플릿', versionId: 30, versionNumber: 1 })
    render(React.createElement(InboundRegistrationSheet, {
      suppliers: [{ id: 4, name: '한빛 공장' }], warehouses: [{ id: 2, name: '대자동' }],
    }))

    await chooseSupplier('한빛 공장')
    await waitFor(() => expect((screen.getByRole('button', { name: '파싱 템플릿 만들기' }) as HTMLButtonElement).disabled).toBe(false))
    fireEvent.click(screen.getByRole('button', { name: '파싱 템플릿 만들기' }))
    expect(screen.getByRole('dialog', { name: '입고 파싱 템플릿 만들기' })).toBeTruthy()
    fireEvent.change(screen.getByLabelText('파싱 템플릿 이름'), { target: { value: '새 템플릿' } })
    const file = new File(['contents'], 'sample.xlsx')
    fireEvent.change(screen.getByLabelText('샘플 파일'), { target: { files: [file] } })
    await waitFor(() => expect(mocks.inspectInboundTemplateSample).toHaveBeenCalledWith(file))
    fireEvent.click(screen.getByRole('combobox', { name: '외부 SKU 열' }))
    fireEvent.click(await screen.findByRole('option', { name: '외부 SKU' }))
    fireEvent.click(screen.getByRole('combobox', { name: '수량 열' }))
    fireEvent.click(await screen.findByRole('option', { name: '수량' }))
    fireEvent.click(screen.getByRole('button', { name: '파싱 템플릿 저장' }))
    await waitFor(() => expect(mocks.createInboundTemplateVersion).toHaveBeenCalledWith(expect.objectContaining({ supplierId: 4, name: '새 템플릿' })))
  })

  it('does not expose product creation until file review finds an unresolved SKU', () => {
    render(React.createElement(InboundRegistrationSheet, {
      suppliers: [{ id: 4, name: '한빛 공장' }], warehouses: [{ id: 2, name: '대자동' }],
    }))

    expect(screen.queryByRole('link', { name: '상품 관리에서 SKU 만들기' })).toBeNull()
    expect(mocks.refresh).not.toHaveBeenCalled()
  })

  it('does not create a separate manual supplier-import path when launched from arrivals', () => {
    render(React.createElement(InboundRegistrationSheet, {
      suppliers: [], warehouses: [], returnTo: '/sourcing/arrivals',
    }))

    expect(screen.queryByRole('button', { name: '행 추가' })).toBeNull()
    expect(screen.getByText('파일을 올리면 원본 행을 검토하고 내부 SKU를 연결할 수 있습니다.')).toBeTruthy()
  })

  it('saves invalid or unmapped evidence while keeping promotion blocked', async () => {
    mocks.getActiveInboundTemplatesForSupplier.mockResolvedValue([{ id: 7, name: '중국 공장 기본', versionId: 11, versionNumber: 1 }])
    mocks.previewInboundTemplateFile.mockResolvedValue({
      supplierId: 4, templateId: 7, templateVersionId: 11, sheetName: '입고', headerRowNumber: 1, headers: ['외부 SKU', '수량'], fileHash: 'hash',
      rows: [{ sourceRowNumber: 2, externalSku: 'UNKNOWN', rawQuantity: 'oops', quantity: null, validationError: '수량은 양의 정수여야 합니다.', productVariantId: null, sourceValues: { '상품명': '原本商品' } }],
    })
    mocks.saveInboundTemplateDraft.mockResolvedValue({ success: true, id: 88, blockers: [2] })
    render(React.createElement(InboundRegistrationSheet, {
      suppliers: [{ id: 4, name: '한빛 공장' }], warehouses: [{ id: 2, name: '대자동' }],
    }))

    await chooseSupplier('한빛 공장')
    await waitFor(() => expect(screen.getByRole('combobox', { name: '입고 파싱 템플릿' }).textContent).toContain('중국 공장 기본 v1'))
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
    mocks.getActiveInboundTemplatesForSupplier.mockResolvedValue([{ id: 7, name: '중국 공장 기본', versionId: 11, versionNumber: 1 }])
    mocks.loadInboundReviewRevision.mockResolvedValue({
      revisionId: 88, supplierId: 4, shipmentNumber: 'SHIP-1', templateId: 7, templateVersionId: 11, sheetName: '입고', headerRowNumber: 1, headers: ['외부 SKU', '수량'], fileHash: 'hash',
      rows: [
        { sourceRowId: 901, sourceRowNumber: 7, externalSku: 'A-RED', rawQuantity: '001', quantity: 1, validationError: null, productVariantId: 9, sourceValues: { color: '红' } },
        { sourceRowId: 902, sourceRowNumber: 8, externalSku: 'A-BLUE', rawQuantity: 'bad', quantity: null, validationError: '수량 오류', productVariantId: null, sourceValues: { color: '蓝' } },
      ],
    })
    render(React.createElement(InboundRegistrationSheet, {
      suppliers: [{ id: 4, name: '한빛 공장' }], warehouses: [{ id: 2, name: '대자동' }],
    }))

    expect(await screen.findByText('arrival.xlsx')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: '이어서 검토' }))
    await waitFor(() => expect(mocks.loadInboundReviewRevision).toHaveBeenCalledWith(88))
    const skuCells = screen.getAllByText(/A-(RED|BLUE)/).map((node) => node.textContent)
    expect(skuCells).toEqual(['A-RED', 'A-BLUE'])
    expect(screen.getByText('001')).toBeTruthy()
    expect(screen.getByText(/color: 红/)).toBeTruthy()
    expect(screen.getByText('수량 오류')).toBeTruthy()
    await waitFor(() => expect(screen.getByRole('combobox', { name: '입고 파싱 템플릿' }).textContent).toContain('중국 공장 기본 v1'))
  })
})

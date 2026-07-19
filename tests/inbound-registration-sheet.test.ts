// @vitest-environment jsdom
import React from 'react'
import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'

const mocks = vi.hoisted(() => ({
  previewInboundTemplateFile: vi.fn(),
  saveInboundTemplateDraft: vi.fn(),
  inspectInboundTemplateSample: vi.fn(),
  createInboundTemplateVersion: vi.fn(),
  promoteInboundImportRevision: vi.fn(),
  confirmSupplierSkuMapping: vi.fn(),
  refresh: vi.fn(),
}))

vi.mock('@/lib/actions/inbound-import', () => mocks)
vi.mock('@/lib/actions/supplier-sku-mapping', () => ({ confirmSupplierSkuMapping: mocks.confirmSupplierSkuMapping }))

vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: mocks.refresh }),
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
    fireEvent.click(screen.getByRole('combobox', { name: '입고 템플릿' }))
    fireEvent.click(await screen.findByRole('option', { name: '중국 공장 기본 v1' }))
    const file = new File(['contents'], 'inbound.xlsx', { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
    fireEvent.change(screen.getByLabelText('입고 파일 업로드'), { target: { files: [file] } })

    await waitFor(() => expect(mocks.previewInboundTemplateFile).toHaveBeenCalledWith({ supplierId: 4, templateVersionId: 11, file }))
    expect(screen.queryByRole('combobox', { name: '입고 창고' })).toBeNull()
    await waitFor(() => expect(screen.getAllByLabelText('외부 SKU')).toHaveLength(2))
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
    fireEvent.click(screen.getByRole('button', { name: '템플릿 만들기' }))
    expect(screen.getByRole('dialog', { name: '입고 템플릿 만들기' })).toBeTruthy()
    expect(screen.getByLabelText('샘플 파일')).toBeTruthy()
  })

  it('keeps the upload draft open while a missing SKU is created in product management', () => {
    render(React.createElement(InboundRegistrationSheet, {
      suppliers: [{ id: 4, name: '한빛 공장' }], warehouses: [{ id: 2, name: '대자동' }], templates,
    }))

    const productLink = screen.getByRole('link', { name: '상품 관리에서 SKU 만들기' })
    expect(productLink.getAttribute('target')).toBe('_blank')
    expect(productLink.getAttribute('href')).toContain('returnTo=%2Finventory')
    fireEvent.click(screen.getByRole('button', { name: '상품 목록 새로고침' }))
    expect(mocks.refresh).toHaveBeenCalledTimes(1)
  })

  it('preserves the sourcing return path when launched from arrivals', () => {
    render(React.createElement(InboundRegistrationSheet, {
      suppliers: [], warehouses: [], templates: [], returnTo: '/sourcing/arrivals',
    }))

    expect(screen.getByRole('link', { name: '상품 관리에서 SKU 만들기' }).getAttribute('href'))
      .toContain('returnTo=%2Fsourcing%2Farrivals')
  })
})

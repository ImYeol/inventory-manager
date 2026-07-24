// @vitest-environment jsdom
import React from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'

const mocks = vi.hoisted(() => ({
  createInternalProduct: vi.fn(),
  attachInternalSkuToInboundDraftRow: vi.fn(),
  receiveManualInboundDraftRows: vi.fn(),
  refresh: vi.fn(),
}))

vi.mock('@/lib/actions', () => ({
  attachInternalSkuToInboundDraftRow: mocks.attachInternalSkuToInboundDraftRow,
  receiveManualInboundDraftRows: mocks.receiveManualInboundDraftRows,
}))
vi.mock('@/lib/actions/internal-product', () => ({ createInternalProduct: mocks.createInternalProduct }))
vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh: mocks.refresh }) }))

import ManualInboundDraftRows from '@/app/(protected)/sourcing/arrivals/ManualInboundDraftRows'

const row = {
  id: 7,
  draftId: 3,
  supplierName: '한빛 공장',
  template: '기본 양식',
  externalSku: 'EXT-1',
  quantity: 4,
  receivedQuantity: 0,
  warehouseName: '대자동',
  productVariantId: null,
  productName: null,
  sellerSku: null,
}

describe('ManualInboundDraftRows', () => {
  beforeEach(() => {
    Object.values(mocks).forEach((mock) => mock.mockReset())
    mocks.createInternalProduct.mockResolvedValue({ variants: [{ id: 21 }] })
    mocks.attachInternalSkuToInboundDraftRow.mockResolvedValue(undefined)
  })

  it('uses the shared work dialog for SKU creation and keeps the complete action in the footer', () => {
    render(<ManualInboundDraftRows rows={[row]} />)

    fireEvent.click(screen.getByRole('button', { name: 'SKU 생성' }))

    const dialog = screen.getByRole('dialog', { name: '내부 SKU 생성' })
    expect(dialog.getAttribute('data-slot')).toBe('work-dialog-content')
    expect(dialog.querySelector('[data-slot="sheet-content"]')).toBeNull()
    expect(screen.getByRole('button', { name: '생성 후 연결' })).toBeTruthy()
  })

  it('preserves the create-and-attach flow', async () => {
    render(<ManualInboundDraftRows rows={[row]} />)
    fireEvent.click(screen.getByRole('button', { name: 'SKU 생성' }))
    fireEvent.change(screen.getByLabelText('상품명'), { target: { value: '내부 상품' } })
    fireEvent.change(screen.getByLabelText('SKU prefix'), { target: { value: 'INT' } })
    fireEvent.click(screen.getByRole('button', { name: '생성 후 연결' }))

    await vi.waitFor(() => {
      expect(mocks.createInternalProduct).toHaveBeenCalledWith({ name: '내부 상품', skuPrefix: 'INT', sizes: [], colors: [] })
      expect(mocks.attachInternalSkuToInboundDraftRow).toHaveBeenCalledWith({ draftRowId: 7, productVariantId: 21 })
    })
  })
})

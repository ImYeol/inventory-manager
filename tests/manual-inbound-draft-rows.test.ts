// @vitest-environment jsdom
import React from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'

const mocks = vi.hoisted(() => ({
  refresh: vi.fn(),
  createInternalProduct: vi.fn(),
  attachInternalSkuToInboundDraftRow: vi.fn(),
  receiveManualInboundDraftRows: vi.fn(),
}))

vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh: mocks.refresh }) }))
vi.mock('@/lib/actions/internal-product', () => ({ createInternalProduct: mocks.createInternalProduct }))
vi.mock('@/lib/actions', () => ({
  attachInternalSkuToInboundDraftRow: mocks.attachInternalSkuToInboundDraftRow,
  receiveManualInboundDraftRows: mocks.receiveManualInboundDraftRows,
}))

import ManualInboundDraftRows from '@/app/(protected)/sourcing/arrivals/ManualInboundDraftRows'

const rows = [{
  id: 41, draftId: 7, supplierName: '한빛 공장', template: 'summer-26', externalSku: 'EXT-001',
  quantity: 12, receivedQuantity: 0, warehouseName: '서울 창고', productVariantId: null, productName: null, sellerSku: null,
}]

describe('ManualInboundDraftRows', () => {
  beforeEach(() => Object.values(mocks).forEach((mock) => mock.mockReset()))

  it('opens inline SKU creation for an unmatched row without navigating away', () => {
    render(React.createElement(ManualInboundDraftRows, { rows }))
    fireEvent.click(screen.getByRole('button', { name: 'SKU 생성' }))
    expect(screen.getByRole('dialog', { name: '내부 SKU 생성' })).toBeTruthy()
    expect(mocks.refresh).not.toHaveBeenCalled()
  })

  it('creates a valid internal SKU through the canonical action and attaches it to the draft row', async () => {
    mocks.createInternalProduct.mockResolvedValue({ success: true, variants: [{ id: 101, sellerSku: 'HB-001' }] })
    mocks.attachInternalSkuToInboundDraftRow.mockResolvedValue({ success: true })
    render(React.createElement(ManualInboundDraftRows, { rows }))
    fireEvent.click(screen.getByRole('button', { name: 'SKU 생성' }))
    const dialog = screen.getByRole('dialog', { name: '내부 SKU 생성' })
    const submit = within(dialog).getByRole('button', { name: '생성 후 연결' })
    expect(submit).toHaveProperty('disabled', true)
    fireEvent.change(within(dialog).getByLabelText('상품명'), { target: { value: '린넨 셔츠' } })
    fireEvent.change(within(dialog).getByLabelText('SKU prefix'), { target: { value: 'HB-001' } })
    fireEvent.click(submit)
    await waitFor(() => expect(mocks.createInternalProduct).toHaveBeenCalledWith({ name: '린넨 셔츠', skuPrefix: 'HB-001', sizes: [], colors: [] }))
    await waitFor(() => expect(mocks.attachInternalSkuToInboundDraftRow).toHaveBeenCalledWith({ draftRowId: 41, productVariantId: 101 }))
    expect(mocks.refresh).toHaveBeenCalled()
    expect(mocks.receiveManualInboundDraftRows).not.toHaveBeenCalled()
  })

  it('preserves the draft row and modal when SKU creation fails', async () => {
    mocks.createInternalProduct.mockRejectedValue(new Error('등록에 실패했습니다.'))
    render(React.createElement(ManualInboundDraftRows, { rows }))
    fireEvent.click(screen.getByRole('button', { name: 'SKU 생성' }))
    const dialog = screen.getByRole('dialog', { name: '내부 SKU 생성' })
    fireEvent.change(within(dialog).getByLabelText('상품명'), { target: { value: '린넨 셔츠' } })
    fireEvent.change(within(dialog).getByLabelText('SKU prefix'), { target: { value: 'HB-001' } })
    fireEvent.click(within(dialog).getByRole('button', { name: '생성 후 연결' }))
    await waitFor(() => expect(within(screen.getByRole('dialog', { name: '내부 SKU 생성' })).getByText('등록에 실패했습니다.')).toBeTruthy())
    expect(screen.getByText('EXT-001')).toBeTruthy()
    expect(mocks.attachInternalSkuToInboundDraftRow).not.toHaveBeenCalled()
  })
})

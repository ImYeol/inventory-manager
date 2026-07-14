// @vitest-environment jsdom
import React from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'

const mocks = vi.hoisted(() => ({
  refresh: vi.fn(),
  createWarehouse: vi.fn(),
  createModel: vi.fn(),
  createModelSize: vi.fn(),
  createModelColor: vi.fn(),
  deleteWarehouse: vi.fn(),
  deleteModel: vi.fn(),
  deleteModelSize: vi.fn(),
  deleteModelColor: vi.fn(),
  createInternalProduct: vi.fn(),
}))

vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: mocks.refresh }),
}))

vi.mock('@/lib/actions', () => ({
  createWarehouse: mocks.createWarehouse,
  createModel: mocks.createModel,
  createModelSize: mocks.createModelSize,
  createModelColor: mocks.createModelColor,
  deleteWarehouse: mocks.deleteWarehouse,
  deleteModel: mocks.deleteModel,
  deleteModelSize: mocks.deleteModelSize,
  deleteModelColor: mocks.deleteModelColor,
}))
vi.mock('@/lib/actions/internal-product', () => ({ createInternalProduct: mocks.createInternalProduct }))

import MasterDataManager from '@/app/(protected)/master-data/MasterDataManager'

beforeEach(() => {
  Object.values(mocks).forEach((mock) => mock.mockReset())
})

describe('MasterDataManager', () => {
  const props = {
    warehouses: [
      { id: 1, name: '오금동' },
      { id: 2, name: '대자동' },
    ],
    warehouseStats: [
      {
        id: 1,
        name: '오금동',
        skuCount: 3,
        stockQty: 32,
        inboundQty: 42,
        outboundQty: 15,
        latestInbound: { quantity: 12, date: '2026-04-12' },
        latestOutbound: { quantity: 4, date: '2026-04-13' },
        latestMovementDate: '2026-04-13',
      },
      {
        id: 2,
        name: '대자동',
        skuCount: 1,
        stockQty: 18,
        inboundQty: 18,
        outboundQty: 0,
        latestInbound: { quantity: 18, date: '2026-04-11' },
        latestOutbound: null,
        latestMovementDate: '2026-04-11',
      },
    ],
    models: [
      {
        id: 10,
        name: 'LP01',
        sizes: [{ id: 101, name: 'M' }],
        colors: [{ id: 201, name: '네이비', rgbCode: '#111111', textWhite: true }],
      },
    ],
  }

  it('separates product and warehouse management with tabs and a warehouse modal', async () => {
    mocks.createWarehouse.mockResolvedValue({ success: true })

    render(React.createElement(MasterDataManager, props))

    expect(screen.getByRole('tab', { name: '상품' })).toBeTruthy()
    expect(screen.getByRole('tab', { name: '창고' })).toBeTruthy()
    expect(screen.getByRole('tablist', { name: '상품 관리 보기 전환' })).toBeTruthy()
    expect(screen.getByRole('button', { name: '내부 상품 등록' })).toBeTruthy()
    expect(screen.queryByRole('button', { name: '창고 등록' })).toBeNull()
    expect(screen.queryByText('2개 창고')).toBeNull()
    expect(screen.getByText(/쿠팡\/네이버 실제 상품정보/)).toBeTruthy()

    fireEvent.mouseDown(screen.getByRole('tab', { name: '창고' }))
    fireEvent.click(screen.getByRole('tab', { name: '창고' }))
    await waitFor(() => {
      expect(screen.getByRole('button', { name: '오금동 삭제' })).toBeTruthy()
    })

    expect(screen.queryByRole('button', { name: '내부 상품 등록' })).toBeNull()
    expect(screen.getByRole('button', { name: '창고 등록' })).toBeTruthy()
    expect(screen.getByText('2개 창고')).toBeTruthy()
    expect(screen.getByText('SKU 4개')).toBeTruthy()
    expect(screen.getByText('총 재고 50개')).toBeTruthy()
    expect(screen.queryByText('1개 모델')).toBeNull()

    fireEvent.click(screen.getByRole('button', { name: '창고 등록' }))

    const dialog = screen.getByRole('dialog', { name: '창고 등록' })
    fireEvent.change(within(dialog).getByLabelText('창고명'), { target: { value: '부산 창고' } })
    fireEvent.click(within(dialog).getByRole('button', { name: '등록' }))

    await waitFor(() => {
      expect(mocks.createWarehouse).toHaveBeenCalledWith('부산 창고')
    })
    expect(mocks.refresh).toHaveBeenCalled()
  })


  it('deletes a warehouse from the warehouse table through the shared modal', async () => {
    mocks.deleteWarehouse.mockResolvedValue({ success: true })

    render(React.createElement(MasterDataManager, props))

    fireEvent.mouseDown(screen.getByRole('tab', { name: '창고' }))
    fireEvent.click(screen.getByRole('tab', { name: '창고' }))
    await waitFor(() => {
      expect(screen.getByRole('button', { name: '오금동 삭제' })).toBeTruthy()
    })
    fireEvent.click(screen.getByRole('button', { name: '오금동 삭제' }))

    const dialog = screen.getByRole('dialog', { name: '창고 삭제 확인' })
    fireEvent.click(within(dialog).getByRole('button', { name: '삭제' }))

    await waitFor(() => {
      expect(mocks.deleteWarehouse).toHaveBeenCalledWith(1)
    })
    expect(mocks.refresh).toHaveBeenCalled()
  })

})

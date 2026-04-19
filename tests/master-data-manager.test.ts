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
    expect(screen.getByRole('button', { name: '모델 등록' })).toBeTruthy()
    expect(screen.getByRole('button', { name: '창고 등록' })).toBeTruthy()
    expect(screen.getByRole('row', { name: /LP01/ })).toBeTruthy()

    fireEvent.mouseDown(screen.getByRole('tab', { name: '창고' }))
    fireEvent.click(screen.getByRole('tab', { name: '창고' }))
    await waitFor(() => {
      expect(screen.getByRole('button', { name: '오금동 삭제' })).toBeTruthy()
    })

    fireEvent.click(screen.getByRole('button', { name: '창고 등록' }))

    const dialog = screen.getByRole('dialog', { name: '창고 등록' })
    fireEvent.change(within(dialog).getByLabelText('창고명'), { target: { value: '부산 창고' } })
    fireEvent.click(within(dialog).getByRole('button', { name: '등록' }))

    await waitFor(() => {
      expect(mocks.createWarehouse).toHaveBeenCalledWith('부산 창고')
    })
    expect(mocks.refresh).toHaveBeenCalled()
  })

  it('creates a model with initial sizes and colors from the minimal modal', async () => {
    mocks.createModel.mockResolvedValue({ success: true, id: 11 })
    mocks.createModelSize.mockResolvedValue({ success: true })
    mocks.createModelColor.mockResolvedValue({ success: true })

    const { rerender } = render(React.createElement(MasterDataManager, props))

    fireEvent.click(screen.getByRole('button', { name: '모델 등록' }))

    const dialog = screen.getByRole('dialog', { name: '모델 등록' })
    fireEvent.change(within(dialog).getByLabelText('모델명'), { target: { value: '블루종 A' } })
    fireEvent.change(within(dialog).getByLabelText('사이즈'), { target: { value: '230, 240' } })
    fireEvent.change(within(dialog).getByLabelText('색상'), {
      target: { value: '블랙|#111111|W, 화이트|#FFFFFF' },
    })

    fireEvent.click(within(dialog).getByRole('button', { name: '등록' }))

    await waitFor(() => {
      expect(mocks.createModel).toHaveBeenCalledWith('블루종 A')
    })

    rerender(
      React.createElement(MasterDataManager, {
        ...props,
        models: [
          ...props.models,
          {
            id: 11,
            name: '블루종 A',
            sizes: [],
            colors: [],
          },
        ],
      }),
    )

    await waitFor(() => {
      expect(mocks.createModelSize).toHaveBeenCalledWith(11, '230')
      expect(mocks.createModelSize).toHaveBeenCalledWith(11, '240')
      expect(mocks.createModelColor).toHaveBeenCalledWith(11, '블랙', {
        rgbCode: '#111111',
        textWhite: true,
      })
      expect(mocks.createModelColor).toHaveBeenCalledWith(11, '화이트', {
        rgbCode: '#FFFFFF',
        textWhite: false,
      })
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

  it('asks for confirmation before deleting a model', async () => {
    mocks.deleteModel.mockResolvedValue({ success: true })

    render(React.createElement(MasterDataManager, props))

    fireEvent.click(screen.getByRole('button', { name: 'LP01 삭제' }))

    const dialog = screen.getByRole('dialog', { name: '모델 삭제 확인' })
    fireEvent.click(within(dialog).getByRole('button', { name: '삭제' }))

    await waitFor(() => {
      expect(mocks.deleteModel).toHaveBeenCalledWith(10)
    })
    expect(mocks.refresh).toHaveBeenCalled()
  })
})

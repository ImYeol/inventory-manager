// @vitest-environment jsdom
import React from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'

const mocks = vi.hoisted(() => ({
  refresh: vi.fn(),
  createWarehouse: vi.fn(),
  createModel: vi.fn(),
  createModelsWithSpecs: vi.fn(),
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
  createModelsWithSpecs: mocks.createModelsWithSpecs,
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

  it('adds a warehouse from the master data workspace', async () => {
    mocks.createWarehouse.mockResolvedValue({ success: true })

    render(React.createElement(MasterDataManager, props))

    fireEvent.click(screen.getByRole('button', { name: '창고 등록' }))
    fireEvent.change(screen.getByPlaceholderText('예: 대전 2센터 A구역'), { target: { value: '부산 창고' } })
    fireEvent.click(screen.getByRole('button', { name: '등록' }))

    await waitFor(() => {
      expect(mocks.createWarehouse).toHaveBeenCalledWith('부산 창고')
    })
    expect(mocks.refresh).toHaveBeenCalled()
  })

  it('deletes a warehouse from the warehouse tab', async () => {
    mocks.deleteWarehouse.mockResolvedValue({ success: true })

    render(React.createElement(MasterDataManager, props))

    fireEvent.click(screen.getByRole('button', { name: '오금동 삭제' }))
    const confirmDialog = screen.getByRole('dialog', { name: '창고 삭제 확인' })
    fireEvent.click(within(confirmDialog).getByRole('button', { name: '삭제' }))

    await waitFor(() => {
      expect(mocks.deleteWarehouse).toHaveBeenCalledWith(1)
    })
    expect(mocks.refresh).toHaveBeenCalled()
  })

  it('shows warehouse cards with stock and movement metrics', () => {
    render(React.createElement(MasterDataManager, props))

    expect(screen.getByText('등록된 창고')).toBeTruthy()
    expect(screen.getByText('창고 2개')).toBeTruthy()
    expect(screen.getByText('총 재고 50개')).toBeTruthy()
    expect(screen.getByText('오금동')).toBeTruthy()
    expect(screen.getByText('32개')).toBeTruthy()
  })

  it('registers multiple models in one batch from the product tab', async () => {
    mocks.createModelsWithSpecs.mockResolvedValue({ success: true, count: 2 })

    render(React.createElement(MasterDataManager, props))

    fireEvent.click(screen.getByRole('button', { name: '상품 관리' }))

    const firstDraft = screen.getByText('모델 #1').closest('.rounded-2xl')
    expect(firstDraft).not.toBeNull()

    fireEvent.change(within(firstDraft as HTMLElement).getByPlaceholderText('예: 블루종 베스트'), {
      target: { value: '블루종 A' },
    })
    fireEvent.change(within(firstDraft as HTMLElement).getByPlaceholderText('예: 230, 240, 250'), {
      target: { value: '230, 240' },
    })
    fireEvent.change(
      within(firstDraft as HTMLElement).getByPlaceholderText('예: 블랙|#000000|W, 화이트|#FFFFFF'),
      {
        target: { value: '블랙|#111111|W' },
      },
    )

    fireEvent.click(screen.getByRole('button', { name: '모델 행 추가' }))

    const secondDraft = screen.getByText('모델 #2').closest('.rounded-2xl')
    expect(secondDraft).not.toBeNull()

    fireEvent.change(within(secondDraft as HTMLElement).getByPlaceholderText('예: 블루종 베스트'), {
      target: { value: '블루종 B' },
    })
    fireEvent.change(within(secondDraft as HTMLElement).getByPlaceholderText('예: 230, 240, 250'), {
      target: { value: '250' },
    })
    fireEvent.change(
      within(secondDraft as HTMLElement).getByPlaceholderText('예: 블랙|#000000|W, 화이트|#FFFFFF'),
      {
        target: { value: '화이트|#FFFFFF' },
      },
    )

    fireEvent.click(screen.getByRole('button', { name: '모델 일괄 등록' }))

    await waitFor(() => {
      expect(mocks.createModelsWithSpecs).toHaveBeenCalledWith([
        {
          name: '블루종 A',
          sizes: ['230', '240'],
          colors: [{ name: '블랙', rgbCode: '#111111', textWhite: true }],
        },
        {
          name: '블루종 B',
          sizes: ['250'],
          colors: [{ name: '화이트', rgbCode: '#FFFFFF', textWhite: false }],
        },
      ])
    })
  })

  it('lets the user select a model and delete its size and color entries', async () => {
    mocks.deleteModelSize.mockResolvedValue({ success: true })
    mocks.deleteModelColor.mockResolvedValue({ success: true })

    render(React.createElement(MasterDataManager, props))

    fireEvent.click(screen.getByRole('button', { name: '상품 관리' }))
    fireEvent.change(screen.getByRole('combobox', { name: '모델 선택' }), {
      target: { value: '10' },
    })

    fireEvent.click(screen.getByRole('button', { name: 'M 삭제' }))
    fireEvent.click(screen.getByRole('button', { name: '네이비 삭제' }))

    await waitFor(() => {
      expect(mocks.deleteModelSize).toHaveBeenCalledWith(101)
      expect(mocks.deleteModelColor).toHaveBeenCalledWith(201)
    })
  })
})

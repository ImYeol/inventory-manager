// @vitest-environment jsdom
import React from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'

const mocks = vi.hoisted(() => ({
  refresh: vi.fn(),
  createFactoryArrivalBatch: vi.fn(),
  receiveFactoryArrivalRequest: vi.fn(),
  replaceFactoryArrivalAllocations: vi.fn(),
  closeFactoryArrivalShortage: vi.fn(),
  recordFactoryArrivalFollowUp: vi.fn(),
  reverseFactoryReceiptLine: vi.fn(),
}))

vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: mocks.refresh }),
}))

vi.mock('@/lib/actions', () => ({
  createFactoryArrivalBatch: mocks.createFactoryArrivalBatch,
  receiveFactoryArrivalRequest: mocks.receiveFactoryArrivalRequest,
  replaceFactoryArrivalAllocations: mocks.replaceFactoryArrivalAllocations,
  closeFactoryArrivalShortage: mocks.closeFactoryArrivalShortage,
  recordFactoryArrivalFollowUp: mocks.recordFactoryArrivalFollowUp,
  reverseFactoryReceiptLine: mocks.reverseFactoryReceiptLine,
}))

import ArrivalsView from '@/app/(protected)/sourcing/arrivals/ArrivalsView'

beforeEach(() => {
  Object.values(mocks).forEach((mock) => mock.mockReset())
})

afterEach(() => {
  cleanup()
})

async function openSelectAndChoose(label: string, optionName: string) {
  fireEvent.click(screen.getByRole('combobox', { name: label }))
  fireEvent.click(await screen.findByRole('option', { name: optionName }))
}

describe('ArrivalsView', () => {
  it('keeps manual arrival creation in a secondary sheet', async () => {
    mocks.createFactoryArrivalBatch.mockResolvedValue({ success: true, count: 1 })

    render(
      React.createElement(ArrivalsView, {
        schemaState: { status: 'ready', message: null },
        factories: [{ id: 1, name: '광주 협력사', isActive: true }],
        warehouses: [
          { id: 11, name: '오금동' },
          { id: 12, name: '대자동' },
        ],
        models: [
          {
            id: 1,
            name: 'LP01',
            sizes: [{ id: 10, name: 'S' }],
            colors: [{ id: 20, name: '네이비', rgbCode: '#111111' }],
          },
        ],
        arrivals: [],
      }),
    )

    expect(screen.queryByRole('button', { name: 'CSV 등록' })).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: '수동 추가' }))

    await openSelectAndChoose('공장', '광주 협력사')
    await openSelectAndChoose('입고 예정 창고', '대자동')
    fireEvent.click(screen.getByRole('combobox', { name: '항목 #1 상품 옵션' }))
    fireEvent.click(await screen.findByRole('option', { name: /LP01/ }))
    fireEvent.change(screen.getAllByPlaceholderText('수량')[0], { target: { value: '12' } })
    expect(screen.getByRole('combobox', { name: '공장' }).className).toContain('ui-select-trigger')
    expect(screen.queryByRole('combobox', { name: '항목 #1 모델' })).toBeNull()

    fireEvent.click(screen.getByRole('button', { name: '예정 입고 등록' }))

    await waitFor(() =>
      expect(mocks.createFactoryArrivalBatch).toHaveBeenCalledWith(
        expect.objectContaining({
          factoryId: 1,
          sourceChannel: 'manual',
          warehouseId: 12,
          items: [{ modelId: 1, sizeId: 10, colorId: 20, orderedQuantity: 12 }],
        }),
      ),
    )
  })

  it('receives multiple canonical allocation quantities with overage evidence', async () => {
    mocks.receiveFactoryArrivalRequest.mockResolvedValue({ success: true })

    render(
      React.createElement(ArrivalsView, {
        schemaState: { status: 'ready', message: null },
        factories: [{ id: 1, name: '광주 협력사', isActive: true }],
        warehouses: [
          { id: 11, name: '오금동' },
          { id: 12, name: '대자동' },
        ],
        models: [
          {
            id: 1,
            name: 'LP01',
            sizes: [{ id: 10, name: 'S' }],
            colors: [{ id: 20, name: '네이비', rgbCode: '#111111' }],
          },
        ],
        arrivals: [
          {
            id: 101,
            factoryName: '광주 협력사',
            expectedDate: '2026-04-21',
            status: 'READY',
            sourceChannel: 'manual',
            memo: '1차 입고',
            totalOrderedQuantity: 5,
            remainingQuantity: 5,
            shortageClosures: [],
            receiptLines: [],
            items: [
              {
                id: 201,
                modelName: 'LP01',
                sizeName: 'S',
                colorName: '네이비',
                colorRgb: '#111111',
                orderedQuantity: 5,
                receivedQuantity: 0,
                remainingQuantity: 5,
                allocations: [{ id: 301, warehouseId: 11, warehouseName: '오금동', allocatedQuantity: 5, normallyReceivedQuantity: 0, shortageClosedQuantity: 0, remainingQuantity: 5 }],
              },
            ],
          },
        ],
      }),
    )

    expect(screen.getByText('예정 목록').closest('section')?.className).not.toContain('ui-card')
    expect(screen.getAllByText('입고 예정').length).toBeGreaterThan(1)
    expect(screen.queryByRole('dialog')).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: '입고 #101 상세 보기' }))
    expect(await screen.findByRole('dialog', { name: '광주 협력사 입고 예정' })).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: '입고 반영 작업 열기' }))
    fireEvent.change(screen.getByLabelText('오금동 정상 입고'), { target: { value: '2' } })
    fireEvent.change(screen.getByLabelText('오금동 초과 입고'), { target: { value: '1' } })
    fireEvent.change(screen.getByLabelText('오금동 초과 사유'), { target: { value: '공장 오발송' } })
    fireEvent.click(screen.getByRole('button', { name: '입고 반영' }))

    await waitFor(() =>
      expect(mocks.receiveFactoryArrivalRequest).toHaveBeenCalledWith({
        arrivalId: 101,
        receiptRequestId: expect.any(String),
        receiptBusinessDate: expect.any(String),
        lines: [{ allocationId: 301, quantity: 2, overageQuantity: 1, overageReason: '공장 오발송' }],
      }),
    )
    expect(mocks.refresh).toHaveBeenCalled()
  })

  it('keeps split allocation, shortage follow-up, and full-line correction reachable', async () => {
    mocks.replaceFactoryArrivalAllocations.mockResolvedValue({ success: true })
    mocks.closeFactoryArrivalShortage.mockResolvedValue({ success: true })
    mocks.recordFactoryArrivalFollowUp.mockResolvedValue({ success: true })
    mocks.reverseFactoryReceiptLine.mockResolvedValue({ success: true })
    render(React.createElement(ArrivalsView, {
      schemaState: { status: 'ready', message: null }, factories: [{ id: 1, name: '광주 협력사', isActive: true }], warehouses: [{ id: 11, name: '오금동' }, { id: 12, name: '대자동' }], models: [],
      arrivals: [{ id: 101, factoryName: '광주 협력사', expectedDate: '2026-04-21', status: 'PARTIAL', sourceChannel: 'csv', memo: null, totalOrderedQuantity: 30, remainingQuantity: 23,
        shortageClosures: [{ id: 401, allocationId: 301, quantity: 2, reason: '미발송', closedAt: '2026-04-22' }],
        receiptLines: [{ id: 501, eventId: 601, itemId: 201, allocationId: 301, warehouseId: 11, receivedQuantity: 5, normalQuantity: 5, overageQuantity: 0, overageReason: null, shortageClosureId: null, createdAt: '2026-04-22', corrected: false }],
        items: [{ id: 201, modelName: 'LP01', sizeName: 'S', colorName: '네이비', colorRgb: '#111111', orderedQuantity: 30, receivedQuantity: 5, remainingQuantity: 23,
          allocations: [{ id: 301, warehouseId: 11, warehouseName: '오금동', allocatedQuantity: 20, normallyReceivedQuantity: 5, shortageClosedQuantity: 2, remainingQuantity: 13 }, { id: 302, warehouseId: 12, warehouseName: '대자동', allocatedQuantity: 10, normallyReceivedQuantity: 0, shortageClosedQuantity: 0, remainingQuantity: 10 }] }],
      }],
    }))
    fireEvent.click(screen.getByRole('button', { name: '입고 #101 상세 보기' }))
    fireEvent.click(screen.getByRole('button', { name: '배정 작업 열기' }))
    fireEvent.click(screen.getByRole('button', { name: '배정 저장' }))
    await waitFor(() => expect(mocks.replaceFactoryArrivalAllocations).toHaveBeenCalledWith({ arrivalId: 101, itemId: 201, reason: '', allocations: [{ warehouseId: 11, quantity: 20 }, { warehouseId: 12, quantity: 10 }] }))
    fireEvent.click(screen.getByRole('button', { name: '입고 #101 상세 보기' }))
    fireEvent.click(screen.getByRole('button', { name: '부족 작업 열기' }))
    fireEvent.change(screen.getByLabelText('오금동 부족 수량'), { target: { value: '1' } }); fireEvent.change(screen.getByLabelText('오금동 부족 사유'), { target: { value: '추가 미발송' } }); fireEvent.click(screen.getAllByRole('button', { name: '부족 종료' })[0])
    await waitFor(() => expect(mocks.closeFactoryArrivalShortage).toHaveBeenCalledWith({ allocationId: 301, quantity: 1, reason: '추가 미발송' }))
    fireEvent.click(screen.getByRole('button', { name: '입고 #101 상세 보기' }))
    fireEvent.click(screen.getByRole('button', { name: '후속 입고 작업 열기' }))
    fireEvent.change(screen.getByLabelText('부족 #401 후속 수량'), { target: { value: '1' } }); fireEvent.change(screen.getByLabelText('부족 #401 후속 사유'), { target: { value: '늦은 박스' } }); fireEvent.click(screen.getByRole('button', { name: '후속 입고' }))
    await waitFor(() => expect(mocks.recordFactoryArrivalFollowUp).toHaveBeenCalledWith(expect.objectContaining({ closureId: 401, warehouseId: 11, quantity: 1, reason: '늦은 박스' })))
    fireEvent.click(screen.getByRole('button', { name: '입고 #101 상세 보기' }))
    fireEvent.click(screen.getByRole('button', { name: '정정 작업 열기' }))
    fireEvent.change(screen.getByLabelText('입고 기록 #501 정정 사유'), { target: { value: '다른 상품' } }); fireEvent.click(screen.getByRole('button', { name: '전체 반전' }))
    await waitFor(() => expect(mocks.reverseFactoryReceiptLine).toHaveBeenCalledWith(expect.objectContaining({ receiptLineId: 501, reason: '다른 상품' })))
  })

  it('keeps the selected operation and its draft visible after a scoped server error', async () => {
    mocks.receiveFactoryArrivalRequest.mockRejectedValue(new Error('다시 확인해주세요.'))
    render(React.createElement(ArrivalsView, {
      schemaState: { status: 'ready', message: null }, factories: [], warehouses: [{ id: 11, name: '오금동' }], models: [],
      arrivals: [{ id: 101, factoryName: '광주 협력사', expectedDate: '2026-04-21', status: 'READY', sourceChannel: 'manual', memo: null, totalOrderedQuantity: 5, remainingQuantity: 5, shortageClosures: [], receiptLines: [], items: [{ id: 201, modelName: 'LP01', sizeName: 'S', colorName: '네이비', colorRgb: '#111111', orderedQuantity: 5, receivedQuantity: 0, remainingQuantity: 5, allocations: [{ id: 301, warehouseId: 11, warehouseName: '오금동', allocatedQuantity: 5, normallyReceivedQuantity: 0, shortageClosedQuantity: 0, remainingQuantity: 5 }] }] }],
    }))
    fireEvent.click(screen.getByRole('button', { name: '입고 #101 상세 보기' }))
    fireEvent.click(screen.getByRole('button', { name: '입고 반영 작업 열기' }))
    fireEvent.change(screen.getByLabelText('오금동 정상 입고'), { target: { value: '2' } })
    fireEvent.click(screen.getByRole('button', { name: '입고 반영' }))
    expect((await screen.findByRole('alert')).textContent).toContain('다시 확인해주세요.')
    expect(screen.getByRole('button', { name: '입고 반영 작업 열기' }).getAttribute('aria-pressed')).toBe('true')
    expect((screen.getByLabelText('오금동 정상 입고') as HTMLInputElement).value).toBe('2')
  })

  it('shows the setup banner and blocks register/receive actions when sourcing schema is missing', async () => {
    render(
      React.createElement(ArrivalsView, {
        schemaState: {
          status: 'missing',
          message: '소싱 스키마가 아직 배포되지 않았습니다. supabase/schema.sql 적용 후 다시 시도하세요.',
        },
        factories: [{ id: 1, name: '광주 협력사', isActive: true }],
        warehouses: [{ id: 11, name: '오금동' }],
        models: [
          {
            id: 1,
            name: 'LP01',
            sizes: [{ id: 10, name: 'S' }],
            colors: [{ id: 20, name: '네이비', rgbCode: '#111111' }],
          },
        ],
        arrivals: [
          {
            id: 101,
            factoryName: '광주 협력사',
            expectedDate: '2026-04-21',
            status: 'READY',
            sourceChannel: 'manual',
            memo: null,
            totalOrderedQuantity: 5,
            remainingQuantity: 5,
            shortageClosures: [],
            receiptLines: [],
            items: [
              {
                id: 201,
                modelName: 'LP01',
                sizeName: 'S',
                colorName: '네이비',
                colorRgb: '#111111',
                orderedQuantity: 5,
                receivedQuantity: 0,
                remainingQuantity: 5,
                allocations: [{ id: 301, warehouseId: 11, warehouseName: '오금동', allocatedQuantity: 5, normallyReceivedQuantity: 0, shortageClosedQuantity: 0, remainingQuantity: 5 }],
              },
            ],
          },
        ],
      }),
    )

    expect(screen.getByText('소싱 스키마가 아직 배포되지 않았습니다. supabase/schema.sql 적용 후 다시 시도하세요.')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: '수동 추가' }))
    expect(screen.getByRole('button', { name: '예정 입고 등록' }).getAttribute('disabled')).not.toBeNull()
    fireEvent.click(screen.getByRole('button', { name: '닫기' }))
    fireEvent.click(screen.getByRole('button', { name: '입고 #101 상세 보기' }))
    fireEvent.click(screen.getByRole('button', { name: '입고 반영 작업 열기' }))
    expect(screen.getByRole('button', { name: '입고 반영' }).getAttribute('disabled')).not.toBeNull()
  })
})

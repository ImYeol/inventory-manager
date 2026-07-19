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
  moveFactoryArrivalRemaindersToWarehouse: vi.fn(),
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
  moveFactoryArrivalRemaindersToWarehouse: mocks.moveFactoryArrivalRemaindersToWarehouse,
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
                productVariantId: 901,
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
          {
            id: 102,
            factoryName: '광주 협력사',
            expectedDate: '2026-04-22',
            status: 'PARTIAL',
            sourceChannel: 'manual',
            memo: null,
            totalOrderedQuantity: 4,
            remainingQuantity: 4,
            shortageClosures: [],
            receiptLines: [],
            items: [{
              id: 202,
              productVariantId: 901,
              modelName: 'LP01',
              sizeName: 'S',
              colorName: '네이비',
              colorRgb: '#111111',
              orderedQuantity: 4,
              receivedQuantity: 0,
              remainingQuantity: 4,
              allocations: [{ id: 302, warehouseId: 11, warehouseName: '오금동', allocatedQuantity: 4, normallyReceivedQuantity: 0, shortageClosedQuantity: 0, remainingQuantity: 4 }],
            }],
          },
        ],
      }),
    )

    expect(screen.getByRole('table', { name: '입고 예정 목록' })).toBeTruthy()
    expect(screen.getAllByText('입고 예정').length).toBeGreaterThan(1)
    expect(screen.queryByRole('dialog')).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: '입고 #101 상세 보기' }))
    expect(await screen.findByRole('dialog', { name: '광주 협력사 입고 예정' })).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: '입고 반영 작업 열기' }))
    fireEvent.change(screen.getByLabelText('오금동 정상 입고'), { target: { value: '2' } })
    fireEvent.change(screen.getByLabelText('오금동 초과 입고'), { target: { value: '1' } })
    fireEvent.change(screen.getByLabelText('오금동 초과 사유'), { target: { value: '공장 오발송' } })
    expect(screen.getByText('LP01 · 네이비/S · 오금동')).toBeTruthy()
    expect(screen.getByText('정상 2 · 초과 1 · 반영 후 입고 예정 7')).toBeTruthy()
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

  it('keeps the list as the primary table and opens the selected arrival with the keyboard', () => {
    render(React.createElement(ArrivalsView, {
      schemaState: { status: 'ready', message: null }, factories: [], warehouses: [], models: [],
      arrivals: [
        { id: 101, factoryName: '광주 협력사', expectedDate: '2026-04-21', status: 'READY', sourceChannel: 'manual', memo: null, totalOrderedQuantity: 5, remainingQuantity: 5, shortageClosures: [], receiptLines: [], items: [] },
        { id: 102, factoryName: '대전 공장', expectedDate: '2026-04-22', status: 'RECEIVED', sourceChannel: 'manual', memo: null, totalOrderedQuantity: 3, remainingQuantity: 0, shortageClosures: [], receiptLines: [], items: [] },
      ],
    }))

    expect(screen.getByRole('table', { name: '입고 예정 목록' })).toBeTruthy()
    fireEvent.change(screen.getByRole('searchbox', { name: '입고 예정 검색' }), { target: { value: '대전' } })
    expect(screen.queryByText('광주 협력사')).toBeNull()
    const row = screen.getByRole('row', { name: '대전 공장 입고 예정 상세 보기' })
    fireEvent.keyDown(row, { key: 'Enter' })
    expect(screen.getByRole('dialog', { name: '대전 공장 입고 예정' })).toBeTruthy()
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
        receiptLines: [{ id: 501, eventId: 601, businessDate: '2026-04-22', itemId: 201, allocationId: 301, warehouseId: 11, receivedQuantity: 5, normalQuantity: 5, overageQuantity: 0, overageReason: null, shortageClosureId: null, createdAt: '2026-04-22', corrected: false }],
        items: [{ id: 201, productVariantId: 901, modelName: 'LP01', sizeName: 'S', colorName: '네이비', colorRgb: '#111111', orderedQuantity: 30, receivedQuantity: 5, remainingQuantity: 23,
          allocations: [{ id: 301, warehouseId: 11, warehouseName: '오금동', allocatedQuantity: 20, normallyReceivedQuantity: 5, shortageClosedQuantity: 2, remainingQuantity: 13 }, { id: 302, warehouseId: 12, warehouseName: '대자동', allocatedQuantity: 10, normallyReceivedQuantity: 0, shortageClosedQuantity: 0, remainingQuantity: 10 }] }],
      }],
    }))
    fireEvent.click(screen.getByRole('button', { name: '입고 #101 상세 보기' }))
    fireEvent.click(screen.getByRole('button', { name: '배정 작업 열기' }))
    fireEvent.click(screen.getByRole('button', { name: '배정 저장' }))
    expect(screen.getByTestId('operation-error-item-201').textContent).toContain('배정 변경 사유')
    expect(mocks.replaceFactoryArrivalAllocations).not.toHaveBeenCalled()
    fireEvent.change(screen.getByLabelText('LP01 배정 변경 사유'), { target: { value: '창고 계획 변경' } })
    fireEvent.click(screen.getByRole('button', { name: '배정 저장' }))
    await waitFor(() => expect(mocks.replaceFactoryArrivalAllocations).toHaveBeenCalledWith({ arrivalId: 101, itemId: 201, reason: '창고 계획 변경', allocations: [{ warehouseId: 11, quantity: 20 }, { warehouseId: 12, quantity: 10 }] }))
    fireEvent.click(screen.getByRole('button', { name: '입고 #101 상세 보기' }))
    fireEvent.click(screen.getByRole('button', { name: '배정 작업 열기' }))
    fireEvent.change(screen.getByLabelText('입고 #101 전체 이동 사유'), { target: { value: '대부분 오금동 입고' } })
    fireEvent.click(screen.getByRole('button', { name: '남은 수량 이동' }))
    await waitFor(() => expect(mocks.moveFactoryArrivalRemaindersToWarehouse).toHaveBeenCalledWith({ arrivalId: 101, warehouseId: 11, reason: '대부분 오금동 입고' }))
    fireEvent.click(screen.getByRole('button', { name: '입고 #101 상세 보기' }))
    fireEvent.click(screen.getByRole('button', { name: '부족 작업 열기' }))
    fireEvent.change(screen.getByLabelText('오금동 부족 수량'), { target: { value: '1' } }); fireEvent.change(screen.getByLabelText('오금동 부족 사유'), { target: { value: '추가 미발송' } }); fireEvent.click(screen.getAllByRole('button', { name: '부족 종료' })[0])
    await waitFor(() => expect(mocks.closeFactoryArrivalShortage).toHaveBeenCalledWith({ allocationId: 301, quantity: 1, reason: '추가 미발송' }))
    fireEvent.click(screen.getByRole('button', { name: '입고 #101 상세 보기' }))
    fireEvent.click(screen.getByRole('button', { name: '후속 입고 작업 열기' }))
    fireEvent.change(screen.getByLabelText('부족 #401 후속 업무일'), { target: { value: '2026-04-25' } }); fireEvent.change(screen.getByLabelText('부족 #401 후속 수량'), { target: { value: '1' } }); fireEvent.change(screen.getByLabelText('부족 #401 후속 사유'), { target: { value: '늦은 박스' } }); fireEvent.click(screen.getByRole('button', { name: '후속 입고' }))
    await waitFor(() => expect(mocks.recordFactoryArrivalFollowUp).toHaveBeenCalledWith(expect.objectContaining({ closureId: 401, warehouseId: 11, quantity: 1, reason: '늦은 박스', receiptBusinessDate: '2026-04-25' })))
    fireEvent.click(screen.getByRole('button', { name: '입고 #101 상세 보기' }))
    fireEvent.click(screen.getByRole('button', { name: '정정 작업 열기' }))
    fireEvent.change(screen.getByLabelText('입고 기록 #501 정정 사유'), { target: { value: '다른 상품' } }); fireEvent.click(screen.getByRole('button', { name: '전체 반전' }))
    await waitFor(() => expect(mocks.reverseFactoryReceiptLine).toHaveBeenCalledWith(expect.objectContaining({ receiptLineId: 501, reason: '다른 상품' })))
  })

  it('keeps allocation editing open when the server returns an item-scoped failure', async () => {
    mocks.replaceFactoryArrivalAllocations.mockResolvedValue({ success: false, error: { key: 'item-201', message: '배정 합계를 다시 확인해주세요.' } })
    render(React.createElement(ArrivalsView, {
      schemaState: { status: 'ready', message: null }, factories: [], warehouses: [{ id: 11, name: '오금동' }], models: [],
      arrivals: [{ id: 101, factoryName: '광주 협력사', expectedDate: '2026-04-21', status: 'READY', sourceChannel: 'manual', memo: null, totalOrderedQuantity: 5, remainingQuantity: 5, shortageClosures: [], receiptLines: [], items: [{ id: 201, productVariantId: 901, modelName: 'LP01', sizeName: 'S', colorName: '네이비', colorRgb: '#111111', orderedQuantity: 5, receivedQuantity: 0, remainingQuantity: 5, allocations: [{ id: 301, warehouseId: 11, warehouseName: '오금동', allocatedQuantity: 5, normallyReceivedQuantity: 0, shortageClosedQuantity: 0, remainingQuantity: 5 }] }] }],
    }))
    fireEvent.click(screen.getByRole('button', { name: '입고 #101 상세 보기' }))
    fireEvent.click(screen.getByRole('button', { name: '배정 작업 열기' }))
    fireEvent.change(screen.getByLabelText('LP01 배정 변경 사유'), { target: { value: '창고 변경' } })
    fireEvent.click(screen.getByRole('button', { name: '배정 저장' }))
    expect((await screen.findByTestId('operation-error-item-201')).textContent).toContain('배정 합계를 다시 확인해주세요.')
    expect(screen.getByRole('button', { name: '배정 작업 열기' }).getAttribute('aria-pressed')).toBe('true')
  })

  it('keeps the selected operation and its draft visible after a scoped second-line server error', async () => {
    mocks.receiveFactoryArrivalRequest.mockResolvedValue({ success: false, error: { key: 'allocation-302', message: '두 번째 행을 다시 확인해주세요.' } })
    render(React.createElement(ArrivalsView, {
      schemaState: { status: 'ready', message: null }, factories: [], warehouses: [{ id: 11, name: '오금동' }], models: [],
      arrivals: [{ id: 101, factoryName: '광주 협력사', expectedDate: '2026-04-21', status: 'READY', sourceChannel: 'manual', memo: null, totalOrderedQuantity: 10, remainingQuantity: 10, shortageClosures: [], receiptLines: [], items: [{ id: 201, productVariantId: 901, modelName: 'LP01', sizeName: 'S', colorName: '네이비', colorRgb: '#111111', orderedQuantity: 10, receivedQuantity: 0, remainingQuantity: 10, allocations: [{ id: 301, warehouseId: 11, warehouseName: '오금동', allocatedQuantity: 5, normallyReceivedQuantity: 0, shortageClosedQuantity: 0, remainingQuantity: 5 }, { id: 302, warehouseId: 12, warehouseName: '대자동', allocatedQuantity: 5, normallyReceivedQuantity: 0, shortageClosedQuantity: 0, remainingQuantity: 5 }] }] }],
    }))
    fireEvent.click(screen.getByRole('button', { name: '입고 #101 상세 보기' }))
    fireEvent.click(screen.getByRole('button', { name: '입고 반영 작업 열기' }))
    fireEvent.change(screen.getByLabelText('오금동 정상 입고'), { target: { value: '2' } })
    fireEvent.change(screen.getByLabelText('대자동 정상 입고'), { target: { value: '1' } })
    fireEvent.click(screen.getByRole('button', { name: '입고 반영' }))
    expect((await screen.findByRole('alert')).textContent).toContain('두 번째 행을 다시 확인해주세요.')
    expect(screen.getByRole('button', { name: '입고 반영 작업 열기' }).getAttribute('aria-pressed')).toBe('true')
    expect((screen.getByLabelText('오금동 정상 입고') as HTMLInputElement).value).toBe('2')
    expect((screen.getByLabelText('대자동 정상 입고') as HTMLInputElement).value).toBe('1')
    expect(screen.getByTestId('operation-error-allocation-302').textContent).toContain('두 번째 행을 다시 확인해주세요.')
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

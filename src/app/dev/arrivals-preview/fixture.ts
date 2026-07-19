import type { ComponentProps } from 'react'
import type ArrivalsView from '@/app/(protected)/sourcing/arrivals/ArrivalsView'

type ArrivalsViewProps = ComponentProps<typeof ArrivalsView>

export const arrivalsPreviewProps = {
  schemaState: { status: 'ready', message: null },
  factories: [
    { id: 1, name: '광저우 협력 공장', isActive: true },
    { id: 2, name: '이우 샘플 공장', isActive: true },
  ],
  warehouses: [
    { id: 11, name: '오금동' },
    { id: 12, name: '대자동' },
  ],
  models: [
    {
      id: 101,
      name: 'LP01 린넨 파우치',
      sizes: [{ id: 201, name: 'S' }],
      colors: [{ id: 301, name: '네이비', rgbCode: '#1f2937' }],
    },
  ],
  productVariants: [
    { id: 901, label: 'LP01-NV-S · LP01 린넨 파우치 / 네이비 / S' },
  ],
  arrivals: [
    {
      id: 1001,
      factoryName: '광저우 협력 공장',
      expectedDate: '2026-07-21',
      status: 'PARTIAL',
      sourceChannel: 'supplier-excel',
      memo: '선적번호 GZ-202607-018 · 동일 SKU 반복 행 유지',
      totalOrderedQuantity: 42,
      remainingQuantity: 27,
      shortageClosures: [
        {
          id: 4001,
          allocationId: 3001,
          quantity: 3,
          reason: '공장 미출고 확인',
          closedAt: '2026-07-19T10:30:00+09:00',
        },
      ],
      receiptLines: [
        {
          id: 5001,
          eventId: 6001,
          businessDate: '2026-07-19',
          itemId: 2001,
          allocationId: 3001,
          warehouseId: 11,
          receivedQuantity: 8,
          normalQuantity: 8,
          overageQuantity: 0,
          overageReason: null,
          shortageClosureId: null,
          createdAt: '2026-07-19T09:40:00+09:00',
          corrected: false,
        },
        {
          id: 5002,
          eventId: 6002,
          businessDate: '2026-07-19',
          itemId: 2002,
          allocationId: 3003,
          warehouseId: 11,
          receivedQuantity: 4,
          normalQuantity: 4,
          overageQuantity: 0,
          overageReason: null,
          shortageClosureId: null,
          createdAt: '2026-07-19T11:10:00+09:00',
          corrected: false,
        },
      ],
      items: [
        {
          id: 2001,
          productVariantId: 901,
          modelName: 'LP01 린넨 파우치',
          sizeName: 'S',
          colorName: '네이비',
          colorRgb: '#1f2937',
          orderedQuantity: 30,
          receivedQuantity: 8,
          remainingQuantity: 19,
          sourceRowNumber: 2,
          externalSku: 'CN-LP01-NV-S',
          allocations: [
            {
              id: 3001,
              warehouseId: 11,
              warehouseName: '오금동',
              allocatedQuantity: 20,
              normallyReceivedQuantity: 8,
              shortageClosedQuantity: 3,
              remainingQuantity: 9,
            },
            {
              id: 3002,
              warehouseId: 12,
              warehouseName: '대자동',
              allocatedQuantity: 10,
              normallyReceivedQuantity: 0,
              shortageClosedQuantity: 0,
              remainingQuantity: 10,
            },
          ],
        },
        {
          id: 2002,
          productVariantId: 901,
          modelName: 'LP01 린넨 파우치',
          sizeName: 'S',
          colorName: '네이비',
          colorRgb: '#1f2937',
          orderedQuantity: 12,
          receivedQuantity: 4,
          remainingQuantity: 8,
          sourceRowNumber: 5,
          externalSku: 'CN-LP01-NV-S',
          allocations: [
            {
              id: 3003,
              warehouseId: 11,
              warehouseName: '오금동',
              allocatedQuantity: 12,
              normallyReceivedQuantity: 4,
              shortageClosedQuantity: 0,
              remainingQuantity: 8,
            },
          ],
        },
      ],
    },
  ],
} satisfies ArrivalsViewProps

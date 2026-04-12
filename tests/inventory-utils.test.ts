import { describe, expect, it } from 'vitest'
import {
  formatDateGroup,
  formatDateInput,
  formatDateLabel,
  parseTransactionType,
  parseWarehouse,
  transactionTypeLabels,
  warehouseLabels,
} from '@/lib/inventory'

describe('inventory helpers', () => {
  it('maps Supabase enum values to display labels', () => {
    expect(warehouseLabels.OGEUMDONG).toBe('오금동')
    expect(warehouseLabels.DAEJADONG).toBe('대자동')
    expect(transactionTypeLabels.INBOUND).toBe('입고')
    expect(transactionTypeLabels.OUTBOUND).toBe('반출')
    expect(transactionTypeLabels.ADJUSTMENT).toBe('재고조정')
  })

  it('parses user-facing warehouse and transaction labels into canonical values', () => {
    expect(parseWarehouse('오금동')).toBe('OGEUMDONG')
    expect(parseWarehouse('DAEJADONG')).toBe('DAEJADONG')
    expect(parseTransactionType('입고')).toBe('INBOUND')
    expect(parseTransactionType('OUTBOUND')).toBe('OUTBOUND')
  })

  it('formats dates consistently for storage and display', () => {
    expect(formatDateInput('2026-04-12T15:30:00.000Z')).toBe('2026-04-12')
    expect(formatDateLabel('2026-04-12T15:30:00.000Z')).toBe('26.04.12')
    expect(formatDateGroup('2026-04-12T15:30:00.000Z', 'daily')).toBe('2026-04-12')
    expect(formatDateGroup('2026-04-12T15:30:00.000Z', 'monthly')).toBe('26.04')
    expect(formatDateGroup('2026-04-12T15:30:00.000Z', 'yearly')).toBe('26')
  })

  it('rejects unsupported values early', () => {
    expect(() => parseWarehouse('other')).toThrow('Unsupported warehouse: other')
    expect(() => parseTransactionType('other')).toThrow('Unsupported transaction type: other')
  })
})

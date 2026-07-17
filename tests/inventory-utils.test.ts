import { describe, expect, it } from 'vitest'
import { normalizeManualInventoryOperation, parseTransactionType, transactionTypeLabels } from '@/lib/inventory'

describe('inventory utility constants', () => {
  it('defines Korean transaction labels', () => {
    expect(transactionTypeLabels.INBOUND).toBe('입고')
    expect(transactionTypeLabels.OUTBOUND).toBe('출고')
    expect(transactionTypeLabels.ADJUSTMENT).toBe('재고조정')
  })

  it('parses warehouse-level transaction labels into canonical values', () => {
    expect(parseTransactionType('입고')).toBe('INBOUND')
    expect(parseTransactionType('OUTBOUND')).toBe('OUTBOUND')
    expect(parseTransactionType('재고조정')).toBe('ADJUSTMENT')
  })

  it('throws for unsupported transaction values', () => {
    expect(() => parseTransactionType('other')).toThrow('Unsupported transaction type: other')
  })

  it('keeps quick inbound, manual outbound, and count adjustment contracts distinct and requires an audit reason', () => {
    expect(normalizeManualInventoryOperation({ kind: 'inbound', quantity: 3, reason: '검수 입고' })).toEqual({
      kind: 'inbound',
      type: 'INBOUND',
      quantity: 3,
      reason: '검수 입고',
    })
    expect(normalizeManualInventoryOperation({ kind: 'manual-outbound', quantity: 3, reason: '파손 폐기' })).toEqual({
      kind: 'manual-outbound',
      type: 'OUTBOUND',
      quantity: 3,
      reason: '파손 폐기',
    })
    expect(normalizeManualInventoryOperation({ kind: 'count-adjustment', quantity: 12, reason: '월말 실사' })).toEqual({
      kind: 'count-adjustment',
      type: 'ADJUSTMENT',
      quantity: 12,
      reason: '월말 실사',
    })
    expect(() => normalizeManualInventoryOperation({ kind: 'manual-outbound', quantity: 1, reason: '  ' })).toThrow('사유')
    expect(() => normalizeManualInventoryOperation({ kind: 'count-adjustment', quantity: -1, reason: '월말 실사' })).toThrow('수량')
    expect(() => normalizeManualInventoryOperation({ kind: 'count-adjustment', quantity: 1.5, reason: '월말 실사' })).toThrow('수량')
  })
})

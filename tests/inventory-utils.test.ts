import { describe, expect, it } from 'vitest'
import { parseTransactionType, transactionTypeLabels } from '@/lib/inventory'

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
})

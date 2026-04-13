export const TRANSACTION_TYPE_VALUES = ['INBOUND', 'OUTBOUND', 'ADJUSTMENT'] as const
export type TransactionTypeValue = (typeof TRANSACTION_TYPE_VALUES)[number]

export const transactionTypeLabels: Record<TransactionTypeValue, string> = {
  INBOUND: '입고',
  OUTBOUND: '출고',
  ADJUSTMENT: '재고조정',
}

export function parseTransactionType(value: string): TransactionTypeValue {
  if (value === '입고' || value === 'INBOUND') return 'INBOUND'
  if (value === '출고' || value === '반출' || value === 'OUTBOUND') return 'OUTBOUND'
  if (value === '재고조정' || value === 'ADJUSTMENT') return 'ADJUSTMENT'
  throw new Error(`Unsupported transaction type: ${value}`)
}

export function formatDateInput(value: Date | string): string {
  const date = typeof value === 'string' ? new Date(value) : value
  const year = date.getUTCFullYear()
  const month = String(date.getUTCMonth() + 1).padStart(2, '0')
  const day = String(date.getUTCDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function formatDateLabel(value: Date | string): string {
  const input = formatDateInput(value)
  return `${input.slice(2, 4)}.${input.slice(5, 7)}.${input.slice(8, 10)}`
}

export function formatDateGroup(
  value: Date | string,
  period: 'daily' | 'monthly' | 'yearly'
): string {
  const input = formatDateInput(value)
  if (period === 'daily') return input
  if (period === 'monthly') return input.slice(2, 7).replace('-', '.')
  return input.slice(2, 4)
}

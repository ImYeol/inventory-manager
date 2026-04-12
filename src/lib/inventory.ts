export const WAREHOUSE_VALUES = ['OGEUMDONG', 'DAEJADONG'] as const
export const TRANSACTION_TYPE_VALUES = ['INBOUND', 'OUTBOUND', 'ADJUSTMENT'] as const

export type WarehouseValue = (typeof WAREHOUSE_VALUES)[number]
export type TransactionTypeValue = (typeof TRANSACTION_TYPE_VALUES)[number]

export const warehouseLabels: Record<WarehouseValue, string> = {
  OGEUMDONG: '오금동',
  DAEJADONG: '대자동',
}

export const transactionTypeLabels: Record<TransactionTypeValue, string> = {
  INBOUND: '입고',
  OUTBOUND: '반출',
  ADJUSTMENT: '재고조정',
}

export function parseWarehouse(value: string): WarehouseValue {
  if (value === '오금동' || value === 'OGEUMDONG') return 'OGEUMDONG'
  if (value === '대자동' || value === 'DAEJADONG') return 'DAEJADONG'
  throw new Error(`Unsupported warehouse: ${value}`)
}

export function parseTransactionType(value: string): TransactionTypeValue {
  if (value === '입고' || value === 'INBOUND') return 'INBOUND'
  if (value === '반출' || value === 'OUTBOUND') return 'OUTBOUND'
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

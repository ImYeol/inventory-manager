"use client"

import * as React from 'react'
import { motion, type Variants } from 'framer-motion'
import { cn } from '@/lib/utils'
import { ui } from '@/app/components/ui'
import { StatusBadge } from './badge-1'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './table'

export type InventoryStatusVariant = 'success' | 'warning' | 'danger'
export type InventoryColumnKey =
  | 'modelName'
  | 'skuOption'
  | 'warehouseName'
  | 'onHand'
  | 'committed'
  | 'available'
  | 'incoming'
  | 'status'

export type InventoryDataRow = {
  key: string
  modelName: string
  skuOption: React.ReactNode
  warehouseName: string
  onHand: number
  committed: number
  available: number
  incoming: number
  status: {
    label: string
    variant: InventoryStatusVariant
  }
}

const rowVariants: Variants = {
  hidden: { opacity: 0, y: 10 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: {
      delay: i * 0.03,
      duration: 0.18,
      ease: [0.4, 0, 0.2, 1],
    },
  }),
}

const tableHeaders: Array<{ key: InventoryColumnKey; label: string; className?: string }> = [
  { key: 'modelName', label: '상품' },
  { key: 'skuOption', label: 'SKU / 옵션' },
  { key: 'warehouseName', label: '창고' },
  { key: 'onHand', label: '현재 재고', className: 'text-right' },
  { key: 'committed', label: '예약 재고', className: 'text-right' },
  { key: 'available', label: '출고 가능', className: 'text-right' },
  { key: 'incoming', label: '입고 예정', className: 'text-right' },
  { key: 'status', label: '상태' },
]

export function InventoryDataTable({
  rows,
  visibleColumns,
}: {
  rows: InventoryDataRow[]
  visibleColumns: Set<InventoryColumnKey>
}) {
  return (
    <Table>
          <TableHeader>
            <TableRow>
              {tableHeaders
                .filter((header) => visibleColumns.has(header.key))
                .map((header) => (
                  <TableHead key={header.key} className={cn(ui.tableHeadCell, header.className)}>
                    {header.label}
                  </TableHead>
                ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length > 0 ? (
              rows.map((row, index) => (
                <motion.tr
                  key={row.key}
                  custom={index}
                  initial="hidden"
                  animate="visible"
                  variants={rowVariants}
                  className="border-b border-[color:var(--border)] transition-colors hover:bg-[color:var(--surface-muted)] data-[state=selected]:bg-[color:var(--surface-muted)]"
                >
                  {visibleColumns.has('modelName') && (
                    <TableCell className={cn(ui.tableCell, 'font-medium text-[color:var(--foreground)]')}>
                      {row.modelName}
                    </TableCell>
                  )}
                  {visibleColumns.has('skuOption') && <TableCell>{row.skuOption}</TableCell>}
                  {visibleColumns.has('warehouseName') && <TableCell>{row.warehouseName}</TableCell>}
                  {visibleColumns.has('onHand') && (
                    <TableCell className={cn(ui.tableCell, 'text-right font-semibold text-[color:var(--foreground)]')}>
                      {row.onHand}
                    </TableCell>
                  )}
                  {visibleColumns.has('committed') && <TableCell className="text-right">{row.committed}</TableCell>}
                  {visibleColumns.has('available') && <TableCell className="text-right">{row.available}</TableCell>}
                  {visibleColumns.has('incoming') && <TableCell className="text-right">{row.incoming}</TableCell>}
                  {visibleColumns.has('status') && (
                    <TableCell>
                      <StatusBadge tone={row.status.variant}>
                        {row.status.label}
                      </StatusBadge>
                    </TableCell>
                  )}
                </motion.tr>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={visibleColumns.size} className="px-4 py-10 text-center text-sm text-[color:var(--muted-foreground)]">
                  조회 조건에 맞는 재고가 없습니다.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
  )
}

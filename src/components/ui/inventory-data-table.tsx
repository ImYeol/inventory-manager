"use client"

import * as React from 'react'
import Link from 'next/link'
import { motion, type Variants } from 'framer-motion'
import { cn } from '@/lib/utils'
import { ui } from '@/app/components/ui'
import { StatusBadge } from './badge-1'
import { Button } from './button'
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
  incomingHref?: string
  status: {
    label: string
    variant: InventoryStatusVariant
  }
  /**
   * Opens the mode-locked count-adjustment sheet pre-filled with this row's
   * ProductVariant (model/size/color) and warehouse (ADR-004; docs GitHub issue #17
   * Topic 1). Omitted when the row has no addressable variant to adjust.
   */
  onAdjust?: () => void
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
  const hasRowActions = rows.some((row) => row.onAdjust)

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
              {hasRowActions && (
                <TableHead key="actions" className={cn(ui.tableHeadCell, 'text-right')}>
                  <span className="sr-only">행 작업</span>
                </TableHead>
              )}
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
                  className="group border-b border-[color:var(--border)] transition-colors hover:bg-[color:var(--surface-muted)] data-[state=selected]:bg-[color:var(--surface-muted)]"
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
                  {visibleColumns.has('incoming') && <TableCell className="text-right">{row.incomingHref && row.incoming > 0 ? <Link href={row.incomingHref} className="font-medium text-[color:var(--primary)] underline-offset-4 hover:underline" aria-label={`입고 예정 ${row.incoming}개 보기`}>{row.incoming}</Link> : row.incoming}</TableCell>}
                  {visibleColumns.has('status') && (
                    <TableCell>
                      <StatusBadge tone={row.status.variant}>
                        {row.status.label}
                      </StatusBadge>
                    </TableCell>
                  )}
                  {hasRowActions && (
                    <TableCell className="text-right">
                      {row.onAdjust ? (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={row.onAdjust}
                          className="opacity-0 transition-opacity focus-visible:opacity-100 group-hover:opacity-100"
                        >
                          조정
                        </Button>
                      ) : null}
                    </TableCell>
                  )}
                </motion.tr>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={visibleColumns.size + (hasRowActions ? 1 : 0)}
                  className="px-4 py-10 text-center text-sm text-[color:var(--muted-foreground)]"
                >
                  조회 조건에 맞는 재고가 없습니다.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
  )
}

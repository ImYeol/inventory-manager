"use client"

import * as React from 'react'
import { motion } from 'framer-motion'
import { StatusBadge } from './badge-1'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './table'

export type InventoryStatusVariant = 'success' | 'warning' | 'danger'
export type InventoryColumnKey =
  | 'modelName'
  | 'option'
  | 'warehouseName'
  | 'quantity'
  | 'latestInbound'
  | 'latestOutbound'
  | 'status'

export type InventoryDataRow = {
  key: string
  modelName: string
  option: React.ReactNode
  warehouseName: string
  quantity: number
  latestInbound: string
  latestOutbound: string
  status: {
    label: string
    variant: InventoryStatusVariant
  }
}

const rowVariants = {
  hidden: { opacity: 0, y: 10 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: {
      delay: i * 0.03,
      duration: 0.22,
      ease: 'easeInOut',
    },
  }),
}

const tableHeaders: Array<{ key: InventoryColumnKey; label: string; className?: string }> = [
  { key: 'modelName', label: '상품' },
  { key: 'option', label: '옵션' },
  { key: 'warehouseName', label: '창고' },
  { key: 'quantity', label: '현재 재고', className: 'text-right' },
  { key: 'latestInbound', label: '최근 입고' },
  { key: 'latestOutbound', label: '최근 출고' },
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
    <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="relative w-full overflow-auto">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              {tableHeaders
                .filter((header) => visibleColumns.has(header.key))
                .map((header) => (
                  <TableHead key={header.key} className={header.className}>
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
                  className="border-b border-slate-100 transition-colors hover:bg-slate-50/70"
                >
                  {visibleColumns.has('modelName') && <TableCell className="font-medium text-slate-950">{row.modelName}</TableCell>}
                  {visibleColumns.has('option') && <TableCell>{row.option}</TableCell>}
                  {visibleColumns.has('warehouseName') && <TableCell>{row.warehouseName}</TableCell>}
                  {visibleColumns.has('quantity') && (
                    <TableCell className="text-right font-semibold text-slate-950">{row.quantity}</TableCell>
                  )}
                  {visibleColumns.has('latestInbound') && <TableCell>{row.latestInbound}</TableCell>}
                  {visibleColumns.has('latestOutbound') && <TableCell>{row.latestOutbound}</TableCell>}
                  {visibleColumns.has('status') && (
                    <TableCell>
                      <StatusBadge
                        tone={
                          row.status.variant === 'success'
                            ? 'success'
                            : row.status.variant === 'warning'
                              ? 'warning'
                              : 'danger'
                        }
                        className="px-2.5 py-1"
                      >
                        {row.status.label}
                      </StatusBadge>
                    </TableCell>
                  )}
                </motion.tr>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={visibleColumns.size} className="h-24 text-center">
                  조회 조건에 맞는 재고가 없습니다.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}

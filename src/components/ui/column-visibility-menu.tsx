"use client"

import { Columns3 } from 'lucide-react'
import { Button } from './button'
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from './dropdown-menu'

export type ColumnOption<T extends string> = {
  key: T
  label: string
}

export function ColumnVisibilityMenu<T extends string>({
  columns,
  visibleColumns,
  onToggle,
}: {
  columns: Array<ColumnOption<T>>
  visibleColumns: Set<T>
  onToggle: (column: T) => void
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="h-10 gap-2 rounded-xl border-slate-200">
          <Columns3 className="h-4 w-4" />
          <span>컬럼</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuLabel>표시할 컬럼</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {columns.map((column) => (
          <DropdownMenuCheckboxItem
            key={column.key}
            checked={visibleColumns.has(column.key)}
            onCheckedChange={() => onToggle(column.key)}
          >
            {column.label}
          </DropdownMenuCheckboxItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

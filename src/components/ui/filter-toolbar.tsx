import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

/**
 * Layout for the controls inside a data-surface toolbar strip: a compact filter
 * cluster on the left and a meta/action cluster on the right. This renders only
 * layout — the bordered strip, padding, and background come from
 * `TableSurface`'s toolbar slot (`ui-data-toolbar`).
 */
export function FilterToolbar({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={cn(
        'flex w-full min-w-0 flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between',
        className,
      )}
    >
      {children}
    </div>
  )
}

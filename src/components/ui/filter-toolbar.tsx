import type { ReactNode } from 'react'
import { ui } from '@/app/components/ui'
import { cn } from '@/lib/utils'

export function FilterToolbar({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={cn(
        ui.surfaceMuted,
        'flex flex-col gap-2 px-3 py-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between',
        className,
      )}
    >
      {children}
    </div>
  )
}

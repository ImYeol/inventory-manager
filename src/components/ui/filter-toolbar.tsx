import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

export function FilterToolbar({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={cn(
        'flex flex-col gap-2 rounded-2xl border border-slate-200 bg-white/90 px-3 py-3 shadow-sm sm:flex-row sm:flex-wrap sm:items-center sm:justify-between',
        className,
      )}
    >
      {children}
    </div>
  )
}

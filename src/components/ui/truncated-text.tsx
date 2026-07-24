import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

export function TruncatedText({
  children,
  value,
  variant = 'secondary',
}: {
  children: ReactNode
  value: string
  variant?: 'primary' | 'secondary'
}) {
  return (
    <span
      tabIndex={0}
      aria-label={value}
      title={value}
      className={cn(
        'block max-w-full outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--focus-ring)]',
        variant === 'primary' ? 'line-clamp-2 sm:truncate' : 'truncate',
      )}
    >
      {children}
    </span>
  )
}

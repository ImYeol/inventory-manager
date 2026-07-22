import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

export type TimelineStepStatus = 'complete' | 'current' | 'pending'

export function Timeline({ className, children, ...props }: React.OlHTMLAttributes<HTMLOListElement>) {
  return (
    <ol className={cn('flex flex-col', className)} {...props}>
      {children}
    </ol>
  )
}

export function TimelineItem({
  status,
  last = false,
  className,
  children,
}: {
  status: TimelineStepStatus
  last?: boolean
  className?: string
  children: ReactNode
}) {
  return (
    <li className={cn('relative flex gap-3 pb-4', last && 'pb-0', className)} data-status={status}>
      {!last ? (
        <span
          aria-hidden="true"
          className={cn(
            'absolute left-[0.5625rem] top-5 bottom-0 w-px',
            status === 'complete' ? 'bg-[color:var(--primary)]' : 'bg-[color:var(--border)]',
          )}
        />
      ) : null}
      {children}
    </li>
  )
}

export function TimelineIndicator({ status }: { status: TimelineStepStatus }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        'relative z-10 mt-0.5 flex size-[1.125rem] shrink-0 items-center justify-center rounded-full border-2',
        status === 'complete' && 'border-[color:var(--primary)] bg-[color:var(--primary)]',
        status === 'current' && 'border-[color:var(--primary)] bg-[color:var(--background)]',
        status === 'pending' && 'border-[color:var(--border)] bg-[color:var(--background)]',
      )}
    >
      {status === 'complete' ? (
        <svg viewBox="0 0 12 12" className="size-2.5 text-[color:var(--primary-foreground)]" fill="none">
          <path d="M2.5 6.2 5 8.7l4.5-5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      ) : status === 'current' ? (
        <span className="size-2 rounded-full bg-[color:var(--primary)]" />
      ) : null}
    </span>
  )
}

export function TimelineContent({
  title,
  description,
  status,
  className,
}: {
  title: string
  description?: string
  status: TimelineStepStatus
  className?: string
}) {
  return (
    <div className={cn('min-w-0 pb-1', className)}>
      <p className={cn('text-sm font-medium', status === 'pending' ? 'text-[color:var(--muted-foreground)]' : 'text-[color:var(--foreground)]')}>
        {title}
      </p>
      {description ? <p className="text-xs text-[color:var(--muted-foreground)]">{description}</p> : null}
    </div>
  )
}

import { cn } from '@/lib/utils'

export function StoreConnectionStatus({
  configured,
  compact = false,
  framed = true,
  disconnectedTone = 'danger',
}: {
  configured: boolean
  compact?: boolean
  framed?: boolean
  disconnectedTone?: 'danger' | 'muted'
}) {
  const label = configured ? '연결됨' : '미연결'
  const indicatorClass = configured
    ? 'bg-[color:var(--hue-success)]'
    : disconnectedTone === 'muted'
      ? 'bg-[color:var(--muted-foreground)]'
      : 'bg-[color:var(--hue-danger)]'

  return (
    <span
      aria-label={label}
      className={cn(
        'inline-flex items-center gap-1.5 text-xs font-semibold text-[color:var(--foreground)]',
        !configured && disconnectedTone === 'muted' && 'text-[color:var(--muted-foreground)]',
        framed && !compact && 'rounded-full border border-[color:var(--border)] bg-[color:var(--surface)] px-2.5 py-1',
        compact && 'gap-0',
      )}
    >
      <span aria-hidden="true" className={cn('inline-flex h-2.5 w-2.5 shrink-0 rounded-full', indicatorClass)} />
      {compact ? null : <span>{label}</span>}
    </span>
  )
}

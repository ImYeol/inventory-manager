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
  const indicatorClass = configured ? 'bg-emerald-500' : disconnectedTone === 'muted' ? 'bg-slate-400' : 'bg-red-500'

  return (
    <span
      aria-label={label}
      className={cn(
        'inline-flex items-center gap-1.5 text-xs font-semibold text-slate-700',
        !configured && disconnectedTone === 'muted' && 'text-slate-500',
        framed && !compact && 'rounded-full border border-slate-200 bg-white px-2.5 py-1',
        compact && 'gap-0',
      )}
    >
      <span aria-hidden="true" className={cn('inline-flex h-2.5 w-2.5 shrink-0 rounded-full', indicatorClass)} />
      {compact ? null : <span>{label}</span>}
    </span>
  )
}

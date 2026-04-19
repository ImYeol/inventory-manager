import { cn } from '@/lib/utils'

export function StoreConnectionStatus({
  configured,
  compact = false,
}: {
  configured: boolean
  compact?: boolean
}) {
  const label = configured ? '연결됨' : '미연결'

  return (
    <span
      aria-label={label}
      className={cn('inline-flex items-center gap-1.5 text-xs font-semibold text-slate-700', compact && 'gap-0')}
    >
      <span
        aria-hidden="true"
        className={cn('inline-flex h-2.5 w-2.5 shrink-0 rounded-full', configured ? 'bg-emerald-500' : 'bg-red-500')}
      />
      {compact ? null : <span>{label}</span>}
    </span>
  )
}

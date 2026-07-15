import type { ReactNode } from 'react'
import { Card, CardContent, CardHeader } from './card'
import { StoreConnectionStatus } from './store-connection-status'

function formatUpdatedAt(value?: string | null) {
  if (!value) return '아직 저장 이력이 없습니다.'

  return new Intl.DateTimeFormat('ko-KR', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value))
}

export function StoreConnectionRow({
  provider,
  configured,
  summary,
  updatedAt,
  action,
  children,
}: {
  provider: string
  configured: boolean
  summary: Array<{ label: string; value?: string }>
  updatedAt?: string | null
  action?: ReactNode
  children?: ReactNode
}) {
  return (
    <Card variant="strong">
      <CardHeader className="flex flex-row items-center justify-between gap-3 space-y-0">
        <div className="flex items-center gap-2">
          <h2 className="text-base font-semibold text-[color:var(--foreground)]">{provider}</h2>
          <StoreConnectionStatus configured={configured} />
        </div>
        {action ? <div className="shrink-0">{action}</div> : null}
      </CardHeader>

      <CardContent className="space-y-5 pt-0">
        {configured ? (
          <dl className="grid gap-x-4 gap-y-2 text-sm sm:grid-cols-2">
            {summary.map((item) => (
              <div key={item.label} className="flex items-baseline justify-between gap-3">
                <dt className="text-xs font-medium text-[color:var(--muted-foreground)]">{item.label}</dt>
                <dd translate="no" className="truncate text-sm font-medium text-[color:var(--foreground)]">
                  {item.value ?? '—'}
                </dd>
              </div>
            ))}
            <div className="flex items-baseline justify-between gap-3">
              <dt className="text-xs font-medium text-[color:var(--muted-foreground)]">최근 변경</dt>
              <dd className="text-sm text-[color:var(--foreground)]">{formatUpdatedAt(updatedAt)}</dd>
            </div>
          </dl>
        ) : null}
        {children}
      </CardContent>
    </Card>
  )
}

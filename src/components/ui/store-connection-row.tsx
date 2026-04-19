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
      <CardHeader className="grid gap-3 md:grid-cols-[minmax(0,1fr)_auto] md:items-start">
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <h2 className="text-base font-semibold text-[color:var(--foreground)]">{provider}</h2>
            <StoreConnectionStatus configured={configured} />
          </div>
          <dl className="grid gap-2 text-sm text-slate-500 sm:grid-cols-2">
            {summary.map((item) => (
              <div key={item.label} className="space-y-0.5">
                <dt className="text-xs font-medium uppercase tracking-[0.12em] text-slate-400">{item.label}</dt>
                <dd translate="no" className="text-sm text-slate-700">
                  {item.value ?? '저장된 키 없음'}
                </dd>
              </div>
            ))}
            <div className="space-y-0.5">
              <dt className="text-xs font-medium uppercase tracking-[0.12em] text-slate-400">최근 변경</dt>
              <dd className="text-sm text-slate-700">{formatUpdatedAt(updatedAt)}</dd>
            </div>
          </dl>
        </div>
        {action ? <div className="flex shrink-0 items-start justify-end md:justify-self-end">{action}</div> : null}
      </CardHeader>

      {children ? <CardContent className="space-y-4 pt-0">{children}</CardContent> : null}
    </Card>
  )
}

import type { ReactNode } from 'react'
import Link from 'next/link'
import { StatusBadge } from './badge-1'
import { ui } from '@/app/components/ui'

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
  href,
  children,
}: {
  provider: string
  configured: boolean
  summary: Array<{ label: string; value?: string }>
  updatedAt?: string | null
  href?: string
  children?: ReactNode
}) {
  return (
    <section className="surface p-4">
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <h2 className="text-base font-semibold text-slate-950">{provider}</h2>
              <StatusBadge tone={configured ? 'success' : 'warning'}>{configured ? '연결됨' : '미연결'}</StatusBadge>
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
          {href ? (
            <Link href={href} className={ui.buttonSecondary}>
              {configured ? '변경' : '연결'}
            </Link>
          ) : null}
        </div>

        {children ? <div className="border-t border-slate-100 pt-4">{children}</div> : null}
      </div>
    </section>
  )
}

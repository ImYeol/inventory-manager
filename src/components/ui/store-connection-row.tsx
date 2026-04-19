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
}: {
  provider: string
  configured: boolean
  summary: Array<{ label: string; value?: string }>
  updatedAt?: string | null
  href?: string
}) {
  return (
    <section className="surface p-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <h2 className="text-base font-semibold text-slate-950">{provider}</h2>
            <StatusBadge tone={configured ? 'success' : 'warning'}>{configured ? '연결됨' : '미연결'}</StatusBadge>
          </div>
          <div className="space-y-1 text-sm text-slate-500">
            {summary.map((item) => (
              <p key={item.label}>
                {item.label}: <span translate="no">{item.value ?? '저장된 키 없음'}</span>
              </p>
            ))}
            <p>최근 변경: {formatUpdatedAt(updatedAt)}</p>
          </div>
        </div>
        {href ? (
          <Link href={href} className={ui.buttonSecondary}>
            {configured ? '변경' : '연결'}
          </Link>
        ) : null}
      </div>
    </section>
  )
}

import { StatusBadge, type BadgeTone } from '@/components/ui/badge-1'

function EntryCard({
  title,
  badge,
  tone,
  description,
}: {
  title: string
  badge: string
  tone: BadgeTone
  description: string
}) {
  return (
    <section className="surface p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1">
          <h2 className="text-base font-semibold text-slate-950">{title}</h2>
          <p className="text-sm leading-6 text-slate-500">{description}</p>
        </div>
        <StatusBadge tone={tone}>{badge}</StatusBadge>
      </div>
    </section>
  )
}

export default function SettingsView() {
  return (
    <div className="space-y-4">
      <section className="rounded-2xl border border-slate-200 bg-slate-50/70 px-4 py-3">
        <p className="text-sm font-medium text-slate-800">설정은 기준 데이터와 운영 진입점만 제공합니다.</p>
        <p className="mt-1 text-sm leading-6 text-slate-600">
          네이버와 쿠팡 연결 정보는 `/integrations`에서만 수정합니다.
        </p>
      </section>

      <div className="grid gap-4 lg:grid-cols-2">
        <EntryCard
          title="기준 데이터"
          badge="관리"
          tone="neutral"
          description="창고와 상품 기준값을 정리합니다."
        />
        <EntryCard
          title="스토어 연결"
          badge="안내"
          tone="info"
          description="연결 상태와 자격증명 편집은 `/integrations`에서만 처리합니다."
        />
      </div>
    </div>
  )
}

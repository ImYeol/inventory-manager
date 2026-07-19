import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { getInboundTemplates } from '@/lib/data'
import { listTrackingPresets } from '@/lib/actions/tracking-import'
import { PageHeader, ui } from '@/app/components/ui'
import ParseTemplatesSettingsView from './ParseTemplatesSettingsView'

export const dynamic = 'force-dynamic'

export default async function SettingsParseTemplatesPage() {
  const [inboundTemplates, trackingPresets] = await Promise.all([
    getInboundTemplates(),
    listTrackingPresets(),
  ])

  return (
    <div className={ui.shell}>
      <PageHeader
        title="파싱 템플릿"
        description="입고·주문 송장 가져오기가 공유하는 파일 파싱 템플릿을 목록·버전·프리셋으로 관리합니다."
        actions={<Link href="/settings" className="inline-flex items-center gap-1.5 text-sm text-[color:var(--link)] underline-offset-4 hover:underline"><ArrowLeft aria-hidden="true" className="size-4" />설정으로</Link>}
      />
      <ParseTemplatesSettingsView inboundTemplates={inboundTemplates} trackingPresets={trackingPresets} />
    </div>
  )
}

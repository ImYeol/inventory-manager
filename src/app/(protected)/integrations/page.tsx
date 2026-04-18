import { ArrowRightLeft } from 'lucide-react'
import { getShippingSettingsSummary } from '@/lib/actions/shipping-settings'
import { ActionToolbar, ToolbarLinkAction } from '@/components/ui/toolbar'
import { PageHeader, ui } from '../../components/ui'
import IntegrationsView from './IntegrationsView'

export const dynamic = 'force-dynamic'

export default async function IntegrationsPage() {
  const summary = await getShippingSettingsSummary()

  return (
    <div className={ui.shell}>
      <PageHeader
        title="스토어 연결"
        description="네이버와 쿠팡의 연결 상태, 마스킹된 저장값, 최근 갱신 시각, 자격증명 입력을 관리합니다."
        actions={
          <ActionToolbar>
            <ToolbarLinkAction href="/shipping" icon={<ArrowRightLeft className="h-4 w-4" />}>
              운송장 화면으로 이동
            </ToolbarLinkAction>
          </ActionToolbar>
        }
      />
      <IntegrationsView summary={summary} />
    </div>
  )
}

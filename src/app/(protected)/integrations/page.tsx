import Link from 'next/link'
import { getShippingSettingsSummary } from '@/lib/actions/shipping-settings'
import { PageHeader, ui } from '../../components/ui'
import IntegrationsView from './IntegrationsView'

export const dynamic = 'force-dynamic'

export default async function IntegrationsPage() {
  const summary = await getShippingSettingsSummary()

  return (
    <div className={ui.shell}>
      <PageHeader
        kicker="Store Connections"
        title="스토어 연결"
        description="네이버와 쿠팡 연결 상태를 확인하고, 마스킹된 저장값과 최근 갱신 시각을 기준으로 자격증명을 교체합니다."
        actions={
          <Link href="/shipping" className={ui.buttonSecondary}>
            운송장 화면으로 이동
          </Link>
        }
      />
      <IntegrationsView summary={summary} />
    </div>
  )
}

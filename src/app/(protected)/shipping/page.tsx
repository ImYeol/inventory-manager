import { getShippingSettingsSummary } from '@/lib/actions/shipping-settings'
import ShippingView from './ShippingView'
import { PageHeader, ui } from '../../components/ui'

export const dynamic = 'force-dynamic'

export default async function ShippingPage() {
  const settingsSummary = await getShippingSettingsSummary()

  return (
    <div className={ui.shell}>
      <PageHeader
        title="운송장 관리"
        description="업로드한 운송장을 채널별로 분류하고 바로 발송합니다."
      />
      <ShippingView settingsSummary={settingsSummary} />
    </div>
  )
}

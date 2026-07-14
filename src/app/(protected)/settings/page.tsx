import { getShippingSettingsSummary } from '@/lib/actions/shipping-settings'
import { PageHeader, ui } from '../../components/ui'
import SettingsView from './SettingsView'

export const dynamic = 'force-dynamic'

type SettingsPageProps = {
  searchParams?:
    | Promise<{
        section?: string
        provider?: string
      }>
    | {
        section?: string
        provider?: string
      }
}

export default async function SettingsPage({ searchParams }: SettingsPageProps = {}) {
  const resolvedSearchParams = await (searchParams ?? Promise.resolve({}))
  const focusProvider =
    resolvedSearchParams.section === 'store-connections' &&
    (resolvedSearchParams.provider === 'naver' || resolvedSearchParams.provider === 'coupang')
      ? resolvedSearchParams.provider
      : undefined
  const summary = await getShippingSettingsSummary()

  return (
    <div className={ui.shell}>
      <PageHeader
        title="설정"
        description="네이버·쿠팡 채널 연결에 필요한 API 정보를 관리합니다."
      />
      <SettingsView summary={summary} focusProvider={focusProvider} />
    </div>
  )
}

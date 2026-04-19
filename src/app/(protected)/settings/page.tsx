import { LogOut } from 'lucide-react'
import { logout } from '@/app/login/actions'
import { getShippingSettingsSummary } from '@/lib/actions/shipping-settings'
import { ActionToolbar, ToolbarButtonAction } from '@/components/ui/toolbar'
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
        actions={
          <ActionToolbar>
            <form action={logout}>
              <ToolbarButtonAction type="submit" icon={<LogOut className="h-4 w-4" />}>
                로그아웃
              </ToolbarButtonAction>
            </form>
          </ActionToolbar>
        }
      />
      <SettingsView summary={summary} focusProvider={focusProvider} />
    </div>
  )
}

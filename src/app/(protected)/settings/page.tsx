import { Database, LogOut } from 'lucide-react'
import { logout } from '@/app/login/actions'
import { getShippingSettingsSummary } from '@/lib/actions/shipping-settings'
import { ActionToolbar, ToolbarButtonAction, ToolbarLinkAction } from '@/components/ui/toolbar'
import { PageHeader, ui } from '../../components/ui'
import SettingsView from './SettingsView'

export const dynamic = 'force-dynamic'

export default async function SettingsPage() {
  const summary = await getShippingSettingsSummary()

  return (
    <div className={ui.shell}>
      <PageHeader
        title="설정"
        description="스토어 연결 상태와 연결 정보를 관리합니다."
        actions={
          <ActionToolbar>
            <ToolbarLinkAction href="/products" icon={<Database className="h-4 w-4" />}>
              상품 관리
            </ToolbarLinkAction>
            <form action={logout}>
              <ToolbarButtonAction type="submit" icon={<LogOut className="h-4 w-4" />}>
                로그아웃
              </ToolbarButtonAction>
            </form>
          </ActionToolbar>
        }
      />
      <SettingsView summary={summary} />
    </div>
  )
}

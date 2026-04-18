import { Database, LogOut } from 'lucide-react'
import { logout } from '@/app/login/actions';
import { ActionToolbar, ToolbarButtonAction, ToolbarLinkAction } from '@/components/ui/toolbar'
import { PageHeader, ui } from '../../components/ui';
import SettingsView from './SettingsView';

export const dynamic = 'force-dynamic';

export default async function SettingsPage() {
  return (
    <div className={ui.shell}>
      <PageHeader
        title="설정"
        description="기준 데이터와 관리자 진입점만 제공합니다. 스토어 연결은 `/integrations`에서 관리합니다."
        actions={
          <ActionToolbar>
            <ToolbarLinkAction href="/settings/master-data" icon={<Database className="h-4 w-4" />}>
              기준 데이터
            </ToolbarLinkAction>
            <form action={logout}>
              <ToolbarButtonAction type="submit" icon={<LogOut className="h-4 w-4" />}>
                로그아웃
              </ToolbarButtonAction>
            </form>
          </ActionToolbar>
        }
      />
      <SettingsView />
    </div>
  );
}

import Link from 'next/link';
import { logout } from '@/app/login/actions';
import { getShippingSettingsSummary } from '@/lib/actions/shipping-settings';
import { PageHeader, ui } from '../../components/ui';
import SettingsView from './SettingsView';

export const dynamic = 'force-dynamic';

export default async function SettingsPage() {
  const summary = await getShippingSettingsSummary();

  return (
    <div className={ui.shell}>
      <PageHeader
        kicker="Settings"
        title="설정"
        description="배송 연동과 기준 데이터 운영을 한 곳에서 관리합니다."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Link href="/settings/master-data" className={ui.buttonSecondary}>
              기준 데이터
            </Link>
            <Link href="/shipping" className={ui.buttonSecondary}>
              운송장으로 돌아가기
            </Link>
            <form action={logout}>
              <button type="submit" className={ui.buttonSecondary} aria-label="로그아웃">
                로그아웃
              </button>
            </form>
          </div>
        }
      />
      <SettingsView summary={summary} />
    </div>
  );
}

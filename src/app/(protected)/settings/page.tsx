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
        title="배송 연동 설정"
        description="사용자별 네이버·쿠팡 API 키를 안전하게 저장하고, 저장된 값은 마스킹된 요약으로만 확인합니다."
        actions={
          <div className="flex flex-wrap items-center gap-2">
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

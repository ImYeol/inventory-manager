import Link from 'next/link';
import { getShippingSettingsSummary } from '@/lib/actions/shipping-settings';
import { PageHeader, ui } from '../../components/ui';
import SettingsView from './SettingsView';
import { enforceSetupComplete } from '@/lib/setup-guard';

export const dynamic = 'force-dynamic';

export default async function SettingsPage() {
  await enforceSetupComplete()
  const summary = await getShippingSettingsSummary();

  return (
    <div className={ui.shell}>
      <PageHeader
        kicker="Settings"
        title="배송 연동 설정"
        description="사용자별 네이버·쿠팡 API 키를 안전하게 저장하고, 저장된 값은 마스킹된 요약으로만 확인합니다."
        actions={
          <Link href="/shipping" className={ui.buttonSecondary}>
            운송장으로 돌아가기
          </Link>
        }
      />
      <SettingsView summary={summary} />
    </div>
  );
}

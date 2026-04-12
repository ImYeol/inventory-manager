import Link from 'next/link';
import { getShippingSettingsSummary } from '@/lib/actions/shipping-settings';
import ShippingView from './ShippingView';
import { PageHeader, ui } from '../../components/ui';
import { enforceSetupComplete } from '@/lib/setup-guard';

export const dynamic = 'force-dynamic';

export default async function ShippingPage() {
  await enforceSetupComplete()
  const settingsSummary = await getShippingSettingsSummary();

  return (
    <div className={ui.shell}>
      <PageHeader
        kicker="Shipping"
        title="운송장 관리"
        description="운송장 파일과 사용자별 API 연동 정보를 함께 사용해 네이버·쿠팡 주문을 조회하고 발송 처리합니다."
        actions={
          <Link href="/settings" className={ui.buttonSecondary}>
            배송 연동 설정
          </Link>
        }
      />
      <ShippingView settingsSummary={settingsSummary} />
    </div>
  );
}

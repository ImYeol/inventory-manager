import Link from 'next/link';
import { getShippingSettingsSummary } from '@/lib/actions/shipping-settings';
import ShippingView from './ShippingView';
import { PageHeader, ui } from '../../components/ui';

export const dynamic = 'force-dynamic';

export default async function ShippingPage() {
  const settingsSummary = await getShippingSettingsSummary();

  return (
    <div className={ui.shell}>
      <PageHeader
        kicker="Shipping"
        title="운송장 관리"
        description="운송장 파일 업로드, 미리보기, 매칭, 발송 실행을 한 흐름으로 유지하고, 연동 준비는 스토어 연결에서 따로 관리합니다."
        actions={
          <Link href="/integrations" className={`${ui.buttonSecondary} whitespace-nowrap`}>
            스토어 연결로 이동
          </Link>
        }
      />
      <ShippingView settingsSummary={settingsSummary} />
    </div>
  );
}

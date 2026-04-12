import ShippingView from './ShippingView';
import { PageHeader, ui } from '../../components/ui';

export const dynamic = 'force-dynamic';

export default function ShippingPage() {
  return (
    <div className={ui.shell}>
      <PageHeader
        kicker="Shipping"
        title="운송장 관리"
        description="운송장 파일을 업로드하고 네이버·쿠팡 주문에 맞춰 발송합니다."
      />
      <ShippingView />
    </div>
  );
}

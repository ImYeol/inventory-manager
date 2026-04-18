import { ArrowRightLeft } from 'lucide-react'
import { getShippingSettingsSummary } from '@/lib/actions/shipping-settings';
import { ActionToolbar, ToolbarLinkAction } from '@/components/ui/toolbar'
import ShippingView from './ShippingView';
import { PageHeader, ui } from '../../components/ui';

export const dynamic = 'force-dynamic';

export default async function ShippingPage() {
  const settingsSummary = await getShippingSettingsSummary();

  return (
    <div className={ui.shell}>
      <PageHeader
        title="운송장 관리"
        description="업로드, 미리보기, 매칭, 발송을 한 흐름으로 유지합니다."
        actions={
          <ActionToolbar>
            <ToolbarLinkAction href="/integrations" icon={<ArrowRightLeft className="h-4 w-4" />}>
              스토어 연결로 이동
            </ToolbarLinkAction>
          </ActionToolbar>
        }
      />
      <ShippingView settingsSummary={settingsSummary} />
    </div>
  );
}

import { getAnalyticsData } from '@/lib/data';
import AnalyticsView from './AnalyticsView';
import { PageHeader, ui } from '../../components/ui';
import { enforceSetupComplete } from '@/lib/setup-guard';

export const dynamic = 'force-dynamic';

export default async function AnalyticsPage() {
  await enforceSetupComplete()
  const { models, inventorySummary } = await getAnalyticsData();

  return (
    <div className={ui.shell}>
      <PageHeader
        kicker="Insights"
        title="재고 분석"
        description="기간, 모델, 창고 단위로 재고 흐름과 비중을 정리합니다."
      />
      <AnalyticsView
        models={models}
        initialSummary={inventorySummary}
      />
    </div>
  );
}

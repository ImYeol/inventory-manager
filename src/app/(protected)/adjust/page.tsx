import { getCatalogData } from '@/lib/data';
import AdjustView from './AdjustView';
import { PageHeader, ui } from '../../components/ui';

export const dynamic = 'force-dynamic';

export default async function AdjustPage() {
  const models = await getCatalogData();

  return (
    <div className={ui.shell}>
      <PageHeader
        kicker="Adjustment"
        title="재고조정"
        description="창고별 재고를 바로 수정하고 차이를 빠르게 반영합니다."
      />
      <AdjustView models={models} />
    </div>
  );
}

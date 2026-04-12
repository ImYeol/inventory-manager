import { getCatalogData } from '@/lib/data';
import InventoryView from '../components/InventoryView';
import { PageHeader, ui } from '../components/ui';
import { enforceSetupComplete } from '@/lib/setup-guard';

export const dynamic = 'force-dynamic';

export default async function Home() {
  await enforceSetupComplete()
  const { models, warehouses } = await getCatalogData();
  const hasModels = models.length > 0

  return (
    <div className={ui.shell}>
      <PageHeader
        kicker="Overview"
        title="재고"
        description="모델별 재고를 한눈에 보고 필요한 항목만 빠르게 확인합니다."
      />
      {hasModels ? (
        <InventoryView models={models} warehouses={warehouses} />
      ) : (
        <div className="ui-empty px-6 py-16 text-center text-base">
          등록된 모델이 없습니다.
        </div>
      )}
    </div>
  );
}

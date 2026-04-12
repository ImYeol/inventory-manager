import { getCatalogData } from '@/lib/data';
import InventoryView from '../components/InventoryView';
import { PageHeader, ui } from '../components/ui';

export const dynamic = 'force-dynamic';

export default async function Home() {
  const models = await getCatalogData();

  return (
    <div className={ui.shell}>
      <PageHeader
        kicker="Overview"
        title="재고현황"
        description="모델별 재고를 한눈에 보고 필요한 항목만 빠르게 확인합니다."
      />
      {models.length === 0 ? (
        <div className="ui-empty px-6 py-16 text-center text-base">
          등록된 모델이 없습니다.
        </div>
      ) : (
        <InventoryView models={models} />
      )}
    </div>
  );
}

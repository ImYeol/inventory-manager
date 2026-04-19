import { getCatalogData } from '@/lib/data';
import { enforceSetupComplete } from '@/lib/setup-guard';
import Link from 'next/link';
import InOutForm from './InOutForm';
import { PageHeader, ui } from '../../components/ui';

export const dynamic = 'force-dynamic';

export default async function InOutPage() {
  await enforceSetupComplete()
  const { models, warehouses } = await getCatalogData();
  const normalizedModels = models.map((model) => ({
    id: model.id,
    name: model.name,
    sizes: model.sizes,
    colors: model.colors,
  }));

  return (
    <div className={ui.shellNarrow}>
      <PageHeader
        title="입출고 입력"
        description="선택한 모델, 색상, 사이즈 기준으로 거래를 빠르게 등록합니다."
        actions={
          <Link href="/inventory" className={ui.buttonGhost + ' whitespace-nowrap'}>
            재고현황으로 돌아가기
          </Link>
        }
      />
      <InOutForm models={normalizedModels} warehouses={warehouses} />
    </div>
  );
}

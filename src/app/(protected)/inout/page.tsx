import { getCatalogData } from '@/lib/data';
import InOutForm from './InOutForm';
import { PageHeader, ui } from '../../components/ui';

export const dynamic = 'force-dynamic';

export default async function InOutPage() {
  const models = (await getCatalogData()).map((model) => ({
    id: model.id,
    name: model.name,
    sizes: model.sizes,
    colors: model.colors,
  }));

  return (
    <div className={ui.shellNarrow}>
      <PageHeader
        kicker="Entry"
        title="입출고 입력"
        description="선택한 모델과 색상, 사이즈 기준으로 거래를 빠르게 등록합니다."
      />
      <InOutForm models={models} />
    </div>
  );
}

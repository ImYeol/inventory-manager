import { getTransactionsWithRelations } from '@/lib/data';
import HistoryView from './HistoryView';
import { PageHeader, ui } from '../../components/ui';

export const dynamic = 'force-dynamic';

export default async function HistoryPage() {
  const { transactions, models, warehouses } = await getTransactionsWithRelations();

  return (
    <div className={ui.shell}>
      <PageHeader
        kicker="Activity"
        title="이력조회"
        description="입고, 출고, 재고조정 기록을 기간과 창고, 모델 기준으로 빠르게 조회합니다."
      />
      <HistoryView
        transactions={transactions}
        models={models}
        warehouses={warehouses}
      />
    </div>
  );
}

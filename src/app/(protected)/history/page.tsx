import { getTransactionsWithRelations } from '@/lib/data';
import HistoryView from './HistoryView';
import { PageHeader, ui } from '../../components/ui';
import { enforceSetupComplete } from '@/lib/setup-guard';

export const dynamic = 'force-dynamic';

export default async function HistoryPage() {
  await enforceSetupComplete()
  const { transactions, models, warehouses } = await getTransactionsWithRelations();

  return (
    <div className={ui.shell}>
      <PageHeader
        kicker="Activity"
        title="입출고 이력"
        description="모든 입출고와 재고조정 기록을 필터링해서 확인합니다."
      />
      <HistoryView
        transactions={transactions}
        models={models}
        warehouses={warehouses}
      />
    </div>
  );
}

import { getTransactionsWithRelations } from '@/lib/data';
import HistoryView from './HistoryView';
import { PageHeader, ui } from '../../components/ui';

export const dynamic = 'force-dynamic';

export default async function HistoryPage() {
  const { transactions, models, warehouses } = await getTransactionsWithRelations();

  return (
    <div className={ui.shell}>
      <PageHeader
        title="이력 조회"
        description="재고 변동을 조회하고 필요한 항목은 되돌립니다."
      />
      <HistoryView
        transactions={transactions}
        models={models}
        warehouses={warehouses}
      />
    </div>
  );
}

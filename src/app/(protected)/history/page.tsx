import { getTransactionsWithRelations } from '@/lib/data';
import HistoryView from './HistoryView';
import { PageHeader, ui } from '../../components/ui';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';

export const dynamic = 'force-dynamic';

export default async function HistoryPage() {
  const { transactions, models, warehouses } = await getTransactionsWithRelations();

  return (
    <div className={ui.shell}>
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem><BreadcrumbLink href="/">대시보드</BreadcrumbLink></BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem><BreadcrumbPage>이력</BreadcrumbPage></BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>
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

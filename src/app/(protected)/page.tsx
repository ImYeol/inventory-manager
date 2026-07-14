import { getOperationsDashboard } from '@/lib/actions/dashboard'
import DashboardView from '../components/DashboardView'
import { PageHeader, ui } from '../components/ui'

export const dynamic = 'force-dynamic'

export default async function Home() {
  const data = await getOperationsDashboard()

  return (
    <div className={ui.shell}>
      <PageHeader
        title="대시보드"
        description="주문·출고·창고 재고·도착 예정 소싱을 한눈에 확인합니다."
      />
      <DashboardView {...data} />
    </div>
  )
}

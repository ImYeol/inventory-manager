import { getCatalogData, getSetupState } from '@/lib/data'
import SetupWizard from './SetupWizard'
import { PageHeader, ui } from '../../components/ui'
import { redirect } from 'next/navigation'

export const dynamic = 'force-dynamic'

export default async function SetupPage() {
  const [catalog, setupState] = await Promise.all([getCatalogData(), getSetupState()])

  if (!setupState.needsSetup) {
    redirect('/')
  }

  return (
    <div className={ui.shell}>
      <PageHeader
        kicker="Onboarding"
        title="초기 설정"
        description="최초 실행 전에 창고와 모델 기본정보를 먼저 등록해야 입출고를 입력할 수 있습니다."
      />
      <SetupWizard
        models={catalog.models}
        warehouses={catalog.warehouses}
        setupState={setupState}
      />
    </div>
  )
}


import { getCatalogData } from '@/lib/data'
import MasterDataManager from './MasterDataManager'
import { PageHeader, ui } from '../../components/ui'

export const dynamic = 'force-dynamic'

export default async function MasterDataPage() {
  const { models, warehouses } = await getCatalogData()

  return (
    <div className={ui.shell}>
      <PageHeader
        kicker="Master"
        title="기초정보"
        description="창고, 모델, 모델 상세(사이즈·색상)를 한곳에서 관리합니다."
      />
      <MasterDataManager models={models} warehouses={warehouses} />
    </div>
  )
}

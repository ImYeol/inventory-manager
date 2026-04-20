import { getFactoriesData } from '@/lib/data'
import FactoriesView from './FactoriesView'

export const dynamic = 'force-dynamic'

export default async function SourcingFactoriesPage() {
  const { factories, schemaState, factorySourcingItems } = await getFactoriesData()

  return <FactoriesView factories={factories} schemaState={schemaState} factorySourcingItems={factorySourcingItems} />
}

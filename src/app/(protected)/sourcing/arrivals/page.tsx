import { getCatalogData, getFactoriesData, getFactoryArrivalsData } from '@/lib/data'
import ArrivalsView from './ArrivalsView'

export const dynamic = 'force-dynamic'

export default async function SourcingArrivalsPage() {
  const [{ models, warehouses = [] }, factoriesData, arrivalsData] = await Promise.all([
    getCatalogData(),
    getFactoriesData(),
    getFactoryArrivalsData(),
  ])

  const { factories, schemaState } = factoriesData
  const { arrivals } = arrivalsData

  return (
    <ArrivalsView
      schemaState={schemaState}
      factories={factories.map((factory) => ({ id: factory.id, name: factory.name, isActive: factory.isActive }))}
      warehouses={warehouses.map((warehouse) => ({ id: warehouse.id, name: warehouse.name }))}
      models={models.map((model) => ({
        id: model.id,
        name: model.name,
        sizes: model.sizes.map((size) => ({ id: size.id, name: size.name })),
        colors: model.colors.map((color) => ({ id: color.id, name: color.name, rgbCode: color.rgbCode })),
      }))}
      arrivals={arrivals}
    />
  )
}

import { getCatalogData, getFactoriesData, getFactoryArrivalsData, getManualInboundDraftRows } from '@/lib/data'
import ArrivalsView from './ArrivalsView'
import ManualInboundDraftRows from './ManualInboundDraftRows'

export const dynamic = 'force-dynamic'

export default async function SourcingArrivalsPage() {
  const [{ models, warehouses = [] }, factoriesData, arrivalsData, manualInboundDraftRows] = await Promise.all([
    getCatalogData(),
    getFactoriesData(),
    getFactoryArrivalsData(),
    getManualInboundDraftRows(),
  ])

  const { factories, schemaState } = factoriesData
  const { arrivals } = arrivalsData

  return (
    <>
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
      <div className="mx-auto mt-6 w-full max-w-7xl px-4 pb-8 sm:px-6 lg:px-8">
        <ManualInboundDraftRows rows={manualInboundDraftRows} suppliers={factories.map((factory) => ({ id: factory.id, name: factory.name }))} warehouses={warehouses.map((warehouse) => ({ id: warehouse.id, name: warehouse.name }))} />
      </div>
    </>
  )
}

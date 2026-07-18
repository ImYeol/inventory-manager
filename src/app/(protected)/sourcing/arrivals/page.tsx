import { getActiveInboundTemplates, getCatalogData, getFactoriesData, getFactoryArrivalsData, getProductWorkspaceData } from '@/lib/data'
import ArrivalsView from './ArrivalsView'

export const dynamic = 'force-dynamic'

export default async function SourcingArrivalsPage() {
  const [{ models, warehouses = [] }, factoriesData, arrivalsData, inboundTemplates, workspace] = await Promise.all([
    getCatalogData(),
    getFactoriesData(),
    getFactoryArrivalsData(),
    getActiveInboundTemplates(),
    getProductWorkspaceData(),
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
        inboundTemplates={inboundTemplates}
        productVariants={workspace.variants.map((variant) => ({ id: variant.id, label: `${variant.sellerSku} · ${variant.modelName} / ${variant.colorName} / ${variant.sizeName}` }))}
    />
  )
}

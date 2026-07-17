export type InboundDraftRowInput = {
  supplierId: number
  template: string
  externalSku: string
  quantity: number | null
  warehouseId: number
  productVariantId: number | null
}

/** Exact supplier links deliberately preserve the raw template and SKU identity. */
export function inboundSupplierSkuKey(input: Pick<InboundDraftRowInput, 'supplierId' | 'template' | 'externalSku'>) {
  return `${input.supplierId}:${input.template.trim()}:${input.externalSku.trim()}`
}

export function inboundTemplateSkuKey(input: { supplierId: number; templateId: number; externalSku: string }) {
  return `${input.supplierId}:${input.templateId}:${input.externalSku.trim()}`
}

/** Invalid preview rows are draftable evidence; receipt validation happens later. */
export function validateInboundPreviewRows(rows: Array<{ externalSku: string; quantity: number | null; validationError: string | null; productVariantId: number | null }>) {
  void rows
  return [] as string[]
}

export function validateInboundDraftRows(rows: InboundDraftRowInput[]) {
  return rows.flatMap((row, index) => {
    const prefix = `${index + 1}행:`
    const quantity = row.quantity
    if (!row.supplierId) return [`${prefix} 공급자를 선택해주세요.`]
    if (!row.template.trim()) return [`${prefix} 템플릿을 입력해주세요.`]
    if (!row.externalSku.trim()) return [`${prefix} 외부 SKU를 입력해주세요.`]
    if (!Number.isInteger(quantity) || quantity === null || quantity <= 0) return [`${prefix} 수량은 양수여야 합니다.`]
    if (!row.warehouseId) return [`${prefix} 창고를 선택해주세요.`]
    if (!row.productVariantId) return [`${prefix} 내부 SKU를 검수·지정해주세요.`]
    return []
  })
}

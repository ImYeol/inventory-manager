export const BUILT_IN_INBOUND_PRESETS = [
  { name: '중국 공장 입고', externalSkuAliases: ['외부 SKU', 'SKU', '상품코드', '货号'], quantityAliases: ['입고수량', '수량', '数量', '采购数量'] },
  { name: '1688 주문', externalSkuAliases: ['货号', '商品编码', '商家编码'], quantityAliases: ['数量', '采购数量', '商品数量'] },
] as const

export type InboundPreset = (typeof BUILT_IN_INBOUND_PRESETS)[number]
export type ParsedInboundRow = { sourceRowNumber: number; externalSku: string; quantity: number | null; validationError: string | null; productVariantId: number | null; sourceValues: Record<string, string> }

const sourceAliases: Record<string, string[]> = {
  product: ['상품명', '商品名称', '产品名称', '品名'], option: ['옵션', '规格', '颜色尺码'], orderNumber: ['주문번호', '订单号', '订单编号'], unitCost: ['단가', '单价', '采购单价'], currency: ['통화', '币种', '货币'], note: ['메모', '备注', '备注信息'],
}
const key = (value: unknown) => String(value ?? '').normalize('NFC').replace(/\s+/g, '').trim()
const text = (value: unknown) => String(value ?? '').trim()

function columnIndex(headers: unknown[], aliases: readonly string[]) {
  const normalized = headers.map(key)
  return aliases.map(key).map((alias) => normalized.indexOf(alias)).find((index) => index >= 0) ?? -1
}

export function parseInboundWorksheet(preset: InboundPreset, sheetRows: unknown[][]) {
  const headerIndex = sheetRows.findIndex((row) => columnIndex(row, preset.externalSkuAliases) >= 0 && columnIndex(row, preset.quantityAliases) >= 0)
  if (headerIndex < 0) throw new Error('선택한 프리셋의 외부 SKU와 수량 헤더를 찾을 수 없습니다.')
  const headers = sheetRows[headerIndex]
  const skuColumn = columnIndex(headers, preset.externalSkuAliases)
  const quantityColumn = columnIndex(headers, preset.quantityAliases)
  const optionalColumns = Object.fromEntries(Object.entries(sourceAliases).map(([field, aliases]) => [field, columnIndex(headers, aliases)]))
  const rows: ParsedInboundRow[] = sheetRows.slice(headerIndex + 1).map((cells, index) => {
    const externalSku = text(cells[skuColumn])
    const rawQuantity = text(cells[quantityColumn])
    const number = rawQuantity === '' ? null : Number(rawQuantity.replace(/,/g, ''))
    const sourceValues = Object.fromEntries(Object.entries(optionalColumns).flatMap(([field, column]) => column >= 0 && text(cells[column]) ? [[field, text(cells[column])]] : []))
    const validationError = !externalSku ? '외부 SKU를 입력해주세요.' : !Number.isInteger(number) || number === null || number <= 0 ? '수량은 양의 정수여야 합니다.' : null
    return { sourceRowNumber: headerIndex + index + 2, externalSku, quantity: validationError ? null : number, validationError, productVariantId: null, sourceValues }
  }).filter((row) => row.externalSku || row.quantity !== null || Object.keys(row.sourceValues).length > 0)
  return { headerRowNumber: headerIndex + 1, headers: headers.map(text), rows }
}

export function suggestExactInboundLinks<T extends { externalSku: string; productVariantId: number | null }>(rows: T[], links: Map<string, number>, supplierId: number, template: string) {
  return rows.map((row) => ({ ...row, productVariantId: links.get(`${supplierId}:${template}:${row.externalSku.trim()}`) ?? null }))
}

import { describe, expect, it } from 'vitest'
import {
  BUILT_IN_INBOUND_PRESETS,
  parseInboundTemplateWorksheet,
  parseInboundWorksheet,
  suggestExactInboundLinks,
  type InboundTemplateVersion,
} from '@/lib/inbound-import'

describe('built-in inbound template imports', () => {
  it('parses both fixed presets with their source header and true Excel row number', () => {
    const factory = parseInboundWorksheet(BUILT_IN_INBOUND_PRESETS[0], [
      ['외부 SKU', '입고수량', '상품명', '옵션'], ['FAC-1', 3, '외부 상품', '빨강'],
    ])
    const order = parseInboundWorksheet(BUILT_IN_INBOUND_PRESETS[1], [
      ['货号', '数量', '订单号', '单价', '币种'], ['1688-1', 2, 'O-7', 11.5, 'CNY'],
    ])
    expect(factory).toMatchObject({ headerRowNumber: 1, rows: [{ sourceRowNumber: 2, externalSku: 'FAC-1', rawQuantity: '3', quantity: 3, sourceValues: { product: '외부 상품', option: '빨강' } }] })
    expect(order).toMatchObject({ headerRowNumber: 1, rows: [{ sourceRowNumber: 2, externalSku: '1688-1', quantity: 2, sourceValues: { orderNumber: 'O-7', unitCost: '11.5', currency: 'CNY' } }] })
  })

  it('keeps invalid source rows in the draft and never derives an internal SKU from product text', () => {
    const parsed = parseInboundWorksheet(BUILT_IN_INBOUND_PRESETS[0], [
      ['SKU', '수량', '상품명'], ['', 2, '외부 상품'], ['X-1', 1.5, '다른 상품'],
    ])
    expect(parsed.rows.map((row) => row.validationError)).toEqual(['외부 SKU를 입력해주세요.', '수량은 양의 정수여야 합니다.'])
    expect(parsed.rows.every((row) => row.productVariantId === null)).toBe(true)
  })

  it('attaches a suggestion only for the exact supplier, preset, and external SKU link', () => {
    const rows = [{ externalSku: 'X-1', productVariantId: null }, { externalSku: 'X-2', productVariantId: null }]
    expect(suggestExactInboundLinks(rows, new Map([['4:중국 공장 입고:X-1', 9]]), 4, '중국 공장 입고')).toEqual([
      { externalSku: 'X-1', productVariantId: 9 }, { externalSku: 'X-2', productVariantId: null },
    ])
  })

  it('parses only the selected version sheet, header row, and required columns', () => {
    const version: InboundTemplateVersion = {
      templateId: 1, versionNumber: 1,
      sheetName: '입고', headerRowNumber: 2, headers: ['외부 SKU', '수량', '메모'],
      mappings: { externalSku: '외부 SKU', quantity: '수량', source: { note: '메모' } },
    }
    expect(parseInboundTemplateWorksheet(version, '입고', [
      ['제목'], ['외부 SKU', '수량', '메모'], ['EXT-1', '3', '검수 전'],
    ])).toMatchObject({ rows: [{ sourceRowNumber: 3, externalSku: 'EXT-1', quantity: 3, sourceValues: { note: '검수 전' } }] })
    expect(() => parseInboundTemplateWorksheet(version, '다른 시트', [])).toThrow('선택한 템플릿의 시트가 일치하지 않습니다.')
    expect(() => parseInboundTemplateWorksheet({ ...version, mappings: { ...version.mappings, quantity: '입고수량' } }, '입고', [
      ['제목'], ['외부 SKU', '수량', '메모'], ['EXT-1', 3, 'x'],
    ])).toThrow('선택한 템플릿의 필수 열이 일치하지 않습니다.')
  })

  it('keeps malformed template rows previewable while marking them non-receivable', () => {
    const version: InboundTemplateVersion = {
      templateId: 1, versionNumber: 1,
      sheetName: '입고', headerRowNumber: 1, headers: ['외부 SKU', '수량'],
      mappings: { externalSku: '외부 SKU', quantity: '수량', source: {} },
    }
    const preview = parseInboundTemplateWorksheet(version, '입고', [['외부 SKU', '수량'], ['', 2], ['EXT-2', '1.5']])
    expect(preview.rows.map((row) => row.validationError)).toEqual(['외부 SKU를 입력해주세요.', '수량은 양의 정수여야 합니다.'])
  })

  it('preserves literal quantity cells for immutable source evidence', () => {
    const version: InboundTemplateVersion = { templateId: 1, versionNumber: 1, sheetName: '입고', headerRowNumber: 1, headers: ['외부 SKU', '수량'], mappings: { externalSku: '외부 SKU', quantity: '수량', source: {} } }
    expect(parseInboundTemplateWorksheet(version, '입고', [['외부 SKU', '수량'], ['A', '001'], ['B', '1,000'], ['C', '1.5']]).rows.map((row) => row.rawQuantity)).toEqual(['001', '1,000', '1.5'])
  })
})

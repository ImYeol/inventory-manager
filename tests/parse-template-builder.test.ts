// @vitest-environment jsdom
import React from 'react'
import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import {
  ParseTemplateBuilder,
  buildPreviewRows,
  extractDataRows,
  extractHeaders,
  headerFingerprint,
  matchPresetByHeaders,
  rowsAsRecords,
  sampleSheetNames,
  type ParseTemplateMapping,
  type ParseTemplatePreset,
  type ParseTemplateRole,
  type ParseTemplateSample,
} from '@/components/ui/parse-template-builder'

type InboundRole = 'externalSku' | 'quantity'
const inboundRoles: ParseTemplateRole<InboundRole>[] = [
  { key: 'externalSku', label: '외부 SKU', required: true },
  { key: 'quantity', label: '수량', required: true },
]

const sample: ParseTemplateSample = {
  sheets: [
    { name: '입고', rows: [['외부 SKU', '수량', '비고'], ['EXT-1', '3', 'A'], ['EXT-2', '5', 'B']] },
    { name: '메모', rows: [['메모만']] },
  ],
}

describe('parse-template-builder pure helpers', () => {
  it('is parameterized by an arbitrary role schema and lists sheets from the sample', () => {
    expect(sampleSheetNames(sample)).toEqual(['입고', '메모'])
    expect(inboundRoles.map((role) => role.key)).toEqual(['externalSku', 'quantity'])
  })

  it('derives headers and data rows from sheet + header-row selection', () => {
    expect(extractHeaders(sample, '입고', 1)).toEqual(['외부 SKU', '수량', '비고'])
    expect(extractDataRows(sample, '입고', 1)).toEqual([['EXT-1', '3', 'A'], ['EXT-2', '5', 'B']])
  })

  it('produces a column-role mapping output driven preview', () => {
    const headers = extractHeaders(sample, '입고', 1)
    const dataRows = extractDataRows(sample, '입고', 1)
    const mapping: ParseTemplateMapping<InboundRole> = { externalSku: '외부 SKU', quantity: '수량' }
    expect(buildPreviewRows(headers, dataRows, mapping, inboundRoles)).toEqual([
      { externalSku: 'EXT-1', quantity: '3' },
      { externalSku: 'EXT-2', quantity: '5' },
    ])
  })

  it('zips headers and raw rows into header-keyed records for header-based normalization', () => {
    const headers = extractHeaders(sample, '입고', 1)
    const dataRows = extractDataRows(sample, '입고', 1)
    expect(rowsAsRecords(headers, dataRows)).toEqual([
      { '외부 SKU': 'EXT-1', '수량': '3', '비고': 'A' },
      { '외부 SKU': 'EXT-2', '수량': '5', '비고': 'B' },
    ])
  })

  it('fingerprints headers independent of order/whitespace so presets match by column set', () => {
    expect(headerFingerprint([' 운송장번호 ', '받는분', '주소'])).toBe(headerFingerprint(['주소', '받는분', '운송장번호']))
    expect(headerFingerprint(['A', 'B'])).not.toBe(headerFingerprint(['A', 'C']))
  })

  it('matches a preset only when every one of its mapped columns is present in the headers', () => {
    const presets: ParseTemplatePreset<InboundRole>[] = [
      { id: 'p1', label: '기본', mapping: { externalSku: '외부 SKU', quantity: '수량' } },
      { id: 'p2', label: '다른 헤더', mapping: { externalSku: 'SKU', quantity: 'QTY' } },
    ]
    expect(matchPresetByHeaders(['외부 SKU', '수량', '비고'], presets)?.id).toBe('p1')
    expect(matchPresetByHeaders(['SKU', 'QTY'], presets)?.id).toBe('p2')
    expect(matchPresetByHeaders(['전혀 다른 헤더'], presets)).toBeNull()
  })
})

function Harness({ onMapping, onPreset, presets }: {
  onMapping: (mapping: ParseTemplateMapping<InboundRole>) => void
  onPreset?: (id: string) => void
  presets?: ParseTemplatePreset<InboundRole>[]
}) {
  const [sheetName, setSheetName] = React.useState('입고')
  const [headerRowNumber, setHeaderRowNumber] = React.useState(1)
  const [mapping, setMapping] = React.useState<ParseTemplateMapping<InboundRole>>({ externalSku: '', quantity: '' })
  const [presetId, setPresetId] = React.useState<string | null>(null)
  return React.createElement(ParseTemplateBuilder<InboundRole>, {
    roles: inboundRoles,
    sample,
    sheetName,
    headerRowNumber,
    mapping,
    onSheetChange: setSheetName,
    onHeaderRowChange: setHeaderRowNumber,
    onMappingChange: (next) => { setMapping(next); onMapping(next) },
    presets,
    selectedPresetId: presetId,
    onPresetSelect: (id) => { setPresetId(id); onPreset?.(id) },
  })
}

describe('ParseTemplateBuilder component', () => {
  it('renders a mapping control per role and a preview column per role', () => {
    render(React.createElement(Harness, { onMapping: vi.fn() }))
    expect(screen.getByRole('combobox', { name: '외부 SKU 열' })).toBeTruthy()
    expect(screen.getByRole('combobox', { name: '수량 열' })).toBeTruthy()
    expect(screen.getByRole('columnheader', { name: '외부 SKU' })).toBeTruthy()
    expect(screen.getByRole('columnheader', { name: '수량' })).toBeTruthy()
  })

  it('emits a column-role mapping when a header is chosen for a role, and the preview reflects it', async () => {
    const onMapping = vi.fn()
    render(React.createElement(Harness, { onMapping }))
    fireEvent.click(screen.getByRole('combobox', { name: '외부 SKU 열' }))
    fireEvent.click(await screen.findByRole('option', { name: '외부 SKU' }))
    await waitFor(() => expect(onMapping).toHaveBeenCalledWith(expect.objectContaining({ externalSku: '외부 SKU' })))
    fireEvent.click(screen.getByRole('combobox', { name: '수량 열' }))
    fireEvent.click(await screen.findByRole('option', { name: '수량' }))
    await waitFor(() => expect(onMapping).toHaveBeenCalledWith({ externalSku: '외부 SKU', quantity: '수량' }))
    expect(await screen.findByText('EXT-1')).toBeTruthy()
    expect(screen.getByText('EXT-2')).toBeTruthy()
  })

  it('auto-matches a saved preset by header fingerprint when the sample loads and mapping is still empty', async () => {
    const onMapping = vi.fn()
    const onPreset = vi.fn()
    const presets: ParseTemplatePreset<InboundRole>[] = [
      { id: 'built-in', label: '기본 프리셋', mapping: { externalSku: '외부 SKU', quantity: '수량' }, immutable: true },
    ]
    render(React.createElement(Harness, { onMapping, onPreset, presets }))
    await waitFor(() => expect(onMapping).toHaveBeenCalledWith({ externalSku: '외부 SKU', quantity: '수량' }))
    expect(onPreset).toHaveBeenCalledWith('built-in')
  })

  it('does not overwrite an existing manual mapping with an auto-matched preset', async () => {
    const onMapping = vi.fn()
    const presets: ParseTemplatePreset<InboundRole>[] = [
      { id: 'built-in', label: '기본 프리셋', mapping: { externalSku: '외부 SKU', quantity: '수량' } },
    ]
    render(React.createElement(ParseTemplateBuilder<InboundRole>, {
      roles: inboundRoles,
      sample,
      sheetName: '입고',
      headerRowNumber: 1,
      mapping: { externalSku: '비고', quantity: '' },
      onSheetChange: vi.fn(),
      onHeaderRowChange: vi.fn(),
      onMappingChange: onMapping,
      presets,
    }))
    await new Promise((resolve) => setTimeout(resolve, 0))
    expect(onMapping).not.toHaveBeenCalled()
  })
})

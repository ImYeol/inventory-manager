import { describe, expect, it } from 'vitest'
import * as XLSX from 'xlsx'
import { detectCsvFieldSeparator, readUploadedWorkbook } from '@/lib/parse-template-file'

describe('detectCsvFieldSeparator', () => {
  it('detects a comma-delimited first line', () => {
    expect(detectCsvFieldSeparator('외부 SKU,수량\nEXT-1,3\n')).toBe(',')
  })

  it('detects a tab-delimited first line, as produced by a .txt export renamed to .csv', () => {
    expect(detectCsvFieldSeparator('외부 SKU\t수량\nEXT-1\t3\n')).toBe('\t')
  })

  it('falls back to comma when neither separator is present', () => {
    expect(detectCsvFieldSeparator('single-column-value\nanother-value\n')).toBe(',')
  })

  it('only inspects the first non-empty line', () => {
    expect(detectCsvFieldSeparator('외부 SKU,수량\nEXT-1\t3\tignored\n')).toBe(',')
  })
})

function sheetRows(workbook: XLSX.WorkBook) {
  return XLSX.utils.sheet_to_json<unknown[]>(workbook.Sheets[workbook.SheetNames[0]], { header: 1, defval: '' })
}

describe('readUploadedWorkbook (real bug: a tab-delimited .txt export renamed to .csv)', () => {
  it('parses a tab-delimited CSV into the correct columns instead of one garbled column', () => {
    const bytes = Buffer.from('외부 SKU\t수량\nEXT-1\t3\nEXT-2\t5\n', 'utf8')
    expect(sheetRows(readUploadedWorkbook(XLSX, bytes))).toEqual([['외부 SKU', '수량'], ['EXT-1', 3], ['EXT-2', 5]])
  })

  it('parses a comma-delimited CSV correctly (no regression)', () => {
    const bytes = Buffer.from('외부 SKU,수량\nEXT-1,3\nEXT-2,5\n', 'utf8')
    expect(sheetRows(readUploadedWorkbook(XLSX, bytes))).toEqual([['외부 SKU', '수량'], ['EXT-1', 3], ['EXT-2', 5]])
  })

  it('decodes Korean headers correctly without a BOM', () => {
    const bytes = Buffer.from('외부 SKU,수량\nEXT-1,3\n', 'utf8')
    expect(sheetRows(readUploadedWorkbook(XLSX, bytes))[0]).toEqual(['외부 SKU', '수량'])
  })

  it('decodes Korean headers correctly with a UTF-8 BOM (Excel "CSV UTF-8" export)', () => {
    const bytes = Buffer.concat([Buffer.from([0xef, 0xbb, 0xbf]), Buffer.from('외부 SKU,수량\nEXT-1,3\n', 'utf8')])
    expect(sheetRows(readUploadedWorkbook(XLSX, bytes))[0]).toEqual(['외부 SKU', '수량'])
  })

  it('still parses a real .xlsx binary workbook unchanged', () => {
    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet([['외부 SKU', '수량'], ['EXT-1', 3]]), 'Sheet1')
    const bytes = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' })
    expect(sheetRows(readUploadedWorkbook(XLSX, bytes))).toEqual([['외부 SKU', '수량'], ['EXT-1', 3]])
  })
})

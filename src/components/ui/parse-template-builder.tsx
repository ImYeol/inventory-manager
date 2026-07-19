'use client'

import { useEffect, useRef } from 'react'
import type * as XLSXType from 'xlsx'
import { BasicDataTable } from './basic-data-table'
import { Input } from './input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './select'
import { ui } from '@/app/components/ui'

/**
 * Shared 파싱 템플릿 primitive: file -> sheet/header-row selection -> column-to-role
 * mapping -> preview. Parameterized by a role schema so inbound (외부 SKU/수량) and
 * order tracking (운송장번호/주문번호/수취인 ...) consume one implementation instead of
 * each hand-rolling the same file-to-mapping flow (docs/adr/0034-parse-template-shared-primitive.md).
 *
 * Persistence stays domain-specific (versioned inbound templates vs TrackingImportTemplate
 * columnMapping JSON) — this component only owns the in-memory sheet/header/mapping/preview
 * state and the presentational chrome around it.
 */

export type ParseTemplateRole<RoleKey extends string = string> = {
  key: RoleKey
  label: string
  required?: boolean
}

export type ParseTemplateMapping<RoleKey extends string = string> = Record<RoleKey, string>

export type ParseTemplatePreset<RoleKey extends string = string> = {
  id: string
  label: string
  mapping: ParseTemplateMapping<RoleKey>
  immutable?: boolean
}

export type ParseTemplateSample = { sheets: Array<{ name: string; rows: string[][] }> }

const EMPTY_VALUE = '__parse_template_empty__'
const DEFAULT_PREVIEW_ROW_COUNT = 5

function normalizeHeader(header: string) {
  return header.normalize('NFC').replace(/﻿/g, '').replace(/\s+/g, '').trim()
}

/** Canonical header-fingerprint used to auto-match a saved/built-in preset by column set. */
export function headerFingerprint(headers: string[]): string {
  return headers.map(normalizeHeader).filter(Boolean).sort().join('|')
}

export function sampleSheetNames(sample: ParseTemplateSample): string[] {
  return sample.sheets.map((sheet) => sheet.name)
}

function sheetRows(sample: ParseTemplateSample, sheetName: string): string[][] {
  return sample.sheets.find((sheet) => sheet.name === sheetName)?.rows ?? []
}

export function extractHeaders(sample: ParseTemplateSample, sheetName: string, headerRowNumber: number): string[] {
  return sheetRows(sample, sheetName)[headerRowNumber - 1] ?? []
}

export function extractDataRows(sample: ParseTemplateSample, sheetName: string, headerRowNumber: number): string[][] {
  return sheetRows(sample, sheetName)
    .slice(headerRowNumber)
    .filter((row) => row.some((cell) => cell.trim() !== ''))
}

/** Zips headers + raw data rows into header-keyed records, for consumers that normalize by header name. */
export function rowsAsRecords(headers: string[], dataRows: string[][]): Record<string, string>[] {
  return dataRows.map((row) => Object.fromEntries(headers.map((header, index) => [header, row[index] ?? ''])))
}

/** A preset matches when every one of its mapped columns is present in the current headers. */
export function matchPresetByHeaders<RoleKey extends string>(headers: string[], presets: ParseTemplatePreset<RoleKey>[]): ParseTemplatePreset<RoleKey> | null {
  if (!headers.length) return null
  return presets.find((preset) => {
    const mappedColumns = Object.values<string>(preset.mapping).filter(Boolean)
    if (!mappedColumns.length) return false
    const presentColumns = headers.filter((header) => mappedColumns.includes(header))
    return headerFingerprint(mappedColumns) === headerFingerprint(presentColumns)
  }) ?? null
}

export function buildPreviewRows<RoleKey extends string>(
  headers: string[],
  dataRows: string[][],
  mapping: ParseTemplateMapping<RoleKey>,
  roles: ParseTemplateRole<RoleKey>[],
  limit = DEFAULT_PREVIEW_ROW_COUNT,
): Array<Record<RoleKey, string>> {
  return dataRows.slice(0, limit).map((row) => {
    const record = {} as Record<RoleKey, string>
    for (const role of roles) {
      const columnIndex = headers.indexOf(mapping[role.key])
      record[role.key] = columnIndex >= 0 ? String(row[columnIndex] ?? '') : ''
    }
    return record
  })
}

/** Client-side adapter: reads every sheet's raw grid so the builder can switch sheets without re-reading the file. */
export async function workbookToSample(file: File, maxRowsPerSheet = 200): Promise<ParseTemplateSample> {
  const XLSX: typeof XLSXType = await import('xlsx')
  const workbook = XLSX.read(await file.arrayBuffer(), { type: 'array' })
  return {
    sheets: workbook.SheetNames.map((name) => ({
      name,
      rows: XLSX.utils.sheet_to_json<unknown[]>(workbook.Sheets[name], { header: 1, defval: '' })
        .slice(0, maxRowsPerSheet)
        .map((row) => row.map((cell) => String(cell))),
    })),
  }
}

export type ParseTemplateBuilderProps<RoleKey extends string> = {
  roles: ParseTemplateRole<RoleKey>[]
  sample: ParseTemplateSample | null
  sheetName: string
  headerRowNumber: number
  mapping: ParseTemplateMapping<RoleKey>
  onSheetChange: (sheetName: string) => void
  onHeaderRowChange: (headerRowNumber: number) => void
  onMappingChange: (mapping: ParseTemplateMapping<RoleKey>) => void
  presets?: ParseTemplatePreset<RoleKey>[]
  selectedPresetId?: string | null
  onPresetSelect?: (presetId: string) => void
  /** Auto-selects a matching preset when headers change and the current mapping is still empty. Defaults to true. */
  autoMatch?: boolean
  previewRowCount?: number
  sheetLabel?: string
  headerRowLabel?: string
  presetLabel?: string
  previewLabel?: string
  emptyPreviewState?: string
}

export function ParseTemplateBuilder<RoleKey extends string>({
  roles,
  sample,
  sheetName,
  headerRowNumber,
  mapping,
  onSheetChange,
  onHeaderRowChange,
  onMappingChange,
  presets = [],
  selectedPresetId = null,
  onPresetSelect,
  autoMatch = true,
  previewRowCount = DEFAULT_PREVIEW_ROW_COUNT,
  sheetLabel = '시트',
  headerRowLabel = '헤더 행',
  presetLabel = '파싱 템플릿 프리셋',
  previewLabel = '미리보기',
  emptyPreviewState = '파일을 올리면 실제 데이터 미리보기가 표시됩니다.',
}: ParseTemplateBuilderProps<RoleKey>) {
  const sheetNames = sample ? sampleSheetNames(sample) : []
  const headers = sample ? extractHeaders(sample, sheetName, headerRowNumber) : []
  const dataRows = sample ? extractDataRows(sample, sheetName, headerRowNumber) : []
  const previewRows = buildPreviewRows(headers, dataRows, mapping, roles, previewRowCount)
  const fingerprint = headers.length ? headerFingerprint(headers) : ''
  const headersKey = headers.join('|')
  const lastAutoMatchedKey = useRef<string | null>(null)

  useEffect(() => {
    if (!autoMatch || !presets.length || !headers.length) return
    if (lastAutoMatchedKey.current === headersKey) return
    const isMappingEmpty = roles.every((role) => !mapping[role.key])
    if (!isMappingEmpty) return
    lastAutoMatchedKey.current = headersKey
    const matched = matchPresetByHeaders(headers, presets)
    if (matched) {
      onMappingChange({ ...matched.mapping })
      onPresetSelect?.(matched.id)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [headersKey, autoMatch, presets.length])

  return (
    <div className="space-y-[var(--space-4)]">
      {sheetNames.length ? (
        <div className="grid gap-[var(--space-3)] sm:grid-cols-2">
          <label className="space-y-1">
            <span className={ui.label}>{sheetLabel}</span>
            <Select value={sheetName} onValueChange={onSheetChange}>
              <SelectTrigger aria-label={sheetLabel}><SelectValue /></SelectTrigger>
              <SelectContent>{sheetNames.map((name) => <SelectItem key={name} value={name}>{name}</SelectItem>)}</SelectContent>
            </Select>
          </label>
          <label className="space-y-1">
            <span className={ui.label}>{headerRowLabel}</span>
            <Input
              aria-label={headerRowLabel}
              type="number"
              min={1}
              max={sheetRows(sample as ParseTemplateSample, sheetName).length || 1}
              value={headerRowNumber}
              onChange={(event) => onHeaderRowChange(Number(event.target.value) || 1)}
            />
          </label>
        </div>
      ) : null}

      {presets.length ? (
        <label className="space-y-1">
          <span className={ui.label}>{presetLabel}</span>
          <div className="flex flex-wrap items-center gap-2">
            <Select
              value={selectedPresetId ?? EMPTY_VALUE}
              onValueChange={(value) => { if (value !== EMPTY_VALUE) onPresetSelect?.(value) }}
            >
              <SelectTrigger aria-label={presetLabel}><SelectValue placeholder="프리셋 선택" /></SelectTrigger>
              <SelectContent>
                <SelectItem value={EMPTY_VALUE}>프리셋 선택</SelectItem>
                {presets.map((preset) => <SelectItem key={preset.id} value={preset.id}>{preset.label}</SelectItem>)}
              </SelectContent>
            </Select>
            {fingerprint ? <span className="text-xs text-[color:var(--muted-foreground)]">헤더 지문 {fingerprint}</span> : null}
          </div>
        </label>
      ) : null}

      <div className="grid gap-[var(--space-3)] sm:grid-cols-2 lg:grid-cols-3">
        {roles.map((role) => (
          <label key={role.key} className="space-y-1">
            <span className={ui.label}>{role.label}{role.required ? ' *' : ''}</span>
            <Select
              value={mapping[role.key] || EMPTY_VALUE}
              onValueChange={(value) => onMappingChange({ ...mapping, [role.key]: value === EMPTY_VALUE ? '' : value })}
            >
              <SelectTrigger aria-label={`${role.label} 열`}><SelectValue placeholder="열 선택" /></SelectTrigger>
              <SelectContent>
                <SelectItem value={EMPTY_VALUE}>열 선택</SelectItem>
                {headers.map((header) => <SelectItem key={header} value={header}>{header}</SelectItem>)}
              </SelectContent>
            </Select>
          </label>
        ))}
      </div>

      <div className="space-y-1">
        <p className={ui.label}>{previewLabel}</p>
        <BasicDataTable
          columns={roles.map((role) => ({ key: role.key, label: role.label }))}
          rows={previewRows.map((row, index) => ({ index, row }))}
          rowKey={(item) => item.index}
          renderCell={(item, key) => item.row[key as RoleKey]}
          emptyState={emptyPreviewState}
        />
      </div>
    </div>
  )
}

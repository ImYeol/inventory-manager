'use client'

import { useMemo, useState } from 'react'
import * as XLSX from 'xlsx'
import { BasicDataTable } from '@/components/ui/basic-data-table'
import { TableSurface } from '@/components/ui/table-surface'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { BUILT_IN_TRACKING_PRESETS, type TrackingColumnMapping, type TrackingRow, headerFingerprint, normalizeTrackingRows } from '@/lib/excel'

const fields = [
  ['orderNumber', '주문번호'], ['trackingNumber', '운송장번호'], ['carrier', '택배사'], ['recipientName', '수취인'], ['address', '주소'], ['shippedAt', '발송일'],
] as const
const emptyMapping: TrackingColumnMapping = { orderNumber: '', trackingNumber: '', carrier: '', recipientName: '', address: '', shippedAt: '' }

export default function TrackingImportWorkspace() {
  const [headers, setHeaders] = useState<string[]>([])
  const [sourceRows, setSourceRows] = useState<Record<string, unknown>[]>([])
  const [mapping, setMapping] = useState<TrackingColumnMapping>(emptyMapping)
  const [preset, setPreset] = useState('')
  const rows = useMemo(() => normalizeTrackingRows(sourceRows, mapping), [sourceRows, mapping])
  const fingerprint = headers.length ? headerFingerprint(headers) : ''

  async function onFile(file?: File) {
    if (!file) return
    const workbook = XLSX.read(await file.arrayBuffer(), { type: 'array' })
    const sheet = workbook.Sheets[workbook.SheetNames[0]]
    const values = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: '' })
    const nextHeaders = Object.keys(values[0] ?? {})
    setHeaders(nextHeaders); setSourceRows(values)
    const inferred = BUILT_IN_TRACKING_PRESETS.find((item) => Object.values(item.mapping).some((header) => nextHeaders.includes(header)))
    if (inferred) { setPreset(inferred.name); setMapping(inferred.mapping) }
  }

  function choosePreset(value: string) {
    setPreset(value)
    const selected = BUILT_IN_TRACKING_PRESETS.find((item) => item.name === value)
    if (selected) setMapping({ ...selected.mapping })
  }

  return <div className="space-y-4">
    <TableSurface toolbar={<div className="flex items-center gap-2"><span className="text-sm text-[color:var(--muted-foreground)]">파일 → 시트/헤더 → 컬럼 매핑 → 미리보기 → 발송</span><label className="ui-button-secondary cursor-pointer">파일 선택<input aria-label="송장 파일" type="file" accept=".xlsx,.xls,.csv" className="sr-only" onChange={(event) => onFile(event.target.files?.[0])} /></label></div>}>
      <div className="p-4 text-sm text-[color:var(--muted-foreground)]">원본 파일은 저장하지 않고, 매핑된 행과 검증 결과만 반영합니다.</div>
    </TableSurface>
    {headers.length ? <TableSurface toolbar={<div className="flex items-center gap-2"><span className="text-sm font-medium">컬럼 매핑</span><Select value={preset} onValueChange={choosePreset}><SelectTrigger aria-label="매핑 프리셋"><SelectValue placeholder="프리셋 선택" /></SelectTrigger><SelectContent>{BUILT_IN_TRACKING_PRESETS.map((item) => <SelectItem key={item.name} value={item.name}>{item.name}</SelectItem>)}</SelectContent></Select><span className="text-xs text-[color:var(--muted-foreground)]">헤더 {fingerprint}</span></div>}>
      <div className="grid grid-cols-2 gap-2 p-4 md:grid-cols-3">{fields.map(([field, label]) => <label key={field} className="text-sm"><span className="mb-1 block">{label}{field === 'trackingNumber' ? ' *' : ''}</span><Select value={mapping[field] || '__empty'} onValueChange={(value) => setMapping({ ...mapping, [field]: value === '__empty' ? '' : value })}><SelectTrigger aria-label={`${label} 열`}><SelectValue /></SelectTrigger><SelectContent><SelectItem value="__empty">선택 안 함</SelectItem>{headers.map((header) => <SelectItem key={header} value={header}>{header}</SelectItem>)}</SelectContent></Select></label>)}</div>
    </TableSurface> : null}
    <TableSurface toolbar={<div className="flex items-center justify-between gap-2"><span className="text-sm font-medium">분류 미리보기</span><button type="button" className="ui-button-primary" disabled={!rows.some((row) => row.trackingNumber)}>발송</button></div>}>
      <BasicDataTable bare columns={[{ key: 'row', label: '행' }, { key: 'order', label: '주문번호' }, { key: 'tracking', label: '운송장번호' }, { key: 'recipient', label: '수취인' }, { key: 'status', label: '검증' }]} rows={rows} rowKey={(row) => row.rowNumber} emptyState="파일을 선택하면 정규화된 행을 미리봅니다." renderCell={(row: TrackingRow, key) => key === 'row' ? row.rowNumber : key === 'order' ? row.orderNumber || '-' : key === 'tracking' ? row.trackingNumber || '-' : key === 'recipient' ? row.recipientName || '-' : row.trackingNumber ? '매칭 대기' : '운송장번호 필요'} />
    </TableSurface>
  </div>
}

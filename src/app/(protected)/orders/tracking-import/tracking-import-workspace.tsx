'use client'

import { useMemo, useState, useTransition } from 'react'
import * as XLSX from 'xlsx'
import { BasicDataTable } from '@/components/ui/basic-data-table'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { TableSurface } from '@/components/ui/table-surface'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { BUILT_IN_TRACKING_PRESETS, type TrackingColumnMapping, type TrackingRow, headerFingerprint, normalizeTrackingRows } from '@/lib/excel'
import { finalizeTrackingImport, previewTrackingImport, saveTrackingPreset, type SavedTrackingPreset, type TrackingPreviewRow } from '@/lib/actions/tracking-import'

const fields = [
  ['orderNumber', '주문번호'], ['trackingNumber', '운송장번호'], ['carrier', '택배사'], ['recipientName', '수취인'], ['address', '주소'], ['shippedAt', '발송일'],
] as const
const emptyMapping: TrackingColumnMapping = { orderNumber: '', trackingNumber: '', carrier: '', recipientName: '', address: '', shippedAt: '' }

type Props = { initialPresets?: SavedTrackingPreset[] }

export default function TrackingImportWorkspace({ initialPresets = [] }: Props) {
  const [workbook, setWorkbook] = useState<XLSX.WorkBook | null>(null)
  const [sheetName, setSheetName] = useState('')
  const [headerRow, setHeaderRow] = useState('1')
  const [headers, setHeaders] = useState<string[]>([])
  const [sourceRows, setSourceRows] = useState<Record<string, unknown>[]>([])
  const [mapping, setMapping] = useState<TrackingColumnMapping>(emptyMapping)
  const [preset, setPreset] = useState('')
  const [savedPresets, setSavedPresets] = useState(initialPresets)
  const [presetName, setPresetName] = useState('')
  const [filename, setFilename] = useState('')
  const [preview, setPreview] = useState<TrackingPreviewRow[] | null>(null)
  const [result, setResult] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const rows = useMemo(() => normalizeTrackingRows(sourceRows, mapping), [sourceRows, mapping])
  const fingerprint = headers.length ? headerFingerprint(headers) : ''
  const headerRows = useMemo(() => {
    if (!workbook || !sheetName) return []
    const range = XLSX.utils.decode_range(workbook.Sheets[sheetName]['!ref'] ?? 'A1:A1')
    return Array.from({ length: Math.min(range.e.r + 1, 20) }, (_, index) => index + 1)
  }, [workbook, sheetName])

  function resetPreview() {
    setPreview(null)
    setResult(null)
  }

  function inferPreset(nextHeaders: string[]) {
    const matchingFingerprint = (candidate: TrackingColumnMapping) => {
      const mappedHeaders = Object.values(candidate).filter(Boolean)
      return mappedHeaders.length > 0 && headerFingerprint(mappedHeaders) === headerFingerprint(nextHeaders.filter((header) => mappedHeaders.includes(header)))
    }
    const selected = BUILT_IN_TRACKING_PRESETS.find((item) => matchingFingerprint(item.mapping))
      ?? savedPresets.find((item) => matchingFingerprint(item.mapping))
    if (selected) {
      setPreset('id' in selected ? `saved:${selected.id}` : selected.name)
      setMapping({ ...selected.mapping })
    } else {
      setPreset('')
      setMapping(emptyMapping)
    }
  }

  function loadSheet(nextWorkbook: XLSX.WorkBook, nextSheetName: string, nextHeaderRow: number) {
    const sheet = nextWorkbook.Sheets[nextSheetName]
    const values = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: '', range: nextHeaderRow - 1 })
    const nextHeaders = Object.keys(values[0] ?? {})
    setSourceRows(values)
    setHeaders(nextHeaders)
    inferPreset(nextHeaders)
    resetPreview()
  }

  async function onFile(file?: File) {
    if (!file) return
    const nextWorkbook = XLSX.read(await file.arrayBuffer(), { type: 'array' })
    const nextSheetName = nextWorkbook.SheetNames[0] ?? ''
    setFilename(file.name)
    setWorkbook(nextWorkbook)
    setSheetName(nextSheetName)
    setHeaderRow('1')
    if (nextSheetName) loadSheet(nextWorkbook, nextSheetName, 1)
  }

  function chooseSheet(value: string) {
    if (!workbook) return
    setSheetName(value)
    setHeaderRow('1')
    loadSheet(workbook, value, 1)
  }

  function chooseHeaderRow(value: string) {
    if (!workbook || !sheetName) return
    setHeaderRow(value)
    loadSheet(workbook, sheetName, Number(value))
  }

  function choosePreset(value: string) {
    const selected = BUILT_IN_TRACKING_PRESETS.find((item) => item.name === value)
      ?? savedPresets.find((item) => `saved:${item.id}` === value)
    setPreset(value)
    if (selected) {
      setMapping({ ...selected.mapping })
      resetPreview()
    }
  }

  function updateMapping(field: keyof TrackingColumnMapping, value: string) {
    setMapping((current) => ({ ...current, [field]: value === '__empty' ? '' : value }))
    resetPreview()
  }

  function savePreset() {
    startTransition(async () => {
      try {
        const saved = await saveTrackingPreset({ name: presetName, mapping })
        setSavedPresets((current) => [...current.filter((item) => item.id !== saved.id), saved].sort((a, b) => a.name.localeCompare(b.name)))
        setPreset(`saved:${saved.id}`)
        setPresetName('')
        setResult(`프리셋 ${saved.name} 저장됨`)
      } catch (error) {
        setResult(error instanceof Error ? error.message : '프리셋을 저장하지 못했습니다.')
      }
    })
  }

  function validateRows() {
    startTransition(async () => {
      try {
        const next = await previewTrackingImport({ filename, rows })
        setPreview(next.rows)
        const ready = next.rows.filter((row) => row.dispatchable).length
        setResult(`매칭 ${ready}건 · 확인 필요 ${next.rows.length - ready}건`)
      } catch (error) {
        setResult(error instanceof Error ? error.message : '송장 검증에 실패했습니다.')
      }
    })
  }

  function dispatchRows() {
    const candidates = (preview ?? []).flatMap((row) => row.fulfillmentCandidate ? [row.fulfillmentCandidate] : [])
    startTransition(async () => {
      try {
        const next = await finalizeTrackingImport(candidates)
        setResult(`발송 성공 ${next.externalSucceeded} · 재고 반영 ${next.finalized} · 재조정 필요 ${next.reconcileRequired} · 실패 ${next.failed}`)
      } catch (error) {
        setResult(error instanceof Error ? error.message : '발송 처리에 실패했습니다.')
      }
    })
  }

  return <div className="space-y-4">
    <TableSurface toolbar={<div className="flex items-center gap-2"><span className="text-sm text-[color:var(--muted-foreground)]">파일 → 시트/헤더 → 컬럼 매핑 → 미리보기 → 발송</span><Button asChild variant="secondary"><label className="cursor-pointer">파일 선택<input aria-label="송장 파일" type="file" accept=".xlsx,.xls,.csv" className="sr-only" onChange={(event) => onFile(event.target.files?.[0])} /></label></Button></div>}>
      <div className="p-4 text-sm text-[color:var(--muted-foreground)]">원본 파일은 저장하지 않고, 매핑된 행과 검증 결과만 반영합니다.</div>
    </TableSurface>
    {workbook ? <TableSurface toolbar={<div className="flex items-center gap-2"><span className="text-sm font-medium">시트/헤더</span><Select value={sheetName} onValueChange={chooseSheet}><SelectTrigger aria-label="시트 선택"><SelectValue /></SelectTrigger><SelectContent>{workbook.SheetNames.map((name) => <SelectItem key={name} value={name}>{name}</SelectItem>)}</SelectContent></Select><Select value={headerRow} onValueChange={chooseHeaderRow}><SelectTrigger aria-label="헤더 행"><SelectValue /></SelectTrigger><SelectContent>{headerRows.map((row) => <SelectItem key={row} value={String(row)}>{row}행</SelectItem>)}</SelectContent></Select></div>}>
      <div className="p-4 text-sm text-[color:var(--muted-foreground)]">선택한 시트와 헤더 행으로 컬럼과 미리보기를 다시 계산합니다.</div>
    </TableSurface> : null}
    {headers.length ? <TableSurface toolbar={<div className="flex flex-wrap items-center gap-2"><span className="text-sm font-medium">컬럼 매핑</span><Select value={preset} onValueChange={choosePreset}><SelectTrigger aria-label="매핑 프리셋"><SelectValue placeholder="프리셋 선택" /></SelectTrigger><SelectContent>{BUILT_IN_TRACKING_PRESETS.map((item) => <SelectItem key={item.name} value={item.name}>{item.name}</SelectItem>)}{savedPresets.map((item) => <SelectItem key={item.id} value={`saved:${item.id}`}>{item.name}</SelectItem>)}</SelectContent></Select><Input aria-label="새 프리셋 이름" value={presetName} onChange={(event) => setPresetName(event.target.value)} placeholder="복제 프리셋 이름" /><Button type="button" variant="secondary" disabled={isPending || !presetName.trim()} onClick={savePreset}>저장</Button><span className="text-xs text-[color:var(--muted-foreground)]">헤더 {fingerprint}</span></div>}>
      <div className="grid grid-cols-2 gap-2 p-4 md:grid-cols-3">{fields.map(([field, label]) => <label key={field} className="text-sm"><span className="mb-1 block">{label}{field === 'trackingNumber' ? ' *' : ''}</span><Select value={mapping[field] || '__empty'} onValueChange={(value) => updateMapping(field, value)}><SelectTrigger aria-label={`${label} 열`}><SelectValue /></SelectTrigger><SelectContent><SelectItem value="__empty">선택 안 함</SelectItem>{headers.map((header) => <SelectItem key={header} value={header}>{header}</SelectItem>)}</SelectContent></Select></label>)}</div>
    </TableSurface> : null}
    <TableSurface toolbar={<div className="flex w-full items-center justify-between gap-2"><div className="flex items-center gap-2"><span className="text-sm font-medium">분류 미리보기</span>{result ? <span role="status" className="text-xs text-[color:var(--muted-foreground)]">{result}</span> : null}</div><div className="flex gap-2"><Button type="button" variant="secondary" disabled={isPending || !filename || !mapping.trackingNumber || !rows.some((row) => row.trackingNumber)} onClick={validateRows}>검증</Button><Button type="button" disabled={isPending || !(preview ?? []).some((row) => row.dispatchable)} onClick={dispatchRows}>발송</Button></div></div>}>
      <BasicDataTable bare columns={[{ key: 'row', label: '행' }, { key: 'order', label: '주문번호' }, { key: 'tracking', label: '운송장번호' }, { key: 'recipient', label: '수취인' }, { key: 'status', label: '검증' }]} rows={preview ?? rows} rowKey={(row) => row.rowNumber} emptyState="파일을 선택하면 정규화된 행을 미리봅니다." renderCell={(row: TrackingRow | TrackingPreviewRow, key) => key === 'row' ? row.rowNumber : key === 'order' ? row.orderNumber || '-' : key === 'tracking' ? row.trackingNumber || '-' : key === 'recipient' ? row.recipientName || '-' : 'matchStatus' in row ? ({ MATCHED: '발송 가능', MISSING: '주문 없음', AMBIGUOUS: '복수 후보', DUPLICATE: '중복', TRACKING_MISSING: '운송장번호 필요' }[row.matchStatus]) : row.trackingNumber ? '검증 대기' : '운송장번호 필요'} />
    </TableSurface>
  </div>
}

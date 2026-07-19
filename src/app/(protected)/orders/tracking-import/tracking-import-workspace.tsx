'use client'

import { useMemo, useState, useTransition } from 'react'
import { BasicDataTable } from '@/components/ui/basic-data-table'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { TableSurface } from '@/components/ui/table-surface'
import {
  ParseTemplateBuilder,
  extractDataRows,
  extractHeaders,
  rowsAsRecords,
  workbookToSample,
  type ParseTemplateMapping,
  type ParseTemplatePreset,
  type ParseTemplateRole,
  type ParseTemplateSample,
} from '@/components/ui/parse-template-builder'
import { BUILT_IN_TRACKING_PRESETS, type TrackingColumnMapping, type TrackingField, type TrackingRow, normalizeTrackingRows } from '@/lib/excel'
import { finalizeTrackingImport, previewTrackingImport, saveTrackingPreset, type SavedTrackingPreset, type TrackingPreviewRow } from '@/lib/actions/tracking-import'

const trackingRoles: ParseTemplateRole<TrackingField>[] = [
  { key: 'orderNumber', label: '주문번호' },
  { key: 'trackingNumber', label: '운송장번호', required: true },
  { key: 'carrier', label: '택배사' },
  { key: 'recipientName', label: '수취인' },
  { key: 'address', label: '주소' },
  { key: 'shippedAt', label: '발송일' },
]
const emptyMapping: TrackingColumnMapping = { orderNumber: '', trackingNumber: '', carrier: '', recipientName: '', address: '', shippedAt: '' }

type Props = { initialPresets?: SavedTrackingPreset[] }

export default function TrackingImportWorkspace({ initialPresets = [] }: Props) {
  const [sample, setSample] = useState<ParseTemplateSample | null>(null)
  const [sheetName, setSheetName] = useState('')
  const [headerRowNumber, setHeaderRowNumber] = useState(1)
  const [mapping, setMapping] = useState<TrackingColumnMapping>(emptyMapping)
  const [presetId, setPresetId] = useState<string | null>(null)
  const [savedPresets, setSavedPresets] = useState(initialPresets)
  const [presetName, setPresetName] = useState('')
  const [filename, setFilename] = useState('')
  const [preview, setPreview] = useState<TrackingPreviewRow[] | null>(null)
  const [result, setResult] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const presets: ParseTemplatePreset<TrackingField>[] = useMemo(() => [
    ...BUILT_IN_TRACKING_PRESETS.map((item) => ({ id: item.name, label: item.name, mapping: item.mapping, immutable: true })),
    ...savedPresets.map((item) => ({ id: `saved:${item.id}`, label: item.name, mapping: item.mapping })),
  ], [savedPresets])
  const rows = useMemo(() => {
    const headers = sample ? extractHeaders(sample, sheetName, headerRowNumber) : []
    const dataRows = sample ? extractDataRows(sample, sheetName, headerRowNumber) : []
    return normalizeTrackingRows(rowsAsRecords(headers, dataRows), mapping)
  }, [sample, sheetName, headerRowNumber, mapping])

  function resetPreview() {
    setPreview(null)
    setResult(null)
  }

  function applyPreset(id: string) {
    const selected = presets.find((item) => item.id === id)
    setPresetId(id)
    if (selected) {
      setMapping({ ...selected.mapping } as TrackingColumnMapping)
      resetPreview()
    }
  }

  async function onFile(file?: File) {
    if (!file) return
    const nextSample = await workbookToSample(file)
    const firstSheetName = nextSample.sheets[0]?.name ?? ''
    setFilename(file.name)
    setSample(nextSample)
    setSheetName(firstSheetName)
    setHeaderRowNumber(1)
    setMapping(emptyMapping)
    setPresetId(null)
    resetPreview()
  }

  function chooseSheet(nextSheetName: string) {
    setSheetName(nextSheetName)
    setHeaderRowNumber(1)
    setMapping(emptyMapping)
    setPresetId(null)
    resetPreview()
  }

  function chooseHeaderRow(nextHeaderRowNumber: number) {
    setHeaderRowNumber(nextHeaderRowNumber)
    setMapping(emptyMapping)
    setPresetId(null)
    resetPreview()
  }

  function updateMapping(nextMapping: ParseTemplateMapping<TrackingField>) {
    setMapping(nextMapping as TrackingColumnMapping)
    resetPreview()
  }

  function savePreset() {
    startTransition(async () => {
      try {
        const saved = await saveTrackingPreset({ name: presetName, mapping })
        setSavedPresets((current) => [...current.filter((item) => item.id !== saved.id), saved].sort((a, b) => a.name.localeCompare(b.name)))
        setPresetId(`saved:${saved.id}`)
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
    {sample ? <TableSurface toolbar={<div className="flex items-center gap-2"><span className="text-sm font-medium">파싱 템플릿</span><Input aria-label="새 프리셋 이름" value={presetName} onChange={(event) => setPresetName(event.target.value)} placeholder="복제 프리셋 이름" /><Button type="button" variant="secondary" disabled={isPending || !presetName.trim()} onClick={savePreset}>저장</Button></div>}>
      <div className="p-4">
        <ParseTemplateBuilder<TrackingField>
          roles={trackingRoles}
          sample={sample}
          sheetName={sheetName}
          headerRowNumber={headerRowNumber}
          mapping={mapping}
          onSheetChange={chooseSheet}
          onHeaderRowChange={chooseHeaderRow}
          onMappingChange={updateMapping}
          presets={presets}
          selectedPresetId={presetId}
          onPresetSelect={applyPreset}
          sheetLabel="시트 선택"
          headerRowLabel="헤더 행"
          presetLabel="매핑 프리셋"
          previewLabel="컬럼 매핑 미리보기"
          emptyPreviewState="시트와 헤더 행을 선택하면 컬럼별 미리보기가 표시됩니다."
        />
      </div>
    </TableSurface> : null}
    <TableSurface toolbar={<div className="flex w-full items-center justify-between gap-2"><div className="flex items-center gap-2"><span className="text-sm font-medium">분류 미리보기</span>{result ? <span role="status" className="text-xs text-[color:var(--muted-foreground)]">{result}</span> : null}</div><div className="flex gap-2"><Button type="button" variant="secondary" disabled={isPending || !filename || !mapping.trackingNumber || !rows.some((row) => row.trackingNumber)} onClick={validateRows}>검증</Button><Button type="button" disabled={isPending || !(preview ?? []).some((row) => row.dispatchable)} onClick={dispatchRows}>발송</Button></div></div>}>
      <BasicDataTable bare columns={[{ key: 'row', label: '행' }, { key: 'order', label: '주문번호' }, { key: 'tracking', label: '운송장번호' }, { key: 'recipient', label: '수취인' }, { key: 'status', label: '검증' }]} rows={preview ?? rows} rowKey={(row) => row.rowNumber} emptyState="파일을 선택하면 정규화된 행을 미리봅니다." renderCell={(row: TrackingRow | TrackingPreviewRow, key) => key === 'row' ? row.rowNumber : key === 'order' ? row.orderNumber || '-' : key === 'tracking' ? row.trackingNumber || '-' : key === 'recipient' ? row.recipientName || '-' : 'matchStatus' in row ? ({ MATCHED: '발송 가능', MISSING: '주문 없음', AMBIGUOUS: '복수 후보', DUPLICATE: '중복', TRACKING_MISSING: '운송장번호 필요' }[row.matchStatus]) : row.trackingNumber ? '검증 대기' : '운송장번호 필요'} />
    </TableSurface>
  </div>
}

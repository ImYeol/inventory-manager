'use client'

import { useEffect, useMemo, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { createInboundTemplateVersion, getActiveInboundTemplatesForSupplier, inspectInboundTemplateSample, listResumableInboundReviews, loadInboundReviewRevision, previewInboundTemplateFile, promoteInboundImportRevision, saveInboundTemplateDraft, type InboundFilePreview, type InboundTemplateSample, type ResumableInboundReview } from '@/lib/actions/inbound-import'
import { confirmSupplierSkuMapping } from '@/lib/actions/supplier-sku-mapping'
import { normalizeSupplierExternalSku } from '@/lib/supplier-sku'
import type { ColumnDef } from '@tanstack/react-table'
import { EditableTable } from '@/components/ui/editable-table'
import { DataTable } from '@/components/ui/data-table'
import { Button } from '@/components/ui/button'
import { FileDropInput } from '@/components/ui/file-drop-input'
import { Input } from '@/components/ui/input'
import { Modal } from '@/components/ui/modal'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { StatusBadge } from '@/components/ui/badge-1'
import { ParseTemplateBuilder, extractHeaders as extractSampleHeaders, type ParseTemplateCustomMapping, type ParseTemplateMapping } from '@/components/ui/parse-template-builder'
import { ui } from '@/app/components/ui'

type Lookup = { id: number; name: string }
type ProductVariantOption = { id: number; label: string }
export type InboundTemplateOption = { id: number; name: string; versionId: number; versionNumber: number }
type DraftRow = InboundFilePreview['rows'][number] & { key: string; sourceRowId?: number }
type InboundRole = 'externalSku' | 'quantity'
const inboundRoles = [{ key: 'externalSku' as const, label: '외부 SKU', required: true }, { key: 'quantity' as const, label: '수량', required: true }]

const EMPTY_VALUE = '__empty__'

function rowKey() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

export default function InboundRegistrationSheet({
  suppliers,
  warehouses,
  initialWarehouseId,
  productVariants = [],
  returnTo = '/inventory',
  onSaved,
}: {
  suppliers: Lookup[]
  warehouses: Lookup[]
  initialWarehouseId?: number
  productVariants?: ProductVariantOption[]
  returnTo?: string
  onSaved?: (draftId: number) => void
}) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [supplierId, setSupplierId] = useState('')
  const [warehouseId, setWarehouseId] = useState(initialWarehouseId ? String(initialWarehouseId) : '')
  const [templateVersionId, setTemplateVersionId] = useState('')
  const [shipmentNumber, setShipmentNumber] = useState('')
  const [templateOptionsState, setTemplateOptionsState] = useState<InboundTemplateOption[]>([])
  const [rows, setRows] = useState<DraftRow[]>([])
  const [preview, setPreview] = useState<InboundFilePreview | null>(null)
  const [sourceFile, setSourceFile] = useState<File | undefined>()
  const [message, setMessage] = useState<string | null>(null)
  const [templateModalOpen, setTemplateModalOpen] = useState(false)
  const [templateSample, setTemplateSample] = useState<InboundTemplateSample | null>(null)
  const [templateName, setTemplateName] = useState('')
  const [sampleSheetName, setSampleSheetName] = useState('')
  const [headerRowNumber, setHeaderRowNumber] = useState('1')
  const [externalSkuColumn, setExternalSkuColumn] = useState('')
  const [quantityColumn, setQuantityColumn] = useState('')
  const [customMappings, setCustomMappings] = useState<ParseTemplateCustomMapping[]>([])
  const [editingTemplateId, setEditingTemplateId] = useState<number | undefined>()
  const [savedRevisionId, setSavedRevisionId] = useState<number | null>(null)
  const [confirmedSkus, setConfirmedSkus] = useState<Set<string>>(new Set())
  const [resumableReviews, setResumableReviews] = useState<ResumableInboundReview[]>([])

  const selectedTemplate = useMemo(() => templateOptionsState.find((template) => template.versionId === Number(templateVersionId)) ?? null, [templateVersionId, templateOptionsState])
  const templateOptions = templateOptionsState.map((template) => ({ value: String(template.versionId), label: `${template.name} v${template.versionNumber}` }))
  const sampleSheet = templateSample?.sheets.find((sheet) => sheet.name === sampleSheetName)
  const sampleHeaders = templateSample ? extractSampleHeaders(templateSample, sampleSheetName, Number(headerRowNumber) || 1) : []
  const reviewBlockers = rows.filter((row) => Boolean(row.validationError) || !row.productVariantId || !Number.isInteger(row.quantity) || Number(row.quantity) <= 0)
  const templateMapping: ParseTemplateMapping<InboundRole> = { externalSku: externalSkuColumn, quantity: quantityColumn }
  const promotionStage: 1 | 2 = savedRevisionId ? 2 : 1

  useEffect(() => {
    let active = true
    listResumableInboundReviews()
      .then((reviews) => { if (active) setResumableReviews(reviews ?? []) })
      .catch(() => { if (active) setResumableReviews([]) })
    return () => { active = false }
  }, [])

  // 입고처 → 템플릿 → 파일 순서 규칙: 템플릿 select는 항상 렌더되지만 선택된 입고처의 템플릿으로만 채워진다.
  useEffect(() => {
    let active = true
    const request = supplierId ? getActiveInboundTemplatesForSupplier(Number(supplierId)) : Promise.resolve([])
    request
      .then((options) => {
        if (!active) return
        setTemplateOptionsState(options)
        setTemplateVersionId((current) => {
          if (!supplierId) return ''
          if (current && options.some((option) => String(option.versionId) === current)) return current
          return options.length === 1 ? String(options[0].versionId) : ''
        })
      })
      .catch(() => { if (active) { setTemplateOptionsState([]); setTemplateVersionId('') } })
    return () => { active = false }
  }, [supplierId])

  const resumeReview = (revisionId: number) => {
    startTransition(async () => {
      try {
        const revision = await loadInboundReviewRevision(revisionId)
        setSupplierId(String(revision.supplierId))
        setTemplateVersionId(String(revision.templateVersionId))
        setShipmentNumber(revision.shipmentNumber)
        setPreview({ ...revision, rows: revision.rows })
        setRows(revision.rows.map((row) => ({ ...row, key: rowKey() })))
        setSourceFile(undefined)
        setSavedRevisionId(revision.revisionId)
        setConfirmedSkus(new Set(revision.rows.filter((row) => row.productVariantId).map((row) => normalizeSupplierExternalSku(row.externalSku))))
        setMessage('저장된 원본 증빙을 행 순서대로 불러왔습니다.')
      } catch (error) {
        setMessage(error instanceof Error ? error.message : '저장된 검토를 불러오지 못했습니다.')
      }
    })
  }

  const inspectSample = (file: File) => {
    startTransition(async () => {
      try {
        const result = await inspectInboundTemplateSample(file)
        const firstSheet = result.sheets[0]
        setTemplateSample(result)
        setSampleSheetName(firstSheet?.name ?? '')
        setHeaderRowNumber('1')
        setExternalSkuColumn('')
        setQuantityColumn('')
        setCustomMappings([])
      } catch (error) {
        setMessage(error instanceof Error ? error.message : '샘플 파일을 읽지 못했습니다.')
      }
    })
  }

  const saveTemplate = () => {
    if (!supplierId || !sampleSheet || !templateName.trim() || !externalSkuColumn || !quantityColumn) return
    startTransition(async () => {
      try {
        const result = await createInboundTemplateVersion({
          templateId: editingTemplateId,
          supplierId: Number(supplierId),
          name: templateName,
          sheetName: sampleSheet.name,
          headerRowNumber: Number(headerRowNumber),
          headers: sampleHeaders,
          mappings: {
            externalSku: externalSkuColumn,
            quantity: quantityColumn,
            source: Object.fromEntries(customMappings.filter((row) => row.name.trim() && row.column).map((row) => [row.name.trim(), row.column])),
          },
        })
        setTemplateOptionsState((current) => [...current.filter((template) => template.id !== result.id), result])
        setTemplateVersionId(String(result.versionId))
        setTemplateModalOpen(false)
      } catch (error) {
        setMessage(error instanceof Error ? error.message : '파싱 템플릿을 저장하지 못했습니다.')
      }
    })
  }

  const updateRow = (key: string, patch: Pick<DraftRow, 'productVariantId'>) => {
    setRows((current) => current.map((row) => {
      if (row.key !== key) return row
      return { ...row, ...patch }
    }))
  }

  const previewFile = (file: File) => {
    if (!supplierId || !templateVersionId) {
      setMessage('입고처와 파싱 템플릿을 먼저 선택해주세요.')
      return
    }
    setMessage(null)
    startTransition(async () => {
      try {
        const result = await previewInboundTemplateFile({ supplierId: Number(supplierId), templateVersionId: Number(templateVersionId), file })
        setPreview(result)
        setSourceFile(file)
        setRows(result.rows.map((row) => ({ ...row, key: rowKey() })))
        setConfirmedSkus(new Set(result.rows.filter((row) => row.productVariantId).map((row) => normalizeSupplierExternalSku(row.externalSku))))
      } catch (error) {
        setMessage(error instanceof Error ? error.message : '파일을 미리보기 하지 못했습니다.')
      }
    })
  }

  const saveDraft = () => {
    if (!supplierId || !selectedTemplate || rows.length === 0 || !sourceFile || !shipmentNumber.trim()) {
      setMessage('입고처, 파싱 템플릿, 외부 출고 번호와 입고 파일을 입력해주세요.')
      return
    }
    const draftPreview: InboundFilePreview = preview ?? {
      supplierId: Number(supplierId), templateId: selectedTemplate.id, templateVersionId: selectedTemplate.versionId,
      sheetName: '', headerRowNumber: 0, headers: [], fileHash: '', rows: [],
    }
    startTransition(async () => {
      try {
        const result = await saveInboundTemplateDraft({
          preview: draftPreview,
          rows: rows.map((row) => ({
            sourceRowNumber: row.sourceRowNumber,
            externalSku: row.externalSku,
            rawQuantity: row.rawQuantity,
            quantity: row.quantity,
            validationError: row.validationError,
            productVariantId: row.productVariantId,
            sourceValues: row.sourceValues,
          })),
          ...(sourceFile ? { file: sourceFile } : {}),
          shipmentNumber,
        })
        setSavedRevisionId(result.id)
        setMessage(result.blockers?.length
          ? `${result.blockers.join(', ')}행은 연결 또는 원본 수량 오류 보정 후에만 입고 예정으로 전환할 수 있습니다.`
          : result.proposedRevision ? '새 개정 증빙을 저장했습니다. 기본 창고를 확인한 뒤 입고 예정으로 전환하세요.' : '입고 증빙을 저장했습니다. 기본 창고를 확인한 뒤 입고 예정으로 전환하세요.')
      } catch (error) {
        setMessage(error instanceof Error ? error.message : '입고 초안을 저장하지 못했습니다.')
      }
    })
  }

  const confirmMapping = (row: DraftRow) => {
    if (!supplierId || !row.productVariantId) return
    const productVariantId = row.productVariantId
    startTransition(async () => {
      try {
        const exactSku = normalizeSupplierExternalSku(row.externalSku)
        const sourceRowIds = rows.filter((candidate) => candidate.sourceRowId && normalizeSupplierExternalSku(candidate.externalSku) === exactSku).map((candidate) => candidate.sourceRowId as number)
        await confirmSupplierSkuMapping({ supplierId: Number(supplierId), externalSku: row.externalSku, productVariantId, ...(sourceRowIds.length ? { sourceRowIds } : {}) })
        setRows((current) => current.map((candidate) => normalizeSupplierExternalSku(candidate.externalSku) === exactSku
          ? { ...candidate, productVariantId }
          : candidate))
        setConfirmedSkus((current) => new Set([...current, exactSku]))
        setMessage(null)
      } catch (error) { setMessage(error instanceof Error ? error.message : '공급자 SKU를 연결하지 못했습니다.') }
    })
  }

  const promote = () => {
    if (!savedRevisionId || !warehouseId) return
    startTransition(async () => {
      try {
        const arrivalId = await promoteInboundImportRevision({ revisionId: savedRevisionId, defaultWarehouseId: Number(warehouseId) })
        setMessage('입고 예정으로 전환했습니다.')
        onSaved?.(arrivalId)
        if (!onSaved) window.location.assign('/sourcing/arrivals')
      } catch (error) { setMessage(error instanceof Error ? error.message : '입고 예정으로 전환하지 못했습니다.') }
    })
  }

  const resumableReviewColumns: ColumnDef<ResumableInboundReview, unknown>[] = [
    { id: 'source', header: '증빙', enableSorting: false, cell: ({ row }) => <span>{row.original.filename ?? '수동 증빙'}</span> },
    { id: 'supplier', header: '입고처 / 출고 번호', enableSorting: false, cell: ({ row }) => <span>{row.original.supplierName} · {row.original.shipmentNumber}</span> },
    { id: 'state', header: '행 / 보정', enableSorting: false, meta: { headerClassName: 'text-right', cellClassName: 'text-right' }, cell: ({ row }) => <span className="tabular-nums">{row.original.rowCount} / {row.original.blockerCount}</span> },
    { id: 'action', header: '작업', enableSorting: false, meta: { headerClassName: 'text-right', cellClassName: 'text-right' }, cell: ({ row }) => <Button type="button" variant="ghost" size="sm" disabled={isPending} onClick={() => resumeReview(row.original.id)}>이어서 검토</Button> },
  ]

  return (
    <div className="space-y-[var(--space-5)]">
      <ol aria-label="입고 처리 단계" className="flex flex-wrap items-center gap-2 text-sm">
        <li className="flex items-center gap-2">
          <StatusBadge tone={promotionStage === 1 ? 'info' : 'success'}>1</StatusBadge>
          <span className={promotionStage === 1 ? 'font-semibold text-[color:var(--foreground)]' : 'text-[color:var(--muted-foreground)]'}>증빙 검토 · InboundImport</span>
        </li>
        <span aria-hidden="true" className="text-[color:var(--muted-foreground)]">→</span>
        <li className="flex items-center gap-2">
          <StatusBadge tone={promotionStage === 2 ? 'info' : 'neutral'}>2</StatusBadge>
          <span className={promotionStage === 2 ? 'font-semibold text-[color:var(--foreground)]' : 'text-[color:var(--muted-foreground)]'}>창고 배정·전환 · FactoryArrival</span>
        </li>
      </ol>
      {resumableReviews.length && !preview ? <div className="space-y-[var(--space-2)]"><p className={ui.label}>저장된 검토</p><DataTable<ResumableInboundReview>
        bare
        columns={resumableReviewColumns}
        rows={resumableReviews} rowAriaLabel={(review) => `${review.supplierName} 검토`} emptyState="이어서 검토할 증빙이 없습니다."
      /></div> : null}
      <div className="grid gap-[var(--space-3)] md:grid-cols-3">
        <label className="space-y-1"><span className={ui.label}>입고처</span><Select value={supplierId || EMPTY_VALUE} onValueChange={(value) => setSupplierId(value === EMPTY_VALUE ? '' : value)}><SelectTrigger aria-label="입고처"><SelectValue placeholder="입고처 선택" /></SelectTrigger><SelectContent><SelectItem value={EMPTY_VALUE}>입고처 선택</SelectItem>{suppliers.map((item) => <SelectItem key={item.id} value={String(item.id)}>{item.name}</SelectItem>)}</SelectContent></Select></label>
        <div className="space-y-1"><span className={ui.label}>입고 파싱 템플릿</span><div className="flex gap-2"><Select value={templateVersionId || EMPTY_VALUE} onValueChange={(value) => setTemplateVersionId(value === EMPTY_VALUE ? '' : value)} disabled={!supplierId}><SelectTrigger aria-label="입고 파싱 템플릿"><SelectValue placeholder="파싱 템플릿 선택" /></SelectTrigger><SelectContent><SelectItem value={EMPTY_VALUE}>파싱 템플릿 선택</SelectItem>{templateOptions.map((option) => <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>)}</SelectContent></Select><Button type="button" variant="secondary" size="sm" disabled={!supplierId} onClick={() => { setEditingTemplateId(undefined); setTemplateName(''); setTemplateModalOpen(true) }}>파싱 템플릿 만들기</Button>{selectedTemplate ? <Button type="button" variant="secondary" size="sm" onClick={() => { setEditingTemplateId(selectedTemplate.id); setTemplateName(selectedTemplate.name); setTemplateModalOpen(true) }}>파싱 템플릿 수정</Button> : null}</div></div>
        <label className="space-y-1"><span className={ui.label}>외부 출고 번호</span><Input aria-label="외부 출고 번호" value={shipmentNumber} onChange={(event) => setShipmentNumber(event.target.value)} /></label>
      </div>

      <FileDropInput
        ariaLabel="입고 파일 업로드"
        accept=".xlsx,.xls,.csv"
        onFile={previewFile}
        description="선택한 파싱 템플릿의 시트와 필수 열로만 미리보기합니다."
      />

      {preview ? <EditableTable
        columns={[{ key: 'externalSku', header: '외부 SKU' }, { key: 'quantity', header: '수량', align: 'right' }, { key: 'evidence', header: '원본 셀' }, { key: 'mapping', header: '내부 SKU 상태' }]}
        rows={rows}
        getRowKey={(row) => row.key}
        rowError={(row) => row.validationError ?? (row.productVariantId ? null : '내부 SKU 연결이 필요합니다.')}
        renderCell={(row, key) => {
          if (key === 'externalSku') return <span>{row.externalSku}</span>
          if (key === 'quantity') return <span className="tabular-nums">{row.rawQuantity}</span>
          if (key === 'evidence') return <span className="text-sm text-[color:var(--muted-foreground)]">{Object.entries(row.sourceValues).map(([name, value]) => `${name}: ${value}`).join(' · ') || '—'}</span>
          if (row.productVariantId && confirmedSkus.has(normalizeSupplierExternalSku(row.externalSku))) return <span className="text-[color:var(--success-foreground)]">연결됨</span>
          return <div className="flex items-center gap-2"><Select value={row.productVariantId ? String(row.productVariantId) : EMPTY_VALUE} onValueChange={(value) => updateRow(row.key, { productVariantId: value === EMPTY_VALUE ? null : Number(value) })}><SelectTrigger aria-label="내부 SKU"><SelectValue placeholder="내부 SKU 선택" /></SelectTrigger><SelectContent><SelectItem value={EMPTY_VALUE}>내부 SKU 선택</SelectItem>{productVariants.map((variant) => <SelectItem key={variant.id} value={String(variant.id)}>{variant.label}</SelectItem>)}</SelectContent></Select><Button type="button" variant="secondary" size="sm" disabled={isPending || !row.productVariantId} onClick={() => confirmMapping(row)}>연결</Button></div>
        }}
      /> : <p className="text-sm text-[color:var(--muted-foreground)]">파일을 올리면 원본 행을 검토하고 내부 SKU를 연결할 수 있습니다.</p>}

      {rows.some((row) => !row.productVariantId) ? <div className="flex items-center gap-3"><a href={`/products?returnTo=${encodeURIComponent(returnTo)}`} target="_blank" rel="noreferrer" className="text-sm text-[color:var(--link)] underline underline-offset-4">상품 관리에서 SKU 만들기</a><Button type="button" variant="secondary" size="sm" onClick={() => router.refresh()}>상품 목록 새로고침</Button></div> : null}

      {message ? <p role="alert" className="text-sm text-[color:var(--muted-foreground)]">{message}</p> : null}
      {savedRevisionId ? <div className="flex items-end justify-between gap-3 border-t border-[color:var(--border)] pt-[var(--space-4)]"><div><p className="text-sm font-medium text-[color:var(--foreground)]">2단계 · 입고 예정 전환</p><p className="text-sm text-[color:var(--muted-foreground)]">{reviewBlockers.length ? `${reviewBlockers.map((row) => row.sourceRowNumber).join(', ')}행의 연결·수량 문제를 먼저 해결하세요.` : '기본 창고 하나로 입고 예정 수량을 만듭니다.'}</p></div><label className="space-y-1"><span className={ui.label}>입고 창고</span><Select value={warehouseId || EMPTY_VALUE} onValueChange={(value) => setWarehouseId(value === EMPTY_VALUE ? '' : value)}><SelectTrigger aria-label="입고 창고"><SelectValue placeholder="창고 선택" /></SelectTrigger><SelectContent><SelectItem value={EMPTY_VALUE}>창고 선택</SelectItem>{warehouses.map((item) => <SelectItem key={item.id} value={String(item.id)}>{item.name}</SelectItem>)}</SelectContent></Select></label><Button type="button" disabled={isPending || !warehouseId || reviewBlockers.length > 0} onClick={promote}>입고 예정 전환</Button></div> : <div className="flex justify-end"><Button type="button" disabled={isPending || !sourceFile || rows.length === 0} onClick={saveDraft}>검토 저장</Button></div>}

      <Modal open={templateModalOpen} title="입고 파싱 템플릿 만들기" description="샘플 파일에서 시트·헤더 행과 외부 SKU, 수량 열을 선택하고 실제 데이터 미리보기를 확인해 저장합니다." onOpenChange={setTemplateModalOpen} footer={<div className="flex justify-end gap-2"><Button type="button" variant="secondary" onClick={() => setTemplateModalOpen(false)}>닫기</Button><Button type="button" disabled={isPending || !sampleSheet || !templateName.trim() || !externalSkuColumn || !quantityColumn} onClick={saveTemplate}>파싱 템플릿 저장</Button></div>}>
        <div className="space-y-4">
          <label className="space-y-1"><span className={ui.label}>파싱 템플릿 이름</span><Input aria-label="파싱 템플릿 이름" value={templateName} onChange={(event) => setTemplateName(event.target.value)} /></label>
          <div className="space-y-1"><span className={ui.label}>샘플 파일</span><FileDropInput ariaLabel="샘플 파일" accept=".xlsx,.xls,.csv" onFile={inspectSample} /></div>
          {templateSample ? <ParseTemplateBuilder<InboundRole>
            roles={inboundRoles}
            sample={templateSample}
            sheetName={sampleSheetName}
            headerRowNumber={Number(headerRowNumber) || 1}
            mapping={templateMapping}
            onSheetChange={setSampleSheetName}
            onHeaderRowChange={(next) => setHeaderRowNumber(String(next))}
            onMappingChange={(next) => { setExternalSkuColumn(next.externalSku); setQuantityColumn(next.quantity) }}
            customMappings={customMappings}
            onCustomMappingsChange={setCustomMappings}
            sheetLabel="파싱 템플릿 시트"
            headerRowLabel="헤더 행"
            previewLabel="샘플 데이터 미리보기"
            emptyPreviewState="시트와 헤더 행을 선택하면 샘플 데이터가 표시됩니다."
          /> : null}
        </div>
      </Modal>
    </div>
  )
}

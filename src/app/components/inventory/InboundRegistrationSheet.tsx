'use client'

import { useMemo, useRef, useState, useTransition } from 'react'
import { FileUp } from 'lucide-react'
import { createInboundTemplateVersion, inspectInboundTemplateSample, previewInboundTemplateFile, promoteInboundImportRevision, saveInboundTemplateDraft, type InboundFilePreview, type InboundTemplateSample } from '@/lib/actions/inbound-import'
import { confirmSupplierSkuMapping } from '@/lib/actions/supplier-sku-mapping'
import { normalizeSupplierExternalSku } from '@/lib/supplier-sku'
import { EditableTable } from '@/components/ui/editable-table'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Modal } from '@/components/ui/modal'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ui } from '@/app/components/ui'

type Lookup = { id: number; name: string }
type ProductVariantOption = { id: number; label: string }
export type InboundTemplateOption = { id: number; name: string; versionId: number; versionNumber: number }
type DraftRow = InboundFilePreview['rows'][number] & { key: string }

const EMPTY_VALUE = '__empty__'

function rowKey() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

function emptyRow(): DraftRow {
  return { key: rowKey(), sourceRowNumber: 0, externalSku: '', rawQuantity: '', quantity: null, validationError: '외부 SKU와 수량을 입력해주세요.', productVariantId: null, sourceValues: {} }
}

export default function InboundRegistrationSheet({
  suppliers,
  warehouses,
  templates,
  initialWarehouseId,
  productVariants = [],
  onSaved,
}: {
  suppliers: Lookup[]
  warehouses: Lookup[]
  templates: InboundTemplateOption[]
  initialWarehouseId?: number
  productVariants?: ProductVariantOption[]
  onSaved?: (draftId: number) => void
}) {
  const [isPending, startTransition] = useTransition()
  const inputRef = useRef<HTMLInputElement>(null)
  const [supplierId, setSupplierId] = useState('')
  const [warehouseId, setWarehouseId] = useState(initialWarehouseId ? String(initialWarehouseId) : '')
  const [templateVersionId, setTemplateVersionId] = useState('')
  const [shipmentNumber, setShipmentNumber] = useState('')
  const [templateOptionsState, setTemplateOptionsState] = useState(templates)
  const [rows, setRows] = useState<DraftRow[]>([emptyRow()])
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
  const [editingTemplateId, setEditingTemplateId] = useState<number | undefined>()
  const [savedRevisionId, setSavedRevisionId] = useState<number | null>(null)
  const [confirmedSkus, setConfirmedSkus] = useState<Set<string>>(new Set())

  const selectedTemplate = useMemo(() => templateOptionsState.find((template) => template.versionId === Number(templateVersionId)) ?? null, [templateVersionId, templateOptionsState])
  const templateOptions = templateOptionsState.map((template) => ({ value: String(template.versionId), label: `${template.name} v${template.versionNumber}` }))
  const sampleSheet = templateSample?.sheets.find((sheet) => sheet.name === sampleSheetName)
  const sampleHeaders = sampleSheet?.rows[Number(headerRowNumber) - 1] ?? []

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
      } catch (error) {
        setMessage(error instanceof Error ? error.message : '샘플 파일을 읽지 못했습니다.')
      }
    })
  }

  const saveTemplate = () => {
    if (!sampleSheet || !templateName.trim() || !externalSkuColumn || !quantityColumn) return
    startTransition(async () => {
      try {
        const result = await createInboundTemplateVersion({ templateId: editingTemplateId, name: templateName, sheetName: sampleSheet.name, headerRowNumber: Number(headerRowNumber), headers: sampleHeaders, mappings: { externalSku: externalSkuColumn, quantity: quantityColumn } })
        setTemplateOptionsState((current) => [...current.filter((template) => template.id !== result.id), result])
        setTemplateVersionId(String(result.versionId))
        setTemplateModalOpen(false)
      } catch (error) {
        setMessage(error instanceof Error ? error.message : '템플릿을 저장하지 못했습니다.')
      }
    })
  }

  const updateRow = (key: string, patch: Partial<DraftRow>) => {
    setRows((current) => current.map((row) => {
      if (row.key !== key) return row
      const next = { ...row, ...patch }
      const quantityValid = Number.isInteger(next.quantity) && (next.quantity ?? 0) > 0
      return { ...next, rawQuantity: patch.quantity === undefined ? next.rawQuantity : String(patch.quantity ?? ''), validationError: next.externalSku.trim() && quantityValid ? null : '외부 SKU와 수량을 입력해주세요.' }
    }))
  }

  const previewFile = (file: File) => {
    if (!supplierId || !templateVersionId) {
      setMessage('공급자와 템플릿을 먼저 선택해주세요.')
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
    if (!supplierId || !selectedTemplate || rows.length === 0 || !shipmentNumber.trim()) {
      setMessage('공급자, 템플릿, 외부 출고 번호와 입고 행을 입력해주세요.')
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
        setMessage(result.proposedRevision ? '새 개정 증빙을 저장했습니다. 기본 창고를 확인한 뒤 입고 예정으로 전환하세요.' : '입고 증빙을 저장했습니다. 기본 창고를 확인한 뒤 입고 예정으로 전환하세요.')
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
        await confirmSupplierSkuMapping({ supplierId: Number(supplierId), externalSku: row.externalSku, productVariantId })
        const exactSku = normalizeSupplierExternalSku(row.externalSku)
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

  return (
    <div className="space-y-[var(--space-5)]">
      <div className="grid gap-[var(--space-3)] md:grid-cols-3">
        <label className="space-y-1"><span className={ui.label}>공급자</span><Select value={supplierId || EMPTY_VALUE} onValueChange={(value) => setSupplierId(value === EMPTY_VALUE ? '' : value)}><SelectTrigger aria-label="공급자"><SelectValue placeholder="공급자 선택" /></SelectTrigger><SelectContent><SelectItem value={EMPTY_VALUE}>공급자 선택</SelectItem>{suppliers.map((item) => <SelectItem key={item.id} value={String(item.id)}>{item.name}</SelectItem>)}</SelectContent></Select></label>
        <div className="space-y-1"><span className={ui.label}>입고 템플릿</span><div className="flex gap-2"><Select value={templateVersionId || EMPTY_VALUE} onValueChange={(value) => setTemplateVersionId(value === EMPTY_VALUE ? '' : value)}><SelectTrigger aria-label="입고 템플릿"><SelectValue placeholder="템플릿 선택" /></SelectTrigger><SelectContent><SelectItem value={EMPTY_VALUE}>템플릿 선택</SelectItem>{templateOptions.map((option) => <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>)}</SelectContent></Select><Button type="button" variant="secondary" size="sm" onClick={() => { setEditingTemplateId(undefined); setTemplateName(''); setTemplateModalOpen(true) }}>템플릿 만들기</Button>{selectedTemplate ? <Button type="button" variant="secondary" size="sm" onClick={() => { setEditingTemplateId(selectedTemplate.id); setTemplateName(selectedTemplate.name); setTemplateModalOpen(true) }}>템플릿 수정</Button> : null}</div></div>
        <label className="space-y-1"><span className={ui.label}>외부 출고 번호</span><Input aria-label="외부 출고 번호" value={shipmentNumber} onChange={(event) => setShipmentNumber(event.target.value)} /></label>
      </div>

      <div
        className="flex min-h-40 flex-col items-center justify-center gap-[var(--space-2)] rounded-[var(--radius-lg)] border border-dashed border-[color:var(--border-strong)] bg-[color:var(--surface-muted)] p-[var(--space-6)] text-center"
        onDragOver={(event) => event.preventDefault()}
        onDrop={(event) => { event.preventDefault(); const file = event.dataTransfer.files[0]; if (file) previewFile(file) }}
      >
        <FileUp aria-hidden="true" className="size-5 text-[color:var(--muted)]" />
        <p className="font-medium text-[color:var(--foreground)]">파일을 놓거나 선택하세요</p>
        <p className="text-sm text-[color:var(--muted-foreground)]">선택한 템플릿의 시트와 필수 열로만 미리보기합니다.</p>
        <Input ref={inputRef} className="sr-only" aria-label="입고 파일 업로드" type="file" accept=".xlsx,.xls,.csv" onChange={(event) => { const file = event.target.files?.[0]; if (file) previewFile(file) }} />
        <Button type="button" variant="secondary" size="sm" onClick={() => inputRef.current?.click()}>파일 선택</Button>
      </div>

      <EditableTable
        columns={[{ key: 'externalSku', header: '외부 SKU' }, { key: 'quantity', header: '수량', align: 'right' }, { key: 'mapping', header: '내부 SKU 상태' }]}
        rows={rows}
        getRowKey={(row) => row.key}
        onAddRow={() => setRows((current) => [...current, emptyRow()])}
        onDeleteRow={(key) => setRows((current) => current.length > 1 ? current.filter((row) => row.key !== key) : current)}
        rowError={(row) => row.validationError ?? (row.productVariantId ? null : '내부 SKU 연결이 필요합니다.')}
        renderCell={(row, key) => {
          if (key === 'externalSku') return <Input aria-label="외부 SKU" value={row.externalSku} onChange={(event) => updateRow(row.key, { externalSku: event.target.value })} />
          if (key === 'quantity') return <Input aria-label="수량" type="number" min="1" value={row.quantity ?? ''} onChange={(event) => updateRow(row.key, { quantity: event.target.value === '' ? null : Number(event.target.value) })} />
          if (row.productVariantId && confirmedSkus.has(normalizeSupplierExternalSku(row.externalSku))) return <span className="text-[color:var(--success-foreground)]">연결됨</span>
          return <div className="flex items-center gap-2"><Select value={row.productVariantId ? String(row.productVariantId) : EMPTY_VALUE} onValueChange={(value) => updateRow(row.key, { productVariantId: value === EMPTY_VALUE ? null : Number(value) })}><SelectTrigger aria-label="내부 SKU"><SelectValue placeholder="내부 SKU 선택" /></SelectTrigger><SelectContent><SelectItem value={EMPTY_VALUE}>내부 SKU 선택</SelectItem>{productVariants.map((variant) => <SelectItem key={variant.id} value={String(variant.id)}>{variant.label}</SelectItem>)}</SelectContent></Select><Button type="button" variant="secondary" size="sm" disabled={isPending || !row.productVariantId} onClick={() => confirmMapping(row)}>연결</Button></div>
        }}
      />

      {rows.some((row) => !row.productVariantId) ? <a href="/products" className="text-sm text-[color:var(--link)] underline underline-offset-4">상품 관리에서 SKU 만들기</a> : null}

      {message ? <p role="alert" className="text-sm text-[color:var(--muted)]">{message}</p> : null}
      {savedRevisionId ? <div className="flex items-end justify-between gap-3 border-t border-[color:var(--border)] pt-[var(--space-4)]"><div><p className="text-sm font-medium text-[color:var(--foreground)]">2단계 · 입고 예정 전환</p><p className="text-sm text-[color:var(--muted)]">기본 창고 하나로 입고 예정 수량을 만듭니다.</p></div><label className="space-y-1"><span className={ui.label}>입고 창고</span><Select value={warehouseId || EMPTY_VALUE} onValueChange={(value) => setWarehouseId(value === EMPTY_VALUE ? '' : value)}><SelectTrigger aria-label="입고 창고"><SelectValue placeholder="창고 선택" /></SelectTrigger><SelectContent><SelectItem value={EMPTY_VALUE}>창고 선택</SelectItem>{warehouses.map((item) => <SelectItem key={item.id} value={String(item.id)}>{item.name}</SelectItem>)}</SelectContent></Select></label><Button type="button" disabled={isPending || !warehouseId} onClick={promote}>입고 예정 전환</Button></div> : <div className="flex justify-end"><Button type="button" disabled={isPending || rows.some((row) => Boolean(row.validationError) || !row.productVariantId)} onClick={saveDraft}>검토 저장</Button></div>}

      <Modal open={templateModalOpen} title="입고 템플릿 만들기" description="샘플 파일에서 시트·헤더 행과 외부 SKU, 수량 열을 선택해 저장합니다." onOpenChange={setTemplateModalOpen} footer={<div className="flex justify-end gap-2"><Button type="button" variant="secondary" onClick={() => setTemplateModalOpen(false)}>닫기</Button><Button type="button" disabled={isPending || !sampleSheet || !templateName.trim() || !externalSkuColumn || !quantityColumn} onClick={saveTemplate}>템플릿 저장</Button></div>}>
        <div className="space-y-4">
          <label className="space-y-1"><span className={ui.label}>템플릿 이름</span><Input aria-label="템플릿 이름" value={templateName} onChange={(event) => setTemplateName(event.target.value)} /></label>
          <label className="space-y-1"><span className={ui.label}>샘플 파일</span><Input aria-label="샘플 파일" type="file" accept=".xlsx,.xls,.csv" onChange={(event) => { const file = event.target.files?.[0]; if (file) inspectSample(file) }} /></label>
          {templateSample ? <div className="grid gap-3 sm:grid-cols-2"><label className="space-y-1"><span className={ui.label}>시트</span><Select value={sampleSheetName} onValueChange={setSampleSheetName}><SelectTrigger aria-label="템플릿 시트"><SelectValue /></SelectTrigger><SelectContent>{templateSample.sheets.map((sheet) => <SelectItem key={sheet.name} value={sheet.name}>{sheet.name}</SelectItem>)}</SelectContent></Select></label><label className="space-y-1"><span className={ui.label}>헤더 행</span><Input aria-label="헤더 행" type="number" min="1" max={String(sampleSheet?.rows.length ?? 1)} value={headerRowNumber} onChange={(event) => setHeaderRowNumber(event.target.value)} /></label><label className="space-y-1"><span className={ui.label}>외부 SKU 열</span><Select value={externalSkuColumn || EMPTY_VALUE} onValueChange={(value) => setExternalSkuColumn(value === EMPTY_VALUE ? '' : value)}><SelectTrigger aria-label="외부 SKU 열"><SelectValue placeholder="열 선택" /></SelectTrigger><SelectContent><SelectItem value={EMPTY_VALUE}>열 선택</SelectItem>{sampleHeaders.map((header) => <SelectItem key={header} value={header}>{header}</SelectItem>)}</SelectContent></Select></label><label className="space-y-1"><span className={ui.label}>수량 열</span><Select value={quantityColumn || EMPTY_VALUE} onValueChange={(value) => setQuantityColumn(value === EMPTY_VALUE ? '' : value)}><SelectTrigger aria-label="수량 열"><SelectValue placeholder="열 선택" /></SelectTrigger><SelectContent><SelectItem value={EMPTY_VALUE}>열 선택</SelectItem>{sampleHeaders.map((header) => <SelectItem key={header} value={header}>{header}</SelectItem>)}</SelectContent></Select></label></div> : null}
        </div>
      </Modal>
    </div>
  )
}

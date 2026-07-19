'use server'

import * as XLSX from 'xlsx'
import { revalidatePath } from 'next/cache'
import { getSupabaseWithUser } from '../db'
import { getActiveInboundTemplates, getInboundTemplateVersion, getInboundTemplates } from '../data'
import { parseInboundTemplateWorksheet } from '../inbound-import'
import { suggestExactSupplierSkuLinks } from '../supplier-sku'
import { normalizeExternalShipmentNumber, sha256OriginalBytes } from '../inbound-import-review'
import { classifyInboundReviewRows } from '../inbound-import-review'

export type InboundTemplateSample = { sheets: Array<{ name: string; rows: string[][] }> }

/** Client-callable boundary for the supplier → template ordering rule: templates are scoped to the selected 입고처. */
export async function getActiveInboundTemplatesForSupplier(supplierId: number) {
  return getActiveInboundTemplates(supplierId)
}

/** Client-callable boundary for the 입고처 상세 modal's template history (includes inactive templates). */
export async function getInboundTemplatesForSupplier(supplierId: number) {
  return getInboundTemplates(supplierId)
}

/** Reads only enough sample structure for an operator to map a new template version. */
export async function inspectInboundTemplateSample(file: File): Promise<InboundTemplateSample> {
  if (!file) throw new Error('샘플 파일을 선택해주세요.')
  const workbook = XLSX.read(Buffer.from(await file.arrayBuffer()), { type: 'buffer' })
  return {
    sheets: workbook.SheetNames.map((name) => ({
      name,
      rows: XLSX.utils.sheet_to_json<unknown[]>(workbook.Sheets[name], { header: 1, defval: '' }).slice(0, 25).map((row) => row.map((cell) => String(cell))),
    })),
  }
}

/** A changed mapping always becomes a new immutable version. A new template is always owned by exactly one 입고처(supplier). */
export async function createInboundTemplateVersion(input: {
  name: string
  templateId?: number
  supplierId?: number
  sheetName: string
  headerRowNumber: number
  headers: string[]
  mappings: { externalSku: string; quantity: string; source?: Record<string, string> }
}) {
  if (!input.name.trim() || !input.sheetName || !input.headerRowNumber || !input.headers.length || !input.mappings.externalSku || !input.mappings.quantity) {
    throw new Error('템플릿 이름, 시트, 헤더 행, 외부 SKU와 수량 열을 입력해주세요.')
  }
  const { supabase, user } = await getSupabaseWithUser()
  let templateId = input.templateId
  if (!templateId) {
    if (!input.supplierId) throw new Error('입고처를 먼저 선택해주세요.')
    const { data, error } = await supabase.from('inbound_templates').insert({ user_id: user.id, supplier_id: input.supplierId, name: input.name.trim() }).select('id, name').single()
    if (error || !data) throw new Error(error?.message ?? '입고 템플릿을 만들지 못했습니다.')
    templateId = Number(data.id)
  }
  const { data: versions, error: versionsError } = await supabase.from('inbound_template_versions').select('version_number').eq('template_id', templateId)
  if (versionsError) throw new Error(versionsError.message)
  const versionNumber = Math.max(0, ...(versions ?? []).map((version) => Number(version.version_number))) + 1
  const { data: version, error: versionError } = await supabase.from('inbound_template_versions').insert({
    user_id: user.id, template_id: templateId, version_number: versionNumber, sheet_name: input.sheetName, header_row_number: input.headerRowNumber,
    headers: input.headers, mappings: { ...input.mappings, source: input.mappings.source ?? {} },
  }).select('id').single()
  if (versionError || !version) throw new Error(versionError?.message ?? '템플릿 버전을 저장하지 못했습니다.')
  revalidatePath('/inventory')
  revalidatePath('/sourcing/factories')
  return { id: templateId, name: input.name.trim(), versionId: Number(version.id), versionNumber }
}

/** Changes only the authenticated owner's template lifecycle; audit evidence and immutable versions remain intact. */
export async function setInboundTemplateActive(input: { templateId: number; active: boolean }) {
  if (!input.templateId) throw new Error('입고 템플릿을 선택해주세요.')
  const { supabase } = await getSupabaseWithUser()
  const { data, error } = await supabase
    .from('inbound_templates').update({ is_active: input.active })
    .eq('id', input.templateId)
    .select('id, is_active')
    .single()
  if (error || !data) throw new Error(error?.message ?? '입고 템플릿 사용 상태를 변경하지 못했습니다.')
  revalidatePath('/sourcing/factories')
  revalidatePath('/inventory')
  revalidatePath('/sourcing/arrivals')
  return { id: Number(data.id), active: Boolean(data.is_active) }
}

export type InboundFilePreview = {
  supplierId: number
  warehouseId?: number
  templateId: number
  templateVersionId: number
  sheetName: string
  headerRowNumber: number
  headers: string[]
  fileHash: string
  rows: Array<{ sourceRowNumber: number; externalSku: string; rawQuantity: string; quantity: number | null; validationError: string | null; productVariantId: number | null; sourceValues: Record<string, string> }>
}

export type ResumableInboundReview = {
  id: number
  supplierName: string
  shipmentNumber: string
  filename: string | null
  createdAt: string
  rowCount: number
  blockerCount: number
}

export type InboundReviewRevision = Omit<InboundFilePreview, 'rows'> & {
  revisionId: number
  shipmentNumber: string
  rows: Array<InboundFilePreview['rows'][number] & { sourceRowId: number }>
}

function isMissingInboundSchema(message: string) {
  return message.includes('does not exist') || message.includes('schema cache')
}

/** Lists the latest saved evidence revisions that have not been promoted yet. */
export async function listResumableInboundReviews(): Promise<ResumableInboundReview[]> {
  const { supabase } = await getSupabaseWithUser()
  const { data: revisions, error: revisionError } = await supabase
    .from('inbound_import_revisions')
    .select('id,inbound_import_id,revision_number,source_filename,created_at')
    .order('created_at', { ascending: false })
  if (revisionError) {
    if (isMissingInboundSchema(revisionError.message)) return []
    throw new Error(revisionError.message)
  }
  const latest = new Map<number, (typeof revisions)[number]>()
  for (const revision of revisions ?? []) {
    const importId = Number(revision.inbound_import_id)
    if (!latest.has(importId)) latest.set(importId, revision)
  }
  const latestRevisions = [...latest.values()]
  if (!latestRevisions.length) return []
  const revisionIds = latestRevisions.map((revision) => Number(revision.id))
  const importIds = latestRevisions.map((revision) => Number(revision.inbound_import_id))
  const [{ data: promoted, error: promotedError }, { data: imports, error: importError }, { data: rows, error: rowError }] = await Promise.all([
    supabase.from('factory_arrivals').select('import_revision_id').in('import_revision_id', revisionIds),
    supabase.from('inbound_imports').select('id,supplier_id,external_shipment_number').in('id', importIds),
    supabase.from('inbound_import_source_rows').select('inbound_import_revision_id,validation_error,quantity,product_variant_id').in('inbound_import_revision_id', revisionIds),
  ])
  const firstError = promotedError ?? importError ?? rowError
  if (firstError) throw new Error(firstError.message)
  const supplierIds = [...new Set((imports ?? []).map((item) => Number(item.supplier_id)))]
  const { data: suppliers, error: supplierError } = supplierIds.length
    ? await supabase.from('factories').select('id,name').in('id', supplierIds)
    : { data: [], error: null }
  if (supplierError) throw new Error(supplierError.message)
  const promotedIds = new Set((promoted ?? []).map((arrival) => Number(arrival.import_revision_id)))
  const importById = new Map((imports ?? []).map((item) => [Number(item.id), item]))
  const supplierById = new Map((suppliers ?? []).map((item) => [Number(item.id), String(item.name)]))
  return latestRevisions.filter((revision) => !promotedIds.has(Number(revision.id))).map((revision) => {
    const relatedRows = (rows ?? []).filter((row) => Number(row.inbound_import_revision_id) === Number(revision.id))
    const inboundImport = importById.get(Number(revision.inbound_import_id))
    return {
      id: Number(revision.id),
      supplierName: supplierById.get(Number(inboundImport?.supplier_id)) ?? '공급자',
      shipmentNumber: String(inboundImport?.external_shipment_number ?? ''),
      filename: revision.source_filename ? String(revision.source_filename) : null,
      createdAt: String(revision.created_at),
      rowCount: relatedRows.length,
      blockerCount: relatedRows.filter((row) => row.validation_error || !row.product_variant_id || !Number.isInteger(Number(row.quantity)) || Number(row.quantity) <= 0).length,
    }
  })
}

/** Reloads immutable source evidence in its persisted ordinal order for review. */
export async function loadInboundReviewRevision(revisionId: number): Promise<InboundReviewRevision> {
  if (!revisionId) throw new Error('이어서 검토할 개정을 선택해주세요.')
  const { supabase } = await getSupabaseWithUser()
  const { data: revision, error: revisionError } = await supabase
    .from('inbound_import_revisions')
    .select('id,inbound_import_id,template_id,template_version_id,source_sheet_name,source_header_row_number,source_headers,source_file_hash')
    .eq('id', revisionId)
    .single()
  if (revisionError || !revision) throw new Error(revisionError?.message ?? '입고 개정을 찾지 못했습니다.')
  const [{ data: inboundImport, error: importError }, { data: rows, error: rowError }] = await Promise.all([
    supabase.from('inbound_imports').select('supplier_id,external_shipment_number').eq('id', revision.inbound_import_id).single(),
    supabase.from('inbound_import_source_rows').select('id,source_row_number,external_sku,raw_quantity,quantity,validation_error,product_variant_id,source_values').eq('inbound_import_revision_id', revisionId).order('source_row_ordinal', { ascending: true }).order('id', { ascending: true }),
  ])
  if (importError || !inboundImport || rowError) throw new Error(importError?.message ?? rowError?.message ?? '입고 검토 증빙을 불러오지 못했습니다.')
  return {
    revisionId: Number(revision.id),
    supplierId: Number(inboundImport.supplier_id),
    shipmentNumber: String(inboundImport.external_shipment_number),
    templateId: Number(revision.template_id),
    templateVersionId: Number(revision.template_version_id),
    sheetName: String(revision.source_sheet_name ?? ''),
    headerRowNumber: Number(revision.source_header_row_number ?? 0),
    headers: Array.isArray(revision.source_headers) ? revision.source_headers.map(String) : [],
    fileHash: String(revision.source_file_hash ?? ''),
    rows: (rows ?? []).map((row) => ({
      sourceRowId: Number(row.id),
      sourceRowNumber: Number(row.source_row_number),
      externalSku: String(row.external_sku ?? ''),
      rawQuantity: String(row.raw_quantity ?? row.quantity ?? ''),
      quantity: row.quantity === null ? null : Number(row.quantity),
      validationError: row.validation_error ? String(row.validation_error) : null,
      productVariantId: row.product_variant_id === null ? null : Number(row.product_variant_id),
      sourceValues: (row.source_values && typeof row.source_values === 'object' ? row.source_values : {}) as Record<string, string>,
    })),
  }
}

/**
 * Server-only inspection boundary. This deliberately has no storage, draft,
 * inventory, or SKU-master mutation.
 */
export async function previewInboundTemplateFile(input: { supplierId: number; templateVersionId: number; file: File }): Promise<InboundFilePreview> {
  if (!input.supplierId || !input.templateVersionId || !input.file) throw new Error('공급자, 템플릿, 파일을 선택해주세요.')
  const template = await getInboundTemplateVersion(input.templateVersionId)
  if (!template.active) throw new Error('비활성 템플릿은 새 입고에 사용할 수 없습니다.')
  const bytes = Buffer.from(await input.file.arrayBuffer())
  const workbook = XLSX.read(bytes, { type: 'buffer' })
  const worksheet = workbook.Sheets[template.sheetName]
  if (!worksheet) throw new Error('선택한 템플릿의 시트가 일치하지 않습니다.')
  const values = XLSX.utils.sheet_to_json<unknown[]>(worksheet, { header: 1, defval: '' })
  const parsed = parseInboundTemplateWorksheet(template, template.sheetName, values)
  const { supabase } = await getSupabaseWithUser()
  const { data: links, error } = await supabase
    .from('supplier_sku_links')
    .select('normalized_external_sku, product_variant_id')
    .eq('supplier_id', input.supplierId)
    .eq('is_active', true)
  if (error) throw new Error(error.message)
  const linkMap = new Map((links ?? []).map((link) => [`${input.supplierId}:${link.normalized_external_sku}`, Number(link.product_variant_id)]))
  return {
    supplierId: input.supplierId,
    templateId: template.templateId,
    templateVersionId: input.templateVersionId,
    sheetName: parsed.sheetName,
    headerRowNumber: parsed.headerRowNumber,
    headers: parsed.headers,
    fileHash: await sha256OriginalBytes(bytes),
    rows: suggestExactSupplierSkuLinks(parsed.rows, linkMap, input.supplierId),
  }
}

/** Explicit persistence boundary for reviewed preview rows and optional file audit. */
export async function saveInboundTemplateDraft(input: {
  preview: InboundFilePreview
  rows: InboundFilePreview['rows']
  file?: File
  shipmentNumber: string
}) {
  if (!input.rows.length) throw new Error('저장할 입고 행이 없습니다.')
  // Source evidence is intentionally persisted even when mapping/quantity review is
  // incomplete. Promotion remains the separate trusted blocker.
  const shipmentNumber = normalizeExternalShipmentNumber(input.shipmentNumber)
  if (!shipmentNumber) throw new Error('외부 출고/참조 번호를 입력해주세요.')
  const { supabase, user } = await getSupabaseWithUser()
  let source: { storagePath: string; filename: string; fileHash: string; sheetName: string; headerRowNumber: number; headers: string[] } | undefined
  if (input.file) {
    const bytes = Buffer.from(await input.file.arrayBuffer())
    const hash = await sha256OriginalBytes(bytes)
    const storagePath = `${user.id}/${hash}-${input.file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`
    const { error } = await supabase.storage.from('inbound-source-files').upload(storagePath, bytes, { contentType: input.file.type || 'application/octet-stream', upsert: false })
    if (error) throw new Error(error.message)
    source = { storagePath, filename: input.file.name, fileHash: hash, sheetName: input.preview.sheetName, headerRowNumber: input.preview.headerRowNumber, headers: input.preview.headers }
  }
  try {
    const { data, error } = await supabase.rpc('register_inbound_import_revision', {
      p_supplier_id: input.preview.supplierId,
      p_external_shipment_number: shipmentNumber,
      p_source_type: source ? 'FILE' : 'MANUAL',
      p_source_filename: source?.filename ?? null,
      p_source_storage_path: source?.storagePath ?? null,
      p_source_file_hash: source?.fileHash ?? null,
      p_template_id: input.preview.templateId,
      p_template_version_id: input.preview.templateVersionId,
      p_sheet_name: input.preview.sheetName || null,
      p_header_row_number: input.preview.headerRowNumber || null,
      p_headers: input.preview.headers,
      // Evidence values are parser output. In particular, never rebuild the raw
      // cell from a parsed number (001, 1,000 and invalid cells are material).
      p_rows: input.rows.map((row) => {
        const { productVariantId, ...evidenceRow } = row
        void productVariantId
        return evidenceRow
      }),
    })
    if (error || !data?.[0]) throw new Error(error?.message ?? '입고 증빙을 저장하지 못했습니다.')
    const id = Number(data[0].revision_id)
    revalidatePath('/sourcing/arrivals')
    revalidatePath('/inventory')
    const review = classifyInboundReviewRows(input.rows)
    return { success: true, id, importId: Number(data[0].inbound_import_id), proposedRevision: Boolean(data[0].proposed_revision), saved: input.rows.length, invalid: input.rows.filter((row) => row.validationError).length, blockers: review.blockers }
  } catch (error) {
    if (source) await supabase.storage.from('inbound-source-files').remove([source.storagePath])
    throw error
  }
}

/** Explicit second stage: evidence remains non-incoming until this RPC succeeds. */
export async function promoteInboundImportRevision(input: { revisionId: number; defaultWarehouseId: number }) {
  const { supabase } = await getSupabaseWithUser()
  const { data, error } = await supabase.rpc('promote_inbound_import_revision', { p_revision_id: input.revisionId, p_default_warehouse_id: input.defaultWarehouseId })
  if (error || !data) throw new Error(error?.message ?? '입고 예정으로 전환하지 못했습니다.')
  revalidatePath('/sourcing/arrivals')
  revalidatePath('/inventory')
  return Number(data)
}

/** @deprecated The registration UI is migrated in the following phase step. */
export async function importBuiltInInboundFile(input: { supplierId: number; warehouseId: number; preset: string; file: File }) {
  void input
  throw new Error('파일 입고는 미리보기 후 초안 저장으로 진행해주세요.')
}

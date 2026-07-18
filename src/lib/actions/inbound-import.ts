'use server'

import * as XLSX from 'xlsx'
import { revalidatePath } from 'next/cache'
import { getSupabaseWithUser } from '../db'
import { getInboundTemplateVersion } from '../data'
import { parseInboundTemplateWorksheet } from '../inbound-import'
import { suggestExactSupplierSkuLinks } from '../supplier-sku'
import { normalizeExternalShipmentNumber, sha256OriginalBytes } from '../inbound-import-review'
import { classifyInboundReviewRows } from '../inbound-import-review'

export type InboundTemplateSample = { sheets: Array<{ name: string; rows: string[][] }> }

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

/** A changed mapping always becomes a new immutable version. */
export async function createInboundTemplateVersion(input: {
  name: string
  templateId?: number
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
    const { data, error } = await supabase.from('inbound_templates').insert({ user_id: user.id, name: input.name.trim() }).select('id, name').single()
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
  return { id: templateId, name: input.name.trim(), versionId: Number(version.id), versionNumber }
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
  if (!classifyInboundReviewRows(input.rows).valid) throw new Error('입고 검토 차단 항목을 먼저 해결해주세요.')
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
        const evidenceRow = { ...row }
        delete evidenceRow.productVariantId
        return evidenceRow
      }),
    })
    if (error || !data?.[0]) throw new Error(error?.message ?? '입고 증빙을 저장하지 못했습니다.')
    const id = Number(data[0].revision_id)
    revalidatePath('/sourcing/arrivals')
    return { success: true, id, importId: Number(data[0].inbound_import_id), proposedRevision: Boolean(data[0].proposed_revision), saved: input.rows.length, invalid: input.rows.filter((row) => row.validationError).length }
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
  return Number(data)
}

/** @deprecated The registration UI is migrated in the following phase step. */
export async function importBuiltInInboundFile(input: { supplierId: number; warehouseId: number; preset: string; file: File }) {
  void input
  throw new Error('파일 입고는 미리보기 후 초안 저장으로 진행해주세요.')
}

'use server'

import { createHash } from 'node:crypto'
import * as XLSX from 'xlsx'
import { revalidatePath } from 'next/cache'
import { getSupabaseWithUser } from '../db'
import { createInboundDraft } from '../data'
import { BUILT_IN_INBOUND_PRESETS, parseInboundWorksheet, suggestExactInboundLinks } from '../inbound-import'

export async function importBuiltInInboundFile(input: { supplierId: number; warehouseId: number; preset: string; file: File }) {
  if (!input.supplierId || !input.warehouseId || !input.file) throw new Error('공급자, 창고, 파일을 선택해주세요.')
  const preset = BUILT_IN_INBOUND_PRESETS.find((item) => item.name === input.preset)
  if (!preset) throw new Error('지원하지 않는 입고 프리셋입니다.')
  const bytes = Buffer.from(await input.file.arrayBuffer())
  const workbook = XLSX.read(bytes, { type: 'buffer' })
  const sheetName = workbook.SheetNames[0]
  if (!sheetName) throw new Error('읽을 수 있는 시트가 없습니다.')
  const values = XLSX.utils.sheet_to_json<unknown[]>(workbook.Sheets[sheetName], { header: 1, defval: '' })
  const parsed = parseInboundWorksheet(preset, values)
  if (!parsed.rows.length) throw new Error('가져올 입고 행이 없습니다.')
  const { supabase, user } = await getSupabaseWithUser()
  const { data: links, error: linksError } = await supabase.from('supplier_sku_links').select('template, external_sku, product_variant_id').eq('supplier_id', input.supplierId).eq('template', preset.name)
  if (linksError) throw new Error(linksError.message)
  const linkMap = new Map((links ?? []).map((link) => [`${input.supplierId}:${link.template}:${link.external_sku}`, Number(link.product_variant_id)]))
  const rows = suggestExactInboundLinks(parsed.rows, linkMap, input.supplierId, preset.name).map((row) => ({ supplierId: input.supplierId, warehouseId: input.warehouseId, template: preset.name, externalSku: row.externalSku, quantity: row.quantity, productVariantId: row.productVariantId, sourceRowNumber: row.sourceRowNumber, sourceValues: row.sourceValues, validationError: row.validationError }))
  const hash = createHash('sha256').update(bytes).digest('hex')
  const storagePath = `${user.id}/${hash}-${input.file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`
  const { error: uploadError } = await supabase.storage.from('inbound-source-files').upload(storagePath, bytes, { contentType: input.file.type || 'application/octet-stream', upsert: false })
  if (uploadError) throw new Error(uploadError.message)
  try {
    const id = await createInboundDraft({ supplierId: input.supplierId, rows, source: { storagePath, filename: input.file.name, fileHash: hash, sheetName, headerRowNumber: parsed.headerRowNumber, headers: parsed.headers } })
    revalidatePath('/sourcing/arrivals')
    return { success: true, id, imported: rows.length, invalid: rows.filter((row) => row.validationError).length }
  } catch (error) {
    await supabase.storage.from('inbound-source-files').remove([storagePath])
    throw error
  }
}

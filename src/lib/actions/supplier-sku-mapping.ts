'use server'

import { revalidatePath } from 'next/cache'
import { getSupabaseWithUser } from '../db'
import { normalizeSupplierExternalSku } from '../supplier-sku'

type MappingInput = { supplierId: number; externalSku: string; productVariantId: number }

export type SupplierSkuMappingRow = {
  id: number
  supplierId: number
  supplierName: string
  externalSku: string
  normalizedExternalSku: string
  productVariantId: number
  isActive: boolean
  deactivatedAt: string | null
  deactivationReason: string | null
  createdAt: string
}

export type SupplierSkuMappingAuditRow = {
  id: number
  supplierId: number
  action: string
  externalSku: string
  previousSellerSku: string | null
  newSellerSku: string | null
  reason: string | null
  createdAt: string
}

function assertInput(input: MappingInput) {
  if (!input.supplierId || !input.productVariantId || !normalizeSupplierExternalSku(input.externalSku)) throw new Error('공급자, 외부 SKU, 내부 SKU를 입력해주세요.')
}
function refresh() { revalidatePath('/products'); revalidatePath('/sourcing/arrivals'); revalidatePath('/inventory') }

export async function lookupSupplierSkuMapping(input: { supplierId: number; externalSku: string }) {
  const normalized = normalizeSupplierExternalSku(input.externalSku)
  if (!input.supplierId || !normalized) return null
  const { supabase } = await getSupabaseWithUser()
  const { data, error } = await supabase.from('supplier_sku_links').select('id, product_variant_id, external_sku, normalized_external_sku').eq('supplier_id', input.supplierId).eq('normalized_external_sku', normalized).eq('is_active', true).maybeSingle()
  if (error) throw new Error(error.message.includes('does not exist') ? '공급자 SKU 매핑 스키마가 아직 적용되지 않았습니다.' : error.message)
  return data ? { id: Number(data.id), productVariantId: Number(data.product_variant_id), externalSku: String(data.external_sku) } : null
}

export async function confirmSupplierSkuMapping(input: MappingInput & { sourceRowIds?: number[] }) {
  assertInput(input)
  const { supabase } = await getSupabaseWithUser()
  const { data, error } = await supabase.rpc('confirm_supplier_sku_mapping', { p_supplier_id: input.supplierId, p_external_sku: input.externalSku, p_product_variant_id: input.productVariantId, p_source_row_ids: input.sourceRowIds ?? [] })
  if (error) throw new Error(error.message)
  refresh(); return { id: Number(data) }
}

export async function reassignSupplierSkuMapping(input: MappingInput & { reason: string }) {
  assertInput(input)
  if (!input.reason.trim()) throw new Error('재지정 사유를 입력해주세요.')
  const { supabase } = await getSupabaseWithUser()
  const { data, error } = await supabase.rpc('reassign_supplier_sku_mapping', { p_supplier_id: input.supplierId, p_external_sku: input.externalSku, p_product_variant_id: input.productVariantId, p_reason: input.reason })
  if (error) throw new Error(error.message)
  refresh(); return { id: Number(data) }
}

export async function deactivateSupplierSkuMapping(input: { supplierId: number; externalSku: string; reason: string }) {
  if (!input.supplierId || !normalizeSupplierExternalSku(input.externalSku) || !input.reason.trim()) throw new Error('외부 SKU와 비활성화 사유를 입력해주세요.')
  const { supabase } = await getSupabaseWithUser()
  const { error } = await supabase.rpc('deactivate_supplier_sku_mapping', { p_supplier_id: input.supplierId, p_external_sku: input.externalSku, p_reason: input.reason })
  if (error) throw new Error(error.message)
  refresh()
}

export async function getSupplierSkuMappingAudit(supplierId: number) {
  if (!supplierId) return []
  const { supabase } = await getSupabaseWithUser()
  const { data, error } = await supabase.from('supplier_sku_mapping_audits').select('id, action, raw_external_sku, normalized_external_sku, previous_seller_sku_snapshot, new_seller_sku_snapshot, reason, created_at').eq('supplier_id', supplierId).order('created_at', { ascending: false })
  if (error) throw new Error(error.message)
  return data ?? []
}

/** Product-management read model for active mappings, inactive history, and immutable audits. */
export async function getSupplierSkuMappingWorkspace(): Promise<{ mappings: SupplierSkuMappingRow[]; audits: SupplierSkuMappingAuditRow[] }> {
  const { supabase } = await getSupabaseWithUser()
  const [{ data: links, error: linksError }, { data: audits, error: auditsError }] = await Promise.all([
    supabase.from('supplier_sku_links').select('id,supplier_id,external_sku,normalized_external_sku,product_variant_id,is_active,deactivated_at,deactivation_reason,received_at').order('received_at', { ascending: false }),
    supabase.from('supplier_sku_mapping_audits').select('id,supplier_id,action,raw_external_sku,previous_seller_sku_snapshot,new_seller_sku_snapshot,reason,created_at').order('created_at', { ascending: false }).limit(200),
  ])
  const firstError = linksError ?? auditsError
  if (firstError) {
    if (firstError.message.includes('does not exist') || firstError.message.includes('schema cache')) return { mappings: [], audits: [] }
    throw new Error(firstError.message)
  }
  const supplierIds = [...new Set((links ?? []).map((link) => Number(link.supplier_id)))]
  const { data: suppliers, error: suppliersError } = supplierIds.length
    ? await supabase.from('factories').select('id,name').in('id', supplierIds)
    : { data: [], error: null }
  if (suppliersError) throw new Error(suppliersError.message)
  const names = new Map((suppliers ?? []).map((supplier) => [Number(supplier.id), String(supplier.name)]))
  return {
    mappings: (links ?? []).map((link) => ({
      id: Number(link.id), supplierId: Number(link.supplier_id), supplierName: names.get(Number(link.supplier_id)) ?? '공급자',
      externalSku: String(link.external_sku), normalizedExternalSku: String(link.normalized_external_sku), productVariantId: Number(link.product_variant_id),
      isActive: Boolean(link.is_active), deactivatedAt: link.deactivated_at ? String(link.deactivated_at) : null,
      deactivationReason: link.deactivation_reason ? String(link.deactivation_reason) : null, createdAt: String(link.received_at),
    })),
    audits: (audits ?? []).map((audit) => ({
      id: Number(audit.id), supplierId: Number(audit.supplier_id), action: String(audit.action), externalSku: String(audit.raw_external_sku),
      previousSellerSku: audit.previous_seller_sku_snapshot ? String(audit.previous_seller_sku_snapshot) : null,
      newSellerSku: audit.new_seller_sku_snapshot ? String(audit.new_seller_sku_snapshot) : null,
      reason: audit.reason ? String(audit.reason) : null, createdAt: String(audit.created_at),
    })),
  }
}

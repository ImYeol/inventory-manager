import { describe, expect, it } from 'vitest'
import { inboundSupplierSkuKey, validateInboundDraftRows } from '@/lib/inbound'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

describe('manual inbound drafts', () => {
  it('only considers a supplier SKU link exact when supplier and external SKU match', () => {
    expect(inboundSupplierSkuKey({ supplierId: 4, template: 'summer-26', externalSku: 'EXT-001' })).toBe('4:EXT-001')
    expect(inboundSupplierSkuKey({ supplierId: 4, template: 'summer-26', externalSku: 'EXT-001' }))
      .not.toBe(inboundSupplierSkuKey({ supplierId: 4, template: 'summer-26', externalSku: 'EXT-001-M' }))
  })

  it('requires an inspected internal SKU, quantity, and warehouse before a row is incoming or receivable', () => {
    expect(validateInboundDraftRows([
      { supplierId: 4, template: 'summer-26', externalSku: 'EXT-001', quantity: 3, warehouseId: 2, productVariantId: 9 },
    ])).toEqual([])
    expect(validateInboundDraftRows([
      { supplierId: 4, template: 'summer-26', externalSku: 'EXT-001', quantity: 3, warehouseId: 2, productVariantId: null },
    ])).toEqual(['1행: 내부 SKU를 검수·지정해주세요.'])
  })

  it('keeps unmatched rows out of receipt without receipt-time mapping writes', () => {
    const schema = readFileSync(resolve(process.cwd(), 'supabase/schema.sql'), 'utf8')
    const receiptRpc = schema.slice(schema.lastIndexOf('create or replace function public.receive_inbound_draft_rows'))
    expect(schema).toContain('create table if not exists public.inbound_drafts')
    expect(schema).toContain('create table if not exists public.supplier_sku_links')
    expect(schema).toContain("raise exception 'Unmatched inbound rows cannot be received.'")
    expect(receiptRpc).not.toContain('insert into public.supplier_sku_links')
    expect(receiptRpc).toContain('insert into public.inventory_sync_outbox')
  })
})

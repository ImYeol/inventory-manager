import { describe, expect, it } from 'vitest'
import { normalizeSupplierExternalSku, supplierSkuKey, suggestExactSupplierSkuLinks } from '@/lib/supplier-sku'
import fs from 'node:fs'
import path from 'node:path'

describe('supplier SKU mapping', () => {
  it('trims Unicode edge whitespace only', () => {
    expect(normalizeSupplierExternalSku('\u00a0  001-A / Blue\u3000')).toBe('001-A / Blue')
    expect(normalizeSupplierExternalSku('00 Ab\t-01')).toBe('00 Ab\t-01')
    expect(normalizeSupplierExternalSku('ab-01')).not.toBe(normalizeSupplierExternalSku('AB-01'))
  })

  it('uses supplier identity only and auto-applies only exact active keys', () => {
    expect(supplierSkuKey(4, ' 001-A ')).toBe('4:001-A')
    expect(supplierSkuKey(4, '001-A')).not.toBe(supplierSkuKey(5, '001-A'))
    expect(suggestExactSupplierSkuLinks([{ externalSku: ' 001-A ', productVariantId: null }], new Map([['4:001-A', 9]]), 4)[0].productVariantId).toBe(9)
    expect(suggestExactSupplierSkuLinks([{ externalSku: '001-a', productVariantId: null }], new Map([['4:001-A', 9]]), 4)[0].productVariantId).toBeNull()
  })

  it('keeps mapping writes out of receipt code and makes audit evidence immutable', () => {
    const root = process.cwd()
    const schema = fs.readFileSync(path.join(root, 'supabase/schema.sql'), 'utf8')
    const receipt = fs.readFileSync(path.join(root, 'supabase/migrations/20260718190437_canonical_arrival_schema_and_legacy_migration.sql'), 'utf8')
    expect(schema).toContain('public.supplier_sku_mapping_audits')
    expect(schema).toContain('confirm_supplier_sku_mapping')
    expect(schema).toContain('reject_supplier_sku_mapping_audit_mutation')
    expect(receipt).not.toContain('insert into public.supplier_sku_links')
  })
})

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

  it('hardens the installed mapping migration and the real compatibility RPC', () => {
    const root = process.cwd()
    const migration = fs.readFileSync(path.join(root, 'supabase/migrations/20260719053000_supplier_sku_mapping_and_audit.sql'), 'utf8')
    const schema = fs.readFileSync(path.join(root, 'supabase/schema.sql'), 'utf8')
    const runner = fs.readFileSync(path.join(root, 'scripts/test-inbound-canonical-behavior.ts'), 'utf8')

    for (const sql of [migration, schema]) {
      expect(sql.toLowerCase()).toContain('legacy template mappings conflict')
      expect(sql).toContain('supplier_sku_links_one_active_exact_idx')
      expect(sql).toContain('duplicate source row IDs')
      expect(sql).toContain('Source rows do not match this exact supplier SKU mapping')
      expect(sql).toContain('revoke all on function public.confirm_supplier_sku_mapping')
      expect(sql).toContain('create or replace function public.receive_inbound_draft_rows')
      expect(sql).not.toContain("begin raise exception 'Apply forward supplier SKU mapping migration.'; end")
    }
    expect(migration.indexOf('with conflicts as')).toBeLessThan(migration.lastIndexOf('create unique index supplier_sku_links_one_active_exact_idx'))
    expect(runner).toContain('20260719053000_supplier_sku_mapping_and_audit.sql')
  })
})

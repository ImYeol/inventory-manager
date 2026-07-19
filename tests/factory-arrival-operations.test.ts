import { describe, expect, it } from 'vitest'
import { assertAllocationSplit, receiptPayloadHash } from '@/lib/factory-arrival'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

describe('factory arrival operation contracts', () => {
  it('requires a complete, positive, duplicate-free allocation split', async () => {
    expect(() => assertAllocationSplit(30, [{ warehouseId: 1, quantity: 20 }, { warehouseId: 2, quantity: 10 }])).not.toThrow()
    expect(() => assertAllocationSplit(30, [{ warehouseId: 1, quantity: 20 }, { warehouseId: 1, quantity: 10 }])).toThrow('중복')
    expect(() => assertAllocationSplit(30, [{ warehouseId: 1, quantity: 20 }, { warehouseId: 2, quantity: 9 }])).toThrow('일치')
    expect(() => assertAllocationSplit(30, [{ warehouseId: 1, quantity: 0 }, { warehouseId: 2, quantity: 30 }])).toThrow('양수')
  })

  it('hashes an immutable receipt request payload deterministically', async () => {
    const payload = { arrivalId: 9, receiptRequestId: 'r-1', lines: [{ allocationId: 2, quantity: 3, overageQuantity: 0 }] }
    await expect(receiptPayloadHash(payload)).resolves.toBe(await receiptPayloadHash(payload))
    await expect(receiptPayloadHash({ ...payload, lines: [{ allocationId: 2, quantity: 4, overageQuantity: 0 }] })).resolves.not.toBe(await receiptPayloadHash(payload))
  })

  it('ships executable follow-up and correction RPCs in migration and fresh schema', () => {
    const migration = readFileSync(resolve(process.cwd(), 'supabase/migrations/20260719080000_allocation_partial_receipt_variance_correction.sql'), 'utf8')
    const schema = readFileSync(resolve(process.cwd(), 'supabase/schema.sql'), 'utf8')
    for (const sql of [migration, schema]) {
      expect(sql).toContain('create or replace function public.record_factory_arrival_follow_up')
      expect(sql).toContain('create or replace function public.reverse_factory_receipt_line')
      expect(sql).not.toContain("raise exception 'Follow-up receipt requires")
      expect(sql).not.toContain("raise exception 'Receipt correction requires")
      expect(sql).toContain('factory_arrival_shortage_closure_id')
      expect(sql).toContain('immutable_payload')
    }
  })

  it('keeps business date and allocation reasons in the trusted operation contract', () => {
    const migration = readFileSync(resolve(process.cwd(), 'supabase/migrations/20260719120000_inbound_domain_contract_gap_closure.sql'), 'utf8')
    expect(migration).toContain('receipt_business_date')
    expect(migration).toContain('factory_arrival_allocation_audits')
    expect(migration).toContain("btrim(coalesce(p_payload->>'reason',''))=''" )
    expect(migration).toContain('move_factory_arrival_remainders_to_warehouse')
  })
})

import { describe, expect, it } from 'vitest'
import { assertAllocationSplit, koreaLocalDate, receiptPayloadHash } from '@/lib/factory-arrival'
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

  it('treats the business receipt date as part of the idempotency payload', async () => {
    const payload = { arrivalId: 9, receiptRequestId: 'r-1', receiptBusinessDate: '2026-07-19', lines: [{ allocationId: 2, quantity: 3, overageQuantity: 0 }] }
    await expect(receiptPayloadHash(payload)).resolves.not.toBe(await receiptPayloadHash({ ...payload, receiptBusinessDate: '2026-07-20' }))
    expect(koreaLocalDate(new Date('2026-07-18T15:30:00.000Z'))).toBe('2026-07-19')
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
    const schema = readFileSync(resolve(process.cwd(), 'supabase/schema.sql'), 'utf8')

    for (const sql of [migration, schema]) {
      expect(sql).toContain('create or replace function public.receive_factory_arrival_request')
      expect(sql).toContain('create or replace function public.record_factory_arrival_follow_up')
      expect(sql).toContain("'receipt_business_date',business_date")
      expect(sql).toContain("values(u,business_date")
      expect(sql).toContain('factory_arrival_allocation_audits')
      expect(sql).toContain("btrim(coalesce(p_payload->>'reason',''))=''" )
      expect(sql).toContain('before_allocations,after_allocations,reason,actor_id')
      expect(sql).toContain('create or replace function public.move_factory_arrival_remainders_to_warehouse')
    }
    expect(migration).toContain('Registration deliberately preserves an incomplete review')
    expect(schema).toContain("raise exception 'Import review blockers must be resolved before promotion.'")
  })

  it('preserves fixed allocation quantities while moving only the movable remainder', () => {
    const migration = readFileSync(resolve(process.cwd(), 'supabase/migrations/20260719120000_inbound_domain_contract_gap_closure.sql'), 'utf8')
    const schema = readFileSync(resolve(process.cwd(), 'supabase/schema.sql'), 'utf8')

    for (const sql of [migration, schema]) {
      expect(sql).toContain('target_fixed+movable')
      expect(sql).toContain('normally_received_quantity+shortage_closed_quantity')
      expect(sql).toContain("status in('RECEIVED','VARIANCE_CLOSED','CANCELLED')")
      expect(sql).toContain("raise exception 'Allocation sum invariant failed.'")
      expect(sql).toContain('order by id for update')
    }
  })

  it('records follow-up goods in a closure-linked child arrival instead of inflating the parent', () => {
    const migration = readFileSync(resolve(process.cwd(), 'supabase/migrations/20260719120000_inbound_domain_contract_gap_closure.sql'), 'utf8')
    const schema = readFileSync(resolve(process.cwd(), 'supabase/schema.sql'), 'utf8')

    for (const sql of [migration, schema]) {
      expect(sql).toContain('follow_up_parent_arrival_id')
      expect(sql).toContain("'FOLLOW_UP'")
      expect(sql).toContain('factory_arrival_shortage_closure_id')
      expect(sql).toContain('normal_quantity,overage_quantity')
      expect(sql).toContain('q,0,null')
      expect(sql).toContain("'child_arrival_id',child_arrival_id")
      expect(sql).toContain('coalesce(sum(linked_child.child_expected),0)')
      expect(sql).toContain('receipt_arrival.follow_up_parent_arrival_id is distinct from closure_allocation.factory_arrival_id')
    }
  })

  it('makes allocation audit evidence owner-safe, immutable, and indexed', () => {
    const migration = readFileSync(resolve(process.cwd(), 'supabase/migrations/20260719120000_inbound_domain_contract_gap_closure.sql'), 'utf8')
    expect(migration).toContain('foreign key (factory_arrival_id,user_id)')
    expect(migration).toContain('foreign key (factory_arrival_item_id,user_id)')
    expect(migration).toContain('factory_allocation_audits_arrival_idx')
    expect(migration).toContain('factory_allocation_audits_item_idx')
    expect(migration).toContain('factory_allocation_audits_immutable')
    expect(migration).toContain('revoke insert,update,delete on public.factory_arrival_allocation_audits from authenticated')
  })

  it('backfills fresh-schema business dates and skips unchanged allocation mutations', () => {
    const migration = readFileSync(resolve(process.cwd(), 'supabase/migrations/20260719120000_inbound_domain_contract_gap_closure.sql'), 'utf8')
    const schema = readFileSync(resolve(process.cwd(), 'supabase/schema.sql'), 'utf8')
    for (const sql of [migration, schema]) {
      expect(sql).toContain('update public.factory_receipt_events set receipt_business_date=received_at::date where receipt_business_date is null')
      expect(sql).toContain('alter table public.factory_receipt_events alter column receipt_business_date set not null')
      expect(sql).toContain("'unchanged',true")
    }
  })

  it('raises stable operation scopes for receipt allocation and follow-up closure failures', () => {
    const migration = readFileSync(resolve(process.cwd(), 'supabase/migrations/20260719120000_inbound_domain_contract_gap_closure.sql'), 'utf8')
    const schema = readFileSync(resolve(process.cwd(), 'supabase/schema.sql'), 'utf8')
    for (const sql of [migration, schema]) {
      expect(sql).toContain("operation_error:allocation:%:Invalid receipt line.")
      expect(sql).toContain("operation_error:allocation:%:Duplicate receipt allocation.")
      expect(sql).toContain("operation_error:closure:%:Follow-up exceeds closed shortage.")
      expect(sql).toContain("operation_error:closure:%:Shortage closure not found.")
    }
  })

  it('keeps move-all retries identity-stable and prevents duplicate children while a corrected follow-up is open', () => {
    const migration = readFileSync(resolve(process.cwd(), 'supabase/migrations/20260719120000_inbound_domain_contract_gap_closure.sql'), 'utf8')
    const schema = readFileSync(resolve(process.cwd(), 'supabase/schema.sql'), 'utf8')
    for (const sql of [migration, schema]) {
      expect(sql).toContain("'changed_item_count',0,'unchanged',true")
      expect(sql).toContain('has_open_child')
      expect(sql).toContain("operation_error:closure:%:Follow-up child is still open.")
      expect(sql).toContain('sum(child_item.ordered_quantity)')
      expect(sql).not.toContain('not exists(select 1 from public.factory_receipt_line_corrections correction where correction.user_id=l.user_id and correction.factory_receipt_line_id=l.id)')
    }
  })
})

import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

function compact(text: string) {
  return text.replace(/\s+/g, ' ').trim().toLowerCase()
}

describe('commerce schema invariants', () => {
  const root = process.cwd()
  const schema = compact(fs.readFileSync(path.join(root, 'supabase/schema.sql'), 'utf8'))
  const prisma = compact(fs.readFileSync(path.join(root, 'prisma/schema.prisma'), 'utf8'))

  it('models variants, channel references, orders, reservations, fulfillment, and tracking imports', () => {
    for (const table of [
      'product_variants',
      'channel_product_refs',
      'channel_orders',
      'channel_order_lines',
      'inventory_reservations',
      'order_fulfillments',
      'tracking_import_templates',
      'tracking_import_batches',
    ]) {
      expect(schema).toContain(`create table if not exists public.${table}`)
    }

    expect(prisma).toMatch(/model productvariant\b/)
    expect(prisma).toMatch(/model channelproductref\b/)
    expect(prisma).toMatch(/model channelorder\b/)
    expect(prisma).toMatch(/model inventoryreservation\b/)
    expect(prisma).toMatch(/model orderfulfillment\b/)
    expect(schema).toMatch(/product_variants[\s\S]*seller_sku text not null/)
    expect(schema).toMatch(/channel_product_refs[\s\S]*variant_id bigint/)
    expect(schema).toMatch(/channel_product_refs[\s\S]*channel_attributes jsonb not null default '\{\}'::jsonb/)
    expect(schema).toMatch(/channel_product_refs[\s\S]*channel_reported integer/)
    expect(schema).toMatch(/channel_product_refs[\s\S]*last_synced_at timestamptz/)
    expect(schema).toMatch(/channel_product_refs[\s\S]*last_sync_error text/)
  })

  it('keeps each commerce table owner-scoped with RLS and channel-scoped external ids', () => {
    for (const table of [
      'product_variants',
      'channel_product_refs',
      'channel_orders',
      'channel_order_lines',
      'inventory_reservations',
      'order_fulfillments',
      'tracking_import_templates',
      'tracking_import_batches',
    ]) {
      expect(schema).toMatch(new RegExp(`create table if not exists public\\.${table}[\\s\\S]*?user_id uuid not null default auth\\.uid\\(\\)`))
      expect(schema).toContain(`alter table public.${table} enable row level security`)
      expect(schema).toMatch(new RegExp(`create policy "users manage own ${table}"[\\s\\S]*?to authenticated[\\s\\S]*?auth\\.uid\\(\\)\\) = user_id`))
      expect(schema).toContain(`create index if not exists ${table}_user_id_idx on public.${table} (user_id)`)
    }

    expect(schema).toMatch(/unique \(user_id, channel, external_product_id, external_variant_id\)/)
    expect(schema).toMatch(/unique \(user_id, channel, external_order_id\)/)
    expect(schema).toMatch(/unique \(user_id, channel, external_line_id\)/)
    expect(schema).toMatch(/unique \(user_id, idempotency_key\)/)
  })

  it('finalizes only successful external fulfillments once without copying channel snapshots into on-hand inventory', () => {
    expect(schema).toMatch(/create or replace function public\.finalize_order_fulfillment\(p_fulfillment_id bigint\)/)
    expect(schema).toMatch(/security invoker/)
    expect(schema).toMatch(/set search_path = ''/)
    const rpc = schema.slice(schema.indexOf('create or replace function public.finalize_order_fulfillment'))
    expect(rpc.slice(0, rpc.indexOf('$$;') + 3)).not.toContain('security definer')
    expect(schema).toMatch(/for update/)
    expect(schema).toMatch(/v_fulfillment\.external_status <> 'success'/)
    expect(schema).toMatch(/v_fulfillment\.local_status = 'fulfilled'/)
    expect(schema).toMatch(/set quantity = quantity - v_reservation\.quantity/)
    expect(schema).toMatch(/set status = 'released'/)
    expect(schema).toMatch(/'outbound'/)
    expect(schema).not.toMatch(/channel_reported[\s\S]{0,500}public\.inventory\.quantity/)
  })
})

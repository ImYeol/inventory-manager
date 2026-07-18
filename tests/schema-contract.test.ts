import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

function compact(text: string) {
  return text.replace(/\s+/g, ' ').trim()
}

function normalizedSql(text: string) {
  return compact(text).toLowerCase()
}

describe('schema contract', () => {
  it('defines canonical inbound imports, arrivals, allocations, immutable receipt evidence and migration exceptions', () => {
    const root = process.cwd()
    const schema = normalizedSql(fs.readFileSync(path.join(root, 'supabase/schema.sql'), 'utf8'))
    const prisma = normalizedSql(fs.readFileSync(path.join(root, 'prisma/schema.prisma'), 'utf8'))
    const migrations = fs.readdirSync(path.join(root, 'supabase/migrations')).filter((file) => file.includes('canonical_arrival'))
    expect(migrations).toHaveLength(1)
    const migration = normalizedSql(fs.readFileSync(path.join(root, 'supabase/migrations', migrations[0]), 'utf8'))

    for (const table of ['inbound_imports', 'inbound_import_revisions', 'inbound_import_source_rows', 'factory_arrival_allocations', 'factory_receipt_events', 'factory_receipt_lines', 'inbound_migration_exceptions']) {
      expect(schema).toContain(`create table if not exists public.${table}`)
      expect(migration).toContain(`create table public.${table}`)
      expect(migration).toContain(`alter table public.${table} enable row level security`)
      expect(migration).toContain(`own ${table}`)
    }
    expect(schema).toMatch(/factory_arrival_items[\s\S]*product_variant_id bigint/)
    expect(schema).toMatch(/allocated_quantity integer not null/)
    expect(schema).toMatch(/normally_received_quantity integer not null default 0/)
    expect(schema).toMatch(/shortage_closed_quantity integer not null default 0/)
    expect(schema).toMatch(/check \(status in \('draft', 'ready', 'partial', 'received', 'variance_closed', 'cancelled'\)\)/)
    expect(migration).toContain('does not insert transactions')
    expect(migration).toContain('does not update public.inventory')
    expect(migration).toContain('ambiguous_transaction_evidence')
    expect(migration).toContain('on delete restrict')
    expect(migration).toContain('factory_arrival_items_id_user_id_key unique (id, user_id)')
    expect(migration).toContain('transactions_id_user_id_key unique (id, user_id)')
    expect(migration).toContain('unique (inbound_import_source_row_id)')
    expect(migration).toContain('factory_arrival_allocation_matches_item')
    expect(migration).toContain('immutable_canonical_evidence')
    expect(migration).toContain('before update or delete')
    expect(migration).toContain("when 'received' then 'received'")
    expect(migration).toContain("when 'partial' then 'partial'")
    expect(migration).toContain('sync_legacy_inbound_draft_receipt')
    expect(migration).toContain('unallocated_legacy_arrival')
    expect(migration).toContain('unmapped_or_invalid_source_row')
    expect(migration).toContain('factory_arrival_receipt_consistency')
    expect(migration).toContain('legacy_factory_arrival_transaction')
    expect(migration).toContain('over_received_legacy_arrival')
    expect(migration).toContain('create_factory_arrival_with_allocations')
    expect(migration).toContain('grant execute on function public.create_factory_arrival_with_allocations')
    expect(migration).toContain('revoke insert, update, delete on table public.factory_arrival_allocations')
    expect(migration).toContain('revoke insert, update, delete on table public.factory_receipt_events')
    expect(migration).toContain('revoke insert, update, delete on table public.factory_receipt_lines')
    expect(migration).toContain('unique (import_revision_id)')
    expect(migration).toContain('inbound_imports_supplier_id_user_id_fkey')
    expect(prisma).toContain('model inboundimport')
    expect(prisma).toContain('model factoryreceiptevent')
    expect(prisma).toContain('ondelete: restrict')
  })

  it('keeps canonical allocation and receipt writes behind trusted functions', () => {
    const root = process.cwd()
    const migration = normalizedSql(fs.readFileSync(
      path.join(root, 'supabase/migrations/20260718190437_canonical_arrival_schema_and_legacy_migration.sql'),
      'utf8',
    ))

    expect(migration).toContain('create or replace function public.receive_factory_arrival')
    expect(migration).toContain('insert into public.factory_receipt_events')
    expect(migration).toContain('insert into public.factory_receipt_lines')
    expect(migration).toContain('normally_received_quantity = normally_received_quantity + v_quantity')
    expect(migration).toContain("revoke insert, update, delete on table public.factory_arrival_allocations from authenticated")
    expect(migration).toContain('drop policy if exists "users manage own factory_arrival_allocations"')
  })

  it('models verified inbound drafts with exact supplier SKU links only', () => {
    const root = process.cwd()
    const inboundMigration = normalizedSql(fs.readFileSync(
      path.join(root, 'supabase/migrations/20260717153604_inbound_drafts_and_supplier_sku_links.sql'),
      'utf8',
    ))

    expect(inboundMigration).toMatch(/create table if not exists public\.inbound_drafts/)
    expect(inboundMigration).toMatch(/external_sku text not null/)
    expect(inboundMigration).toMatch(/warehouse_id bigint not null/)
    expect(inboundMigration).toMatch(/product_variant_id bigint/)
    expect(inboundMigration).toMatch(/create table if not exists public\.supplier_sku_links/)
    expect(inboundMigration).toMatch(/unique\(user_id,supplier_id,template,external_sku\)/)
    expect(inboundMigration).toMatch(/unmatched inbound rows cannot be received/)
    expect(inboundMigration).not.toMatch(/similarity\s*\(/)
  })

  it('uses warehouse_id across the checked-in schema transition files', () => {
    const root = process.cwd()
    const prismaSchema = normalizedSql(fs.readFileSync(path.join(root, 'prisma/schema.prisma'), 'utf8'))
    const schemaSql = normalizedSql(fs.readFileSync(path.join(root, 'supabase/schema.sql'), 'utf8'))
    const migrationSql = normalizedSql(
      fs.readFileSync(
        path.join(root, 'prisma/migrations/20260413110000_dynamic_warehouses/migration.sql'),
        'utf8',
      ),
    )
    const sourcingMigrationSql = normalizedSql(
      fs.readFileSync(
        path.join(root, 'prisma/migrations/20260419034500_sourcing_schema_and_arrivals/migration.sql'),
        'utf8',
      ),
    )

    expect(prismaSchema).toMatch(/model\s+warehouse\b/)
    expect(prismaSchema).toMatch(/\bwarehouseid\b/)
    expect(prismaSchema).not.toMatch(/\bwarehousevalue\b/)
    expect(schemaSql).toMatch(/create table if not exists public\.warehouses\b/)
    expect(schemaSql).toMatch(/\bwarehouse_id\b.*\bbigint\b/)
    expect(schemaSql).not.toMatch(/\bwarehouse_value\b/)
    expect(migrationSql).toMatch(/create table if not exists public\.warehouses\b/)
    expect(migrationSql).toMatch(/\balter table public\.inventory add column if not exists warehouse_id bigint\b/)
    expect(migrationSql).toMatch(/\balter table public\.transactions add column if not exists warehouse_id bigint\b/)
    expect(migrationSql).toMatch(/\balter table public\.inventory drop column(?: if exists)? warehouse\b/)
    expect(migrationSql).toMatch(/\balter table public\.transactions drop column(?: if exists)? warehouse\b/)
    expect(prismaSchema).toMatch(/model\s+factory\b/)
    expect(prismaSchema).toMatch(/model\s+factoryarrival\b/)
    expect(prismaSchema).toMatch(/model\s+factoryarrivalitem\b/)
    expect(schemaSql).toMatch(/create table if not exists public\.factories\b/)
    expect(schemaSql).toMatch(/create table if not exists public\.factory_arrivals\b/)
    expect(schemaSql).toMatch(/create table if not exists public\.factory_arrival_items\b/)
    expect(sourcingMigrationSql).toMatch(/create table if not exists public\.factories\b/)
    expect(sourcingMigrationSql).toMatch(/create table if not exists public\.factory_arrivals\b/)
    expect(sourcingMigrationSql).toMatch(/create table if not exists public\.factory_arrival_items\b/)
  })
})

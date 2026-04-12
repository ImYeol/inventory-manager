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
  it('uses warehouse_id across the checked-in schema transition files', () => {
    const root = '/Users/yeol-mac/Development/seleccase-inventory'
    const prismaSchema = normalizedSql(fs.readFileSync(path.join(root, 'prisma/schema.prisma'), 'utf8'))
    const schemaSql = normalizedSql(fs.readFileSync(path.join(root, 'supabase/schema.sql'), 'utf8'))
    const migrationSql = normalizedSql(
      fs.readFileSync(
        path.join(root, 'prisma/migrations/20260413110000_dynamic_warehouses/migration.sql'),
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
  })
})

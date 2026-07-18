/**
 * Runs only against a pre-canonical disposable database.  It deliberately
 * refuses normal development/production-looking targets because it creates
 * legacy evidence before applying the forward migration.
 */
import { execFileSync } from 'node:child_process'
import { existsSync } from 'node:fs'
import path from 'node:path'

const databaseUrl = process.env.INBOUND_BEHAVIORAL_DATABASE_URL
if (!databaseUrl) throw new Error('INBOUND_BEHAVIORAL_DATABASE_URL is required.')

const parsed = new URL(databaseUrl)
const databaseName = parsed.pathname.slice(1).toLowerCase()
if (!['localhost', '127.0.0.1', '::1'].includes(parsed.hostname) || !/(test|fixture|tmp|disposable)/.test(databaseName)) {
  throw new Error('Refusing a non-local or non-disposable database target.')
}

const root = process.cwd()
const fixture = path.join(root, 'scripts/fixtures/inbound-canonical-legacy.sql')
const assertions = path.join(root, 'scripts/fixtures/inbound-canonical-assertions.sql')
const migration = path.join(root, 'supabase/migrations/20260718190437_canonical_arrival_schema_and_legacy_migration.sql')
for (const file of [fixture, assertions, migration]) if (!existsSync(file)) throw new Error(`Missing fixture file: ${file}`)

function psql(file: string) {
  execFileSync('psql', ['--set', 'ON_ERROR_STOP=1', '--dbname', databaseUrl, '--file', file], { stdio: 'inherit' })
}

// The target must have the repository migrations preceding the canonical one.
// This keeps the fixture representative and lets CI/local Supabase invoke this
// script after provisioning a disposable legacy baseline.
psql(fixture)
psql(migration)
psql(assertions)

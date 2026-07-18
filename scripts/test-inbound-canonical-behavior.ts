/**
 * Runs only against a pre-canonical disposable database.  It deliberately
 * refuses normal development/production-looking targets because it creates
 * legacy evidence before applying the forward migration.
 */
import { execFileSync } from 'node:child_process'
import { existsSync, readFileSync } from 'node:fs'
import path from 'node:path'

const databaseUrl = process.env.INBOUND_BEHAVIORAL_DATABASE_URL
if (!databaseUrl) throw new Error('INBOUND_BEHAVIORAL_DATABASE_URL is required.')
const resolvedDatabaseUrl = databaseUrl

const parsed = new URL(resolvedDatabaseUrl)
const databaseName = parsed.pathname.slice(1).toLowerCase()
const dockerContainer = process.env.INBOUND_BEHAVIORAL_DOCKER_CONTAINER
const suppliedPsql = process.env.INBOUND_BEHAVIORAL_PSQL
if (!suppliedPsql && !dockerContainer) throw new Error('Set INBOUND_BEHAVIORAL_PSQL or INBOUND_BEHAVIORAL_DOCKER_CONTAINER.')
const dedicatedContainer = 'supabase_db_seleccase-inventory-issue-11'
const disposableName = /(test|fixture|tmp|disposable)/.test(databaseName)
if ((!dockerContainer && !['localhost', '127.0.0.1', '::1'].includes(parsed.hostname)) || (!disposableName && dockerContainer !== dedicatedContainer)) {
  throw new Error('Refusing a non-local or non-disposable database target.')
}
if (dockerContainer && !/^[a-zA-Z0-9][a-zA-Z0-9_.-]*$/.test(dockerContainer)) {
  throw new Error('INBOUND_BEHAVIORAL_DOCKER_CONTAINER must be a single container name.')
}

const root = process.cwd()
const fixture = path.join(root, 'scripts/fixtures/inbound-canonical-legacy.sql')
const assertions = path.join(root, 'scripts/fixtures/inbound-canonical-assertions.sql')
const migration = path.join(root, 'supabase/migrations/20260718190437_canonical_arrival_schema_and_legacy_migration.sql')
const mappingMigration = path.join(root, 'supabase/migrations/20260719053000_supplier_sku_mapping_and_audit.sql')
for (const file of [fixture, assertions, migration, mappingMigration]) if (!existsSync(file)) throw new Error(`Missing fixture file: ${file}`)

function psql(file: string) {
  if (dockerContainer) {
    const containerUrl = new URL(resolvedDatabaseUrl)
    containerUrl.hostname = '127.0.0.1'
    containerUrl.port = '5432'
    execFileSync('docker', ['exec', '-i', dockerContainer, 'psql', '--set', 'ON_ERROR_STOP=1', '--dbname', containerUrl.toString()], { input: readFileSync(file), stdio: ['pipe', 'inherit', 'inherit'] })
    return
  }
  execFileSync(suppliedPsql!, ['--set', 'ON_ERROR_STOP=1', '--dbname', resolvedDatabaseUrl, '--file', file], { stdio: 'inherit' })
}

// The target must have the repository migrations preceding the canonical one.
// This keeps the fixture representative and lets CI/local Supabase invoke this
// script after provisioning a disposable legacy baseline.
psql(fixture)
psql(migration)
psql(mappingMigration)
psql(assertions)

// The project-local Supabase container is intentionally supported by name;
// callers still provide a disposable database URL and must apply the legacy
// baseline before invoking this proof.
void dedicatedContainer

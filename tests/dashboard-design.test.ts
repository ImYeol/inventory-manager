import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const viewSource = readFileSync(join(process.cwd(), 'src/app/components/DashboardView.tsx'), 'utf8')
const tablesSource = readFileSync(join(process.cwd(), 'src/app/components/DashboardTables.tsx'), 'utf8')

describe('dashboard Step 4 design contract', () => {
  it('keeps operational queues before the analysis section', () => {
    expect(viewSource.indexOf('DashboardExceptionTable')).toBeGreaterThan(-1)
    expect(viewSource.indexOf('DashboardSourcingTable')).toBeGreaterThan(-1)
    expect(viewSource.indexOf('DashboardAnalysis')).toBeGreaterThan(-1)
    expect(viewSource.lastIndexOf('<DashboardExceptionTable')).toBeLessThan(viewSource.indexOf('<DashboardAnalysis'))
  })

  it('uses embedded bare tables and semantic truncation for dashboard data', () => {
    expect(tablesSource).toContain("<DataTable bare")
    expect(tablesSource).toContain('TruncatedText')
    expect(tablesSource).toContain('role="img"')
    expect(tablesSource).not.toMatch(/rounded-\[(?!inherit)/)
    expect(tablesSource).not.toMatch(/(?:bg|text|border)-\[(?:#|rgb)/)
  })

  it('keeps chart period controls independent and uses gap-based dashboard stacking', () => {
    expect(tablesSource).toContain("const [transactionPeriod, setTransactionPeriod] = useState('14')")
    expect(tablesSource).toContain("const [inventoryPeriod, setInventoryPeriod] = useState('14')")
    expect(tablesSource).toContain('value={transactionPeriod}')
    expect(tablesSource).toContain('value={inventoryPeriod}')
    expect(tablesSource).toContain('flow.slice(-Number(transactionPeriod))')
    expect(tablesSource).toContain('flow.slice(-Number(inventoryPeriod))')
    expect(viewSource).not.toMatch(/\bspace-y-/)
  })

  it('keeps warehouse comparison plots inset and readable with one datum', () => {
    expect(tablesSource).toContain('data-testid="warehouse-comparison-plot"')
    expect(tablesSource).toContain('px-[var(--space-4)]')
    expect(tablesSource).toContain('min-w-8')
    expect(tablesSource).toContain('aria-label={`${row.name} ${row[metric]}개`}' )
  })
})

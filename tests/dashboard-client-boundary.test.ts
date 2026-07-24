import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const dashboardView = readFileSync(join(process.cwd(), 'src/app/components/DashboardView.tsx'), 'utf8')
const dashboardTables = readFileSync(join(process.cwd(), 'src/app/components/DashboardTables.tsx'), 'utf8')

describe('dashboard server/client boundary', () => {
  it('keeps function-valued table columns inside the client component', () => {
    expect(dashboardView).not.toContain("from '@/components/ui/data-table'")
    expect(dashboardView).toContain("from './DashboardTables'")
    expect(dashboardTables).toMatch(/^'use client'/)
    expect(dashboardTables).toContain("from '@/components/ui/data-table'")
    expect(dashboardTables).toContain('accessorFn:')
    expect(dashboardTables).toContain('cell:')
  })
})

import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

const source = (relativePath: string) => fs.readFileSync(path.resolve(process.cwd(), relativePath), 'utf8')

const dashboardSource = source('src/app/components/DashboardView.tsx')
const inventoryWorkspaceSource = source('src/app/components/inventory/InventoryWorkspace.tsx')

describe('dashboard and inventory workspace token usage', () => {
  it('uses semantic tokens instead of self-themed neutral utilities', () => {
    const selfThemeUtilities = /(?:text|bg|border|divide)-(?:slate|zinc|gray|neutral)-/

    expect(dashboardSource).not.toMatch(selfThemeUtilities)
    expect(inventoryWorkspaceSource).not.toMatch(selfThemeUtilities)
  })

  it('keeps dashboard focus, KPI, and progress chrome semantic', () => {
    expect(dashboardSource).toContain('hover:bg-[color:var(--surface-muted)]')
    expect(dashboardSource).toContain('ring-offset-[color:var(--surface)]')
    expect(dashboardSource).toContain('text-[color:var(--foreground)]')
    expect(dashboardSource).toContain('bg-[color:var(--surface-muted)]')
    expect(dashboardSource).toContain('bg-[color:var(--foreground)]')
  })

  it('retains the inventory option chip as data-driven color', () => {
    expect(inventoryWorkspaceSource).toContain('style={{ backgroundColor: color.rgbCode }}')
    expect(inventoryWorkspaceSource).toContain('border-[color:var(--border)]')
  })
})

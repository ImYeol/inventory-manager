import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

const source = (relativePath: string) =>
  fs.readFileSync(path.resolve(process.cwd(), relativePath), 'utf8')

// Navigation
const navSource = source('src/app/components/Nav.tsx')
const menuSource = source('src/components/ui/menu.tsx')

// History
const historyViewSource = source('src/app/(protected)/history/HistoryView.tsx')

// Sourcing
const factoriesViewSource = source('src/app/(protected)/sourcing/factories/FactoriesView.tsx')
const arrivalsViewSource = source('src/app/(protected)/sourcing/arrivals/ArrivalsView.tsx')

// Dashboard & Inventory
const dashboardSource = source('src/app/components/DashboardView.tsx')
const inventoryWorkspaceSource = source('src/app/components/inventory/InventoryWorkspace.tsx')

// Settings & Master Data
const settingsViewSource = source('src/app/(protected)/settings/SettingsView.tsx')
const masterDataManagerSource = source('src/app/(protected)/master-data/MasterDataManager.tsx')

// Auth & Root
const layoutSource = source('src/app/layout.tsx')
const loginPageSource = source('src/app/login/page.tsx')
const loginFormSource = source('src/app/login/LoginForm.tsx')

describe('navigation token contract', () => {
  it('uses semantic tokens instead of slate, zinc, or neutral utilities', () => {
    expect(navSource).not.toMatch(/(?:slate|zinc|neutral)-/)
    expect(menuSource).not.toMatch(/(?:slate|zinc|neutral)-/)
  })
})

describe('HistoryView token usage', () => {
  it('uses semantic tokens for UI chrome and retains only transaction-driven option color chips inline', () => {
    expect(historyViewSource).not.toMatch(/(?:text|bg|border)-(?:slate|zinc|gray|neutral)-/)
    expect(historyViewSource.match(/style=\{\{/g)).toHaveLength(2)
    expect(historyViewSource.match(/backgroundColor: item\.colorRgb/g)).toHaveLength(2)
  })
})

describe('sourcing view token usage', () => {
  it('uses semantic tokens instead of self-themed neutral utilities', () => {
    const selfThemeUtilities = /(?:text|bg|border|divide)-(?:slate|zinc|gray|neutral)-/

    expect(factoriesViewSource).not.toMatch(selfThemeUtilities)
    expect(arrivalsViewSource).not.toMatch(selfThemeUtilities)
  })

  it('uses semantic warning tokens for scoped arrival errors', () => {
    expect(arrivalsViewSource).toContain('text-[color:var(--warning-foreground)]')
  })
})

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

describe('settings and master-data semantic tokens', () => {
  it('does not use self-themed neutral utility classes', () => {
    const selfThemeUtilities = /(?:text|bg|border)-(?:slate|zinc|gray|neutral)-/

    expect(settingsViewSource).not.toMatch(selfThemeUtilities)
    expect(masterDataManagerSource).not.toMatch(selfThemeUtilities)
  })

  it('uses semantic status tokens for settings feedback', () => {
    expect(settingsViewSource).toContain('text-[color:var(--danger-foreground)]')
    expect(settingsViewSource).toContain('text-[color:var(--success-foreground)]')
  })
})

describe('auth and root semantic token usage', () => {
  it('does not use self-themed neutral utilities', () => {
    const selfThemeUtilities = /(?:text|bg|border|divide)-(?:slate|zinc|gray|neutral)-/

    expect(layoutSource).not.toMatch(selfThemeUtilities)
    expect(loginPageSource).not.toMatch(selfThemeUtilities)
    expect(loginFormSource).not.toMatch(selfThemeUtilities)
  })

  it('uses semantic status tokens for authentication errors', () => {
    expect(loginPageSource).toContain('border-[color:var(--hue-danger)]')
    expect(loginPageSource).toContain('text-[color:var(--danger-foreground)]')
    expect(loginFormSource).toContain('border-[color:var(--hue-danger)]')
    expect(loginFormSource).toContain('text-[color:var(--danger-foreground)]')
  })

  it('keeps root and login surfaces on semantic color tokens', () => {
    expect(layoutSource).toContain('bg-[color:var(--background)]')
    expect(layoutSource).toContain('focus:bg-[color:var(--surface)]')
    expect(loginPageSource).toContain('text-[color:var(--foreground)]')
    expect(loginPageSource).toContain('text-[color:var(--muted-foreground)]')
  })
})

import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

const source = (relativePath: string) => fs.readFileSync(path.resolve(process.cwd(), relativePath), 'utf8')

const settingsViewSource = source('src/app/(protected)/settings/SettingsView.tsx')
const masterDataManagerSource = source('src/app/(protected)/master-data/MasterDataManager.tsx')

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

import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

const source = (relativePath: string) => fs.readFileSync(path.resolve(process.cwd(), relativePath), 'utf8')

const factoriesViewSource = source('src/app/(protected)/sourcing/factories/FactoriesView.tsx')
const arrivalsViewSource = source('src/app/(protected)/sourcing/arrivals/ArrivalsView.tsx')

describe('sourcing view token usage', () => {
  it('uses semantic tokens instead of self-themed neutral utilities', () => {
    const selfThemeUtilities = /(?:text|bg|border|divide)-(?:slate|zinc|gray|neutral)-/

    expect(factoriesViewSource).not.toMatch(selfThemeUtilities)
    expect(arrivalsViewSource).not.toMatch(selfThemeUtilities)
  })

  it('uses semantic warning tokens for invalid arrival rows', () => {
    expect(arrivalsViewSource).toContain('border-[color:var(--hue-warning)]')
    expect(arrivalsViewSource).toContain('text-[color:var(--warning-foreground)]')
  })
})

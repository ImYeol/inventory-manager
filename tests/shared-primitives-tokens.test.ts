import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

const source = (relativePath: string) => fs.readFileSync(path.resolve(process.cwd(), relativePath), 'utf8')

const primitiveSources = [
  'src/components/ui/table.tsx',
  'src/components/ui/basic-data-table.tsx',
  'src/components/ui/inventory-data-table.tsx',
  'src/components/ui/store-connection-row.tsx',
  'src/components/ui/store-connection-status.tsx',
  'src/components/ui/column-visibility-menu.tsx',
].map(source)

const storeConnectionStatusSource = source('src/components/ui/store-connection-status.tsx')

describe('shared primitive token usage', () => {
  it('uses semantic tokens instead of self-themed neutral utilities', () => {
    const selfThemeUtilities = /(?:text|bg|border|divide)-(?:slate|zinc|gray|neutral)-/

    for (const primitiveSource of primitiveSources) {
      expect(primitiveSource).not.toMatch(selfThemeUtilities)
    }
  })

  it('uses semantic status hues while preserving the connection label', () => {
    expect(storeConnectionStatusSource).toContain('bg-[color:var(--hue-success)]')
    expect(storeConnectionStatusSource).toContain('bg-[color:var(--hue-danger)]')
    expect(storeConnectionStatusSource).toContain('bg-[color:var(--muted-foreground)]')
    expect(storeConnectionStatusSource).toContain("const label = configured ? '연결됨' : '미연결'")
  })
})

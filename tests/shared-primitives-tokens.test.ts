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
  'src/components/ui/card.tsx',
  'src/components/ui/modal.tsx',
  'src/components/ui/fixed-sheet.tsx',
  'src/components/ui/dropdown-menu.tsx',
].map(source)

const storeConnectionStatusSource = source('src/components/ui/store-connection-status.tsx')
const cardPrimitiveSource = source('src/components/ui/card.tsx')
const modalPrimitiveSource = source('src/components/ui/modal.tsx')
const fixedSheetPrimitiveSource = source('src/components/ui/fixed-sheet.tsx')
const dropdownMenuPrimitiveSource = source('src/components/ui/dropdown-menu.tsx')

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

describe('elevation baseline consumption (ADR-018 UI-system-check)', () => {
  it('keeps Card, Modal, and FixedSheet wired to their tokenized elevation preset', () => {
    // Card default surface resolves to `.ui-card` (elevation-2 in globals.css).
    expect(cardPrimitiveSource).toContain('default: ui.card')
    // Modal resolves to `.ui-modal` (elevation-4 in globals.css).
    expect(modalPrimitiveSource).toContain('ui.modal')
    // FixedSheet is the sole consumer of `ui.surfaceStrong` (`.ui-surface-strong`, elevation-4).
    expect(fixedSheetPrimitiveSource).toContain('ui.surfaceStrong')
  })

  it('never hardcodes a one-off box-shadow on the overlay/surface primitives', () => {
    const oneOffShadow = /shadow-(?!\[var\(--elevation-)/

    for (const primitiveSource of [
      cardPrimitiveSource,
      modalPrimitiveSource,
      fixedSheetPrimitiveSource,
      dropdownMenuPrimitiveSource,
    ]) {
      expect(primitiveSource).not.toMatch(oneOffShadow)
    }
  })
})

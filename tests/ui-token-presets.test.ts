import fs from 'node:fs'
import path from 'node:path'

import { describe, expect, it } from 'vitest'

const uiPresetSource = fs.readFileSync(path.resolve(process.cwd(), 'src/app/components/ui.tsx'), 'utf8')
const uiPresetSourceWithoutLegacyKicker = uiPresetSource.replace(/\n  pageKicker:\n    '[^']*',/, '')

const buttonPrimitiveSource = fs.readFileSync(path.resolve(process.cwd(), 'src/components/ui/button.tsx'), 'utf8')

describe('ui preset token contract', () => {
  it('uses semantic color tokens instead of slate or white utility colors', () => {
    expect(uiPresetSourceWithoutLegacyKicker).not.toMatch(/text-slate-|bg-slate-|border-slate-|ring-offset-white|\bbg-white\b/)
  })

  it('keeps dense status pills aligned to the dense control tier', () => {
    expect(uiPresetSource).toMatch(/statusPillDense:\s*\n\s*'[^']*min-h-8/)
  })

  it('retains pageKicker while the login page still consumes it', () => {
    const loginSource = fs.readFileSync(path.resolve(process.cwd(), 'src/app/login/page.tsx'), 'utf8')

    expect(uiPresetSource).toContain('pageKicker:')
    expect(loginSource).toContain('ui.pageKicker')
  })

  it('never hardcodes a non-token shadow value in shared presets', () => {
    const nonTokenShadow = /shadow-\[(?!var\(--elevation-)/
    expect(uiPresetSource).not.toMatch(nonTokenShadow)
  })
})

describe('button size role hierarchy (ADR-018 UI-system-check)', () => {
  it('keeps primary(default), secondary(sm), and lg on distinct control-height tiers', () => {
    expect(buttonPrimitiveSource).toMatch(/default:\s*'h-11 px-4'/)
    expect(buttonPrimitiveSource).toMatch(/sm:\s*'ui-button-sm'/)
    expect(buttonPrimitiveSource).toMatch(/lg:\s*'ui-button-lg'/)

    // Screens must stop defaulting every action to size="sm" — default and sm cannot collapse
    // onto the same class name.
    expect(buttonPrimitiveSource).not.toMatch(/default:\s*'ui-button-sm'/)
  })

  it('documents the primary/secondary/tertiary size role rule at the primitive', () => {
    expect(buttonPrimitiveSource).toMatch(/주\s*동작.*size="default"/)
    expect(buttonPrimitiveSource).toMatch(/보조\s*동작.*size="sm"/)
    expect(buttonPrimitiveSource).toMatch(/variant="ghost"/)
  })
})

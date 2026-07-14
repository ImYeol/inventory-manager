import fs from 'node:fs'
import path from 'node:path'

import { describe, expect, it } from 'vitest'

const uiPresetSource = fs.readFileSync(path.resolve(process.cwd(), 'src/app/components/ui.tsx'), 'utf8')
const uiPresetSourceWithoutLegacyKicker = uiPresetSource.replace(/\n  pageKicker:\n    '[^']*',/, '')

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
})

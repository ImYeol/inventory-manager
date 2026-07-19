import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

const source = (relativePath: string) => fs.readFileSync(path.resolve(process.cwd(), relativePath), 'utf8')

describe('shared Select overlay layering', () => {
  it('keeps its portal menu above the shared Modal and FixedSheet layers', () => {
    const selectSource = source('src/components/ui/select.tsx')
    const styles = source('src/app/globals.css')
    const selectRule = styles.match(/\.ui-select-content\s*\{([^}]*)\}/s)
    const selectLayer = selectRule?.[1].match(/z-index:\s*(\d+);/)
    const modalLayers = [...styles.matchAll(/\.ui-modal(?:-overlay)?\s*\{[^}]*z-index:\s*(\d+);/gs)]
      .map((match) => Number(match[1]))

    expect(selectSource).toContain('<SelectPrimitive.Portal>')
    expect(selectSource).toContain("position = 'popper'")
    expect(selectLayer).not.toBeNull()
    expect(modalLayers).toEqual(expect.arrayContaining([60, 61]))
    expect(Number(selectLayer?.[1])).toBeGreaterThan(Math.max(...modalLayers))
    expect(selectRule?.[1]).toContain('box-shadow: var(--elevation-3)')
  })
})

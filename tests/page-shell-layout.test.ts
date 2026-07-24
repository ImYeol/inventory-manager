import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

const uiSource = fs.readFileSync(path.resolve(process.cwd(), 'src/app/components/ui.tsx'), 'utf8')

describe('page shell layout', () => {
  it('keeps shared detail pages compact near the fixed navigation', () => {
    expect(uiSource).toContain("shell: 'mx-auto w-full max-w-7xl px-4 py-3 md:px-8 md:py-4'")
    expect(uiSource).toContain("shellNarrow: 'mx-auto w-full max-w-3xl px-4 py-3 md:px-8 md:py-4'")
  })
})

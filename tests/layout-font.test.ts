import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

describe('root layout font loading', () => {
  it('loads Inter via next/font/google per ADR-036, keeping the local system stack as documented fallback', () => {
    const layoutSource = fs.readFileSync(path.join(process.cwd(), 'src/app/layout.tsx'), 'utf8')
    const cssSource = fs.readFileSync(path.join(process.cwd(), 'src/app/globals.css'), 'utf8')

    expect(layoutSource).toContain('next/font/google')
    expect(layoutSource).toContain('Inter')
    expect(cssSource).toContain('--font-sans-stack')
  })
})

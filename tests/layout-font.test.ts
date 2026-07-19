import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

describe('root layout font loading', () => {
  it('does not require a network font during build', () => {
    const source = fs.readFileSync(path.join(process.cwd(), 'src/app/layout.tsx'), 'utf8')

    expect(source).not.toContain('next/font/google')
    expect(source).not.toContain('Geist(')
  })
})

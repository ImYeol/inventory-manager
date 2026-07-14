import fs from 'node:fs'
import path from 'node:path'

import { describe, expect, it } from 'vitest'

const navSource = fs.readFileSync(path.resolve(process.cwd(), 'src/app/components/Nav.tsx'), 'utf8')
const menuSource = fs.readFileSync(path.resolve(process.cwd(), 'src/components/ui/menu.tsx'), 'utf8')

describe('navigation token contract', () => {
  it('uses semantic tokens instead of slate, zinc, or neutral utilities', () => {
    expect(navSource).not.toMatch(/(?:slate|zinc|neutral)-/)
    expect(menuSource).not.toMatch(/(?:slate|zinc|neutral)-/)
  })
})

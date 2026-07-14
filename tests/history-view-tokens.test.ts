import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

const source = fs.readFileSync(path.resolve(process.cwd(), 'src/app/(protected)/history/HistoryView.tsx'), 'utf8')

describe('HistoryView token usage', () => {
  it('uses semantic tokens for UI chrome and retains only transaction-driven option color chips inline', () => {
    expect(source).not.toMatch(/(?:text|bg|border)-(?:slate|zinc|gray|neutral)-/)
    expect(source.match(/style=\{\{/g)).toHaveLength(2)
    expect(source.match(/backgroundColor: item\.colorRgb/g)).toHaveLength(2)
  })
})

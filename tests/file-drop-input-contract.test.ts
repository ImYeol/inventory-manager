import fs from 'node:fs'
import path from 'node:path'

import { describe, expect, it } from 'vitest'

const fileDropSource = fs.readFileSync(path.resolve(process.cwd(), 'src/components/ui/file-drop-input.tsx'), 'utf8')
const globalsSource = fs.readFileSync(path.resolve(process.cwd(), 'src/app/globals.css'), 'utf8')

const consumerFiles = [
  'src/app/(protected)/sourcing/factories/FactoriesView.tsx',
  'src/app/components/inventory/InboundRegistrationSheet.tsx',
  'src/app/(protected)/orders/tracking-import/tracking-import-workspace.tsx',
]

describe('FileDropInput contract (docs/design/components.md, ui-guide.md rule 26)', () => {
  it('shows the selected file name instead of discarding it', () => {
    expect(fileDropSource).toMatch(/setFileName/)
    expect(fileDropSource).toMatch(/fileName \?\? hint/)
  })

  it('tracks a drag-active state and reflects it on the surface', () => {
    expect(fileDropSource).toMatch(/setIsDragActive/)
    expect(fileDropSource).toMatch(/data-drag-active=\{isDragActive\}/)
  })

  it('uses the tokenized .ui-file-drop surface, not hardcoded colors', () => {
    expect(fileDropSource).toMatch(/className="ui-file-drop"/)
    expect(globalsSource).toMatch(/\.ui-file-drop\s*\{/)
    expect(globalsSource).toMatch(/\.ui-file-drop\[data-drag-active='true'\]/)
  })

  it.each(consumerFiles)('%s uses the shared FileDropInput instead of a bare file input', (file) => {
    const source = fs.readFileSync(path.resolve(process.cwd(), file), 'utf8')
    expect(source).toMatch(/FileDropInput/)
    expect(source).not.toMatch(/<Input[^>]*type="file"/)
    expect(source).not.toMatch(/<input[^>]*type="file"/)
  })
})

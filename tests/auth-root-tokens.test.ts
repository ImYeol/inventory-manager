import fs from 'node:fs'
import path from 'node:path'

import { describe, expect, it } from 'vitest'

const source = (relativePath: string) => fs.readFileSync(path.resolve(process.cwd(), relativePath), 'utf8')

const layoutSource = source('src/app/layout.tsx')
const loginPageSource = source('src/app/login/page.tsx')
const loginFormSource = source('src/app/login/LoginForm.tsx')

describe('auth and root semantic token usage', () => {
  it('does not use self-themed neutral utilities', () => {
    const selfThemeUtilities = /(?:text|bg|border|divide)-(?:slate|zinc|gray|neutral)-/

    expect(layoutSource).not.toMatch(selfThemeUtilities)
    expect(loginPageSource).not.toMatch(selfThemeUtilities)
    expect(loginFormSource).not.toMatch(selfThemeUtilities)
  })

  it('uses semantic status tokens for authentication errors', () => {
    expect(loginPageSource).toContain('border-[color:var(--hue-danger)]')
    expect(loginPageSource).toContain('text-[color:var(--danger-foreground)]')
    expect(loginFormSource).toContain('border-[color:var(--hue-danger)]')
    expect(loginFormSource).toContain('text-[color:var(--danger-foreground)]')
  })

  it('keeps root and login surfaces on semantic color tokens', () => {
    expect(layoutSource).toContain('bg-[color:var(--background)]')
    expect(layoutSource).toContain('focus:bg-[color:var(--surface)]')
    expect(loginPageSource).toContain('text-[color:var(--foreground)]')
    expect(loginPageSource).toContain('text-[color:var(--muted)]')
  })
})

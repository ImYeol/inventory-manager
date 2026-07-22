// @vitest-environment jsdom
import fs from 'node:fs'
import path from 'node:path'
import React from 'react'
import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { Card, CardContent, CardHeader } from '@/components/ui/card'

const contractPath = path.resolve(process.cwd(), 'design-system/contracts/card.composition.json')

function readContract() {
  return JSON.parse(fs.readFileSync(contractPath, 'utf8')) as {
    component: string
    properties: Record<string, { default: string; values: string[] }>
    compositions: Array<{ surface: string; contentLayout: string; tokens: Record<string, string> }>
  }
}

describe('design composition contracts', () => {
  it('references only CSS tokens defined in globals.css', () => {
    const contractSource = fs.readFileSync(contractPath, 'utf8')
    const globalsSource = fs.readFileSync(path.resolve(process.cwd(), 'src/app/globals.css'), 'utf8')
    const referencedTokens = [...contractSource.matchAll(/var\((--[\w-]+)\)/g)].map((match) => match[1])

    expect(referencedTokens.length).toBeGreaterThan(0)
    for (const token of referencedTokens) {
      expect(globalsSource).toMatch(new RegExp(`${token}:`))
    }
  })

  it('keeps the Figma-facing Card names aligned with the shared primitive API', () => {
    const contract = readContract()
    const cardSource = fs.readFileSync(path.resolve(process.cwd(), 'src/components/ui/card.tsx'), 'utf8')

    expect(contract.component).toBe('Card')
    expect(contract.properties.surface.values).toEqual(['default', 'muted', 'strong'])
    expect(contract.properties.contentLayout.default).toBe('inset')
    expect(contract.properties.contentLayout.values).toEqual(['inset', 'continuous'])
    expect(contract.compositions).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          contentLayout: 'inset',
          tokens: expect.objectContaining({ bodyInset: 'var(--space-4)' }),
        }),
        expect.objectContaining({ contentLayout: 'continuous' }),
      ]),
    )
    expect(cardSource).toContain('surface?: CardSurface')
    expect(cardSource).toContain("contentLayout?: CardContentLayout")
    expect(cardSource).toContain("contentLayout = 'inset'")
  })

  it('keeps divided card content inset by default and makes continuous content explicit', () => {
    const { rerender } = render(
      React.createElement(
        Card,
        null,
        React.createElement(CardHeader, null, '제목'),
        React.createElement(CardContent, null, '기본 본문'),
      ),
    )

    expect(screen.getByText('기본 본문').className).toContain('ui-card-body')
    expect(screen.getByText('기본 본문').className).toContain('ui-card-content-inset')
    expect(screen.getByText('기본 본문').className).not.toContain('ui-card-content-continuous')

    rerender(
      React.createElement(
        Card,
        null,
        React.createElement(CardHeader, null, '제목'),
        React.createElement(CardContent, { contentLayout: 'continuous' }, '연속 본문'),
      ),
    )

    expect(screen.getByText('연속 본문').className).toContain('ui-card-content-continuous')
    expect(screen.getByText('연속 본문').className).toContain('p-0')
  })

  it('keeps the card composition contract elevation token aligned with the card = elevation-2 baseline', () => {
    const contract = readContract()

    expect(contract.compositions.length).toBeGreaterThan(0)
    for (const composition of contract.compositions) {
      expect(composition.tokens.elevation).toBe('var(--elevation-2)')
    }
  })
})

describe('elevation baseline (ADR-018 UI-system-check)', () => {
  const globalsSource = fs.readFileSync(path.resolve(process.cwd(), 'src/app/globals.css'), 'utf8')

  function expectElevation(className: string, level: number) {
    const pattern = new RegExp(`\\.${className}(?![\\w-])[^{}]*\\{[^}]*box-shadow:\\s*var\\(--elevation-${level}\\)`)
    expect(globalsSource).toMatch(pattern)
  }

  it('raises the card surface baseline to elevation-2', () => {
    expectElevation('ui-card', 2)
  })

  it('keeps dropdown/select overlays at elevation-3', () => {
    expectElevation('ui-select-content', 3)
    expectElevation('ui-dropdown-menu-content', 3)
  })

  it('keeps modal surfaces at elevation-4', () => {
    expectElevation('ui-modal', 4)
  })

  it('gives .ui-card its own elevation-2 override rule after the shared surface/card baseline block', () => {
    // The shared `.surface, .ui-surface, .ui-card` block still carries the generic elevation-1
    // hairline; a later dedicated `.ui-card { box-shadow: var(--elevation-2) }` rule must win the
    // cascade so cards actually render at the raised baseline.
    const sharedBlockIndex = globalsSource.indexOf('box-shadow: var(--elevation-1);')
    const dedicatedCardRuleIndex = globalsSource.search(/\.ui-card\s*\{\s*box-shadow:\s*var\(--elevation-2\);\s*\}/)

    expect(sharedBlockIndex).toBeGreaterThan(-1)
    expect(dedicatedCardRuleIndex).toBeGreaterThan(sharedBlockIndex)
  })
})

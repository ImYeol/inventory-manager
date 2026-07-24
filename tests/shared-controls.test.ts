import fs from 'node:fs'
import path from 'node:path'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { createElement, type ComponentProps, type ComponentType, type ReactNode } from 'react'
import {
  ActionRow,
  IndependentActionGroup,
  QueryResetButton,
  ResponsiveFilterControls,
} from '@/components/ui/filter-toolbar'

type TestFilterProps = Omit<ComponentProps<typeof ResponsiveFilterControls>, 'children'> & { children?: ReactNode }
const TestResponsiveFilterControls = ResponsiveFilterControls as ComponentType<TestFilterProps>

const read = (file: string) => fs.readFileSync(path.resolve(process.cwd(), file), 'utf8')

afterEach(() => cleanup())

describe('unified data layout control contract', () => {
  it('declares each semantic radius alias once in the token source', () => {
    const css = read('src/app/globals.css')

    expect(css).toMatch(/--radius-control:\s*0\.5rem/)
    expect(css).toMatch(/--radius-surface:\s*0\.625rem/)
    expect(css).toMatch(/--radius-card:\s*0\.75rem/)
    expect(css).toMatch(/--radius-overlay:\s*0\.875rem/)
    expect(css).toMatch(/--radius-pill:\s*var\(--radius-full\)/)
    expect(css.match(/--radius-pill\s*:/g)).toHaveLength(1)
  })

  it('keeps controls out of the pill radius class while preserving pill-only tokens', () => {
    const css = read('src/app/globals.css')
    const buttonBlock = css.match(/\.ui-button\s*\{[\s\S]*?\n\s*\}/)?.[0] ?? ''
    const controlBlock = css.match(/\.ui-control\s*\{[\s\S]*?\n\s*\}/)?.[0] ?? ''

    expect(buttonBlock).toContain('border-radius: var(--radius-control)')
    expect(controlBlock).toContain('border-radius: var(--radius-control)')
    expect(buttonBlock).not.toContain('var(--radius-full)')
    expect(controlBlock).not.toContain('var(--radius-full)')
  })

  it('defines the query/action rows as stable, non-wrapping layout primitives', () => {
    const source = read('src/components/ui/filter-toolbar.tsx')

    expect(source).toContain("data-slot=\"data-query-row\"")
    expect(source).toContain("data-slot=\"data-action-row\"")
    expect(source).toMatch(/data-query-row[\s\S]{0,160}flex-nowrap/)
    expect(source).toMatch(/data-action-row[\s\S]{0,160}flex-nowrap/)
    expect(source).not.toMatch(/data-query-row[\s\S]{0,160}flex-wrap/)
    expect(source).not.toMatch(/data-action-row[\s\S]{0,160}flex-wrap/)
  })

  it('keeps standalone controls in business-action then adjacent-query order', () => {
    const source = read('src/components/ui/data-table.tsx')

    expect(source.indexOf('<ActionRow align={actionAlignment}>')).toBeGreaterThan(-1)
    expect(source.indexOf('<FilterToolbar>')).toBeGreaterThan(-1)
    expect(source.indexOf('<ActionRow align={actionAlignment}>')).toBeLessThan(source.indexOf('<FilterToolbar>'))
  })

  it('defines explicit clusters without centering text controls', () => {
    const source = read('src/components/ui/filter-toolbar.tsx')
    const css = read('src/app/globals.css')

    expect(source).toContain('data-slot="data-query-start"')
    expect(source).toContain('data-slot="data-query-end"')
    expect(source).toContain('data-slot="data-action-start"')
    expect(source).toContain('data-slot="data-action-end"')
    expect(source).not.toMatch(/data-query-start[\s\S]{0,220}justify-center/)
    expect(css).toMatch(/\.ui-data-controls\s*\{[\s\S]*?align-items:\s*stretch/)
  })

  it('supports explicit action-only alignment and independent compact action groups', () => {
    render(createElement(
      ActionRow,
      { align: 'start' },
      createElement(
        IndependentActionGroup,
        { 'aria-label': '운영 작업' },
        createElement('button', null, '작업 1'),
        createElement('button', null, '작업 2'),
      ),
    ))

    const actionRow = screen.getByText('작업 1').closest('[data-slot="data-action-row"]')
    const actionGroup = screen.getByRole('group', { name: '운영 작업' })

    expect(actionRow).toHaveAttribute('data-align', 'start')
    expect(actionRow).toHaveClass('justify-start')
    expect(actionGroup).toHaveAttribute('data-slot', 'independent-action-group')
    expect(actionGroup).toHaveClass('overflow-x-auto')
    expect(actionGroup.className).toContain('gap-[var(--space-1)]')
  })

  it('renders query reset as a shared compact outlined button', () => {
    render(createElement(QueryResetButton, null, '필터 초기화'))

    const reset = screen.getByRole('button', { name: '필터 초기화' })
    expect(reset).toHaveAttribute('data-purpose', 'query-reset')
    expect(reset).toHaveAttribute('data-variant', 'outline')
    expect(reset).toHaveClass('ui-button-sm')
  })

  it('contains narrow action rows inside the data controls viewport', () => {
    const source = read('src/components/ui/filter-toolbar.tsx')

    expect(source).toContain('data-slot="data-action-row"')
    expect(source).toMatch(/data-slot="data-action-row"[\s\S]{0,220}max-w-full[\s\S]{0,220}overflow-x-auto/)
  })

  it('keeps menu overlays from changing page scrollbar geometry', () => {
    const source = read('src/components/ui/column-visibility-menu.tsx')
    const css = read('src/app/globals.css')

    expect(source).toContain('data-scroll-lock="menu"')
    expect(css).toContain('scrollbar-gutter: stable')
    expect(css).toContain('overflow-y: scroll !important')
    expect(css).toContain('body[data-scroll-locked]')
  })

  it('defines semantic table column minimum tokens and an internal overflow surface', () => {
    const css = read('src/app/globals.css')

    expect(css).toMatch(/--table-col-identity-min:\s*220px/)
    expect(css).toMatch(/--table-col-numeric-min:\s*96px/)
    expect(css).toMatch(/--table-col-status-min:\s*104px/)
    expect(css).toMatch(/\.ui-data-scroll\s*\{[\s\S]*overflow-x:\s*auto/)
  })

  it('provides deterministic wide, compact, and mobile filter modes with accessible titles', () => {
    const source = read('src/components/ui/filter-toolbar.tsx')

    expect(source).toContain("mode?: 'wide' | 'compact' | 'mobile'")
    expect(source).toContain('PopoverTitle')
    expect(source).toContain('DialogTitle')
    expect(source).toContain('data-filter-mode')
  })

  it('renders inline controls in wide mode', () => {
    render(createElement(
      TestResponsiveFilterControls,
      {
        mode: 'wide',
        label: '필터',
      },
      createElement(
        'div',
        null,
        createElement('label', { htmlFor: 'wide-filter' }, '상태'),
        createElement('input', { id: 'wide-filter' }),
      ),
    ))

    expect(screen.getByText('상태')).toBeInTheDocument()
    expect(screen.getByText('상태').closest('[data-filter-mode="wide"]')).toBeInTheDocument()
  })

  it('renders compact controls in an accessible Popover', () => {
    render(createElement(
      TestResponsiveFilterControls,
      {
        mode: 'compact',
        label: '필터',
      },
      createElement(
        'div',
        null,
        createElement('label', { htmlFor: 'compact-filter' }, '상태'),
        createElement('input', { id: 'compact-filter' }),
      ),
    ))

    expect(screen.getByRole('button', { name: '필터' })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: '필터' }))
    expect(screen.getByText('상태')).toBeInTheDocument()
    expect(screen.getByText('상태')).toBeInTheDocument()
  })

  it('renders mobile controls in a full-screen Dialog with a title', () => {
    render(createElement(
      TestResponsiveFilterControls,
      {
        mode: 'mobile',
        label: '필터',
      },
      createElement(
        'div',
        null,
        createElement('label', { htmlFor: 'mobile-filter' }, '상태'),
        createElement('input', { id: 'mobile-filter' }),
      ),
    ))

    fireEvent.click(screen.getByRole('button', { name: '필터' }))
    const dialog = screen.getByRole('dialog')

    expect(screen.getByRole('heading', { name: '필터' })).toBeInTheDocument()
    expect(dialog).toHaveClass('inset-0', 'rounded-none')
  })
})

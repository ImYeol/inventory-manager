// @vitest-environment jsdom
import React from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'

const mocks = vi.hoisted(() => ({
  pathname: '/analytics',
}))

vi.mock('next/navigation', () => ({
  usePathname: () => mocks.pathname,
}))

vi.mock('next/link', () => ({
  default: ({
    href,
    children,
    className,
    ...props
  }: {
    href: string
    children: React.ReactNode
    className?: string
    [key: string]: unknown
  }) => React.createElement('a', { href, className, ...props }, children),
}))

import Nav from '@/app/components/Nav'

beforeEach(() => {
  mocks.pathname = '/analytics'
})

afterEach(() => {
  cleanup()
})

describe('Nav', () => {
  it('renders the main inventory navigation labels', () => {
    render(React.createElement(Nav))

    expect(screen.getAllByText('재고').length).toBeGreaterThan(0)
    expect(screen.getAllByText('입출고').length).toBeGreaterThan(0)
    expect(screen.getAllByText('이력').length).toBeGreaterThan(0)
    expect(screen.getAllByText('운송장').length).toBeGreaterThan(0)
    expect(screen.getAllByText('분석').length).toBeGreaterThan(0)
    expect(screen.getAllByText('기초정보').length).toBeGreaterThan(0)
    expect(screen.queryByText('재고조정')).toBeNull()
    expect(screen.getAllByRole('link', { name: '설정' })).toHaveLength(2)
  })

  it('marks the active route with the highlighted analytics styles', () => {
    render(React.createElement(Nav))

    const activeLink = screen.getAllByRole('link', { name: '분석' })[0]
    expect(activeLink.className).toContain('bg-slate-50')
    expect(activeLink.className).toContain('text-slate-950')
  })

  it('marks master data as active on the master data route', () => {
    mocks.pathname = '/master-data'

    render(React.createElement(Nav))

    const activeLink = screen.getAllByRole('link', { name: '기초정보' })[0]
    expect(activeLink.getAttribute('aria-current')).toBe('page')
  })

  it('marks settings as active when the settings route is open', () => {
    mocks.pathname = '/settings'

    render(React.createElement(Nav))

    const activeLinks = screen.getAllByRole('link', { name: '설정' })
    expect(activeLinks.every((link) => link.getAttribute('aria-current') === 'page')).toBe(true)
  })
})

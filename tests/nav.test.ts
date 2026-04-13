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

vi.mock('@/app/login/actions', () => ({
  logout: vi.fn(),
}))

import Nav from '@/app/components/Nav'

beforeEach(() => {
  mocks.pathname = '/analytics'
})

afterEach(() => {
  cleanup()
})

describe('Nav', () => {
  it('renders the requested primary navigation labels for desktop and mobile', () => {
    render(React.createElement(Nav))

    expect(screen.getAllByRole('link', { name: '대시보드' })).toHaveLength(2)
    expect(screen.getAllByRole('link', { name: '재고현황' })).toHaveLength(2)
    expect(screen.getAllByRole('link', { name: '이력조회' })).toHaveLength(2)
    expect(screen.getAllByRole('link', { name: '기준 데이터' })).toHaveLength(2)
    expect(screen.getAllByText('운송장').length).toBeGreaterThan(0)
    expect(screen.getAllByText('분석').length).toBeGreaterThan(0)
    expect(screen.queryByText('입출고')).toBeNull()
    expect(screen.queryByText('기초정보')).toBeNull()
    expect(screen.queryByText('재고')).toBeNull()
    expect(screen.queryByText('이력')).toBeNull()
    expect(screen.queryByText('프로필')).toBeNull()
    expect(screen.getAllByRole('link', { name: '설정' })).toHaveLength(2)
  })

  it('uses the requested href contract for the new information architecture', () => {
    render(React.createElement(Nav))

    expect(screen.getAllByRole('link', { name: '대시보드' })[0].getAttribute('href')).toBe('/')
    expect(screen.getAllByRole('link', { name: '재고현황' })[0].getAttribute('href')).toBe('/inventory')
    expect(screen.getAllByRole('link', { name: '이력조회' })[0].getAttribute('href')).toBe('/history')
    expect(screen.getAllByRole('link', { name: '기준 데이터' })[0].getAttribute('href')).toBe('/master-data')
  })

  it('marks the active analytics route with the highlighted styles', () => {
    render(React.createElement(Nav))

    const activeLink = screen.getAllByRole('link', { name: '분석' })[0]
    expect(activeLink.className).toContain('bg-slate-50')
    expect(activeLink.className).toContain('text-slate-950')
  })

  it('marks master data as active on the master data route', () => {
    mocks.pathname = '/master-data'

    render(React.createElement(Nav))

    const activeLink = screen.getAllByRole('link', { name: '기준 데이터' })[0]
    expect(activeLink.getAttribute('aria-current')).toBe('page')
  })

  it('marks settings as active when the settings route is open', () => {
    mocks.pathname = '/settings'

    render(React.createElement(Nav))

    const activeLinks = screen.getAllByRole('link', { name: '설정' })
    expect(activeLinks.every((link) => link.getAttribute('aria-current') === 'page')).toBe(true)
  })

  it('shows the logged-in user profile summary when user data is provided', () => {
    render(React.createElement(Nav, { user: { name: '홍길동', email: 'hong@example.com' } }))

    expect(screen.getAllByText('홍길동')).toHaveLength(2)
    expect(screen.getAllByText('hong@example.com')).toHaveLength(2)
  })
})

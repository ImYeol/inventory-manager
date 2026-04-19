// @vitest-environment jsdom
import React from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'

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
  it('renders the task-oriented primary navigation without the old store-connections singleton item', () => {
    render(React.createElement(Nav))

    expect(screen.queryByText('Warehouse Console')).toBeNull()
    expect(screen.queryByText('재고 운영 허브 중심의 운영 콘솔')).toBeNull()
    expect(screen.getByRole('heading', { name: 'Seleccase Inventory' })).toBeTruthy()
    expect(screen.getByRole('link', { name: '대시보드' }).getAttribute('href')).toBe('/')
    expect(screen.getByRole('link', { name: '재고 운영' }).getAttribute('href')).toBe('/inventory')
    expect(screen.getByRole('link', { name: '상품 관리' }).getAttribute('href')).toBe('/products')
    expect(screen.getByRole('link', { name: '소싱' }).getAttribute('href')).toBe('/sourcing')
    expect(screen.getByRole('link', { name: '운송장' }).getAttribute('href')).toBe('/shipping')
    expect(screen.getByRole('link', { name: '분석' }).getAttribute('href')).toBe('/analytics')
    expect(screen.queryByRole('link', { name: '스토어 연결' })).toBeNull()
    expect(screen.getByRole('link', { name: '설정' }).getAttribute('href')).toBe('/settings')
  })

  it('opens the mobile drawer and renders the same information architecture', () => {
    render(React.createElement(Nav))

    fireEvent.click(screen.getByRole('button', { name: '메뉴 열기' }))

    expect(screen.getByRole('dialog', { name: '모바일 메뉴' })).toBeTruthy()
    expect(screen.getAllByRole('link', { name: '재고 운영' })).toHaveLength(2)
    expect(screen.getAllByRole('link', { name: '상품 관리' })).toHaveLength(2)
    expect(screen.getAllByRole('link', { name: '소싱' })).toHaveLength(2)
  })

  it('marks the active analytics route with the highlighted styles', () => {
    render(React.createElement(Nav))

    const activeLink = screen.getAllByRole('link', { name: '분석' })[0]
    expect(activeLink.getAttribute('aria-current')).toBe('page')
  })

  it('marks sourcing as active on sourcing routes', () => {
    mocks.pathname = '/sourcing/arrivals'

    render(React.createElement(Nav))

    const sourcingLink = screen.getByRole('link', { name: '소싱' })
    expect(sourcingLink.getAttribute('aria-current')).toBe('page')
  })

  it('marks settings as active when the settings route is open', () => {
    mocks.pathname = '/settings'

    render(React.createElement(Nav))

    const activeLinks = screen.getAllByRole('link', { name: '설정' })
    expect(activeLinks.some((link) => link.getAttribute('aria-current') === 'page')).toBe(true)
  })

  it('shows the logged-in user profile summary when user data is provided', () => {
    render(React.createElement(Nav, { user: { name: '홍길동', email: 'hong@example.com' } }))

    fireEvent.click(screen.getByRole('button', { name: '메뉴 열기' }))

    expect(screen.getAllByText('홍길동')).toHaveLength(2)
    expect(screen.getAllByText('hong@example.com')).toHaveLength(2)
  })
})

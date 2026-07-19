// @vitest-environment jsdom
import React from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'

const mocks = vi.hoisted(() => ({
  pathname: '/',
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
  mocks.pathname = '/'
})

afterEach(() => {
  cleanup()
})

describe('Nav', () => {
  it('renders the five canonical operations destinations without settings', () => {
    render(React.createElement(Nav))

    expect(screen.queryByText('Warehouse Console')).toBeNull()
    expect(screen.queryByText('재고 운영 허브 중심의 운영 콘솔')).toBeNull()
    expect(screen.getByRole('heading', { name: 'Seleccase Inventory' })).toBeTruthy()
    expect(screen.getByRole('link', { name: '대시보드' }).getAttribute('href')).toBe('/')
    expect(screen.getByRole('link', { name: '주문' }).getAttribute('href')).toBe('/orders')
    expect(screen.getByRole('link', { name: '재고 운영' }).getAttribute('href')).toBe('/inventory')
    expect(screen.getByRole('link', { name: '상품 관리' }).getAttribute('href')).toBe('/products')
    expect(screen.getByRole('button', { name: '소싱' })).toBeTruthy()
    expect(screen.getByRole('link', { name: '입고처' }).getAttribute('href')).toBe('/sourcing/factories')
    expect(screen.getByRole('link', { name: '입고 예정' }).getAttribute('href')).toBe('/sourcing/arrivals')
    expect(screen.queryByRole('link', { name: '운송장' })).toBeNull()
    expect(screen.queryByRole('link', { name: '분석' })).toBeNull()
    expect(screen.queryByRole('link', { name: '스토어 연결' })).toBeNull()
    expect(within(screen.getByRole('navigation', { name: '주요 메뉴' })).queryByRole('link', { name: '설정' })).toBeNull()
  })

  it('opens the mobile drawer and renders the same information architecture', () => {
    render(React.createElement(Nav))

    fireEvent.click(screen.getByRole('button', { name: '메뉴 열기' }))

    expect(screen.getByRole('dialog', { name: '모바일 메뉴' })).toBeTruthy()
    const mobileMenu = within(screen.getByRole('dialog', { name: '모바일 메뉴' }))
    const destinations = [
      ['대시보드', '/'],
      ['주문', '/orders'],
      ['상품 관리', '/products'],
      ['재고 운영', '/inventory'],
    ] as const

    destinations.forEach(([label, href]) => {
      expect(mobileMenu.getByRole('link', { name: label }).getAttribute('href')).toBe(href)
    })
    expect(mobileMenu.getByRole('button', { name: '소싱' })).toBeTruthy()
    expect(mobileMenu.getByRole('link', { name: '입고처' }).getAttribute('href')).toBe('/sourcing/factories')
    expect(mobileMenu.getByRole('link', { name: '입고 예정' }).getAttribute('href')).toBe('/sourcing/arrivals')
    expect(screen.queryAllByRole('link', { name: '분석' })).toHaveLength(0)
    expect(mobileMenu.queryByRole('link', { name: '설정' })).toBeNull()
  })

  it('marks sourcing as active on sourcing routes', () => {
    mocks.pathname = '/sourcing/arrivals'

    render(React.createElement(Nav))

    const sourcingSection = screen.getByRole('button', { name: '소싱' })
    const arrivalsLink = screen.getByRole('link', { name: '입고 예정' })
    expect(sourcingSection.getAttribute('aria-expanded')).toBe('true')
    expect(arrivalsLink.getAttribute('aria-current')).toBe('page')
  })

  it('shows the logged-in user profile summary when user data is provided', () => {
    render(React.createElement(Nav, { user: { name: '홍길동', email: 'hong@example.com' } }))

    fireEvent.click(screen.getByRole('button', { name: '메뉴 열기' }))

    expect(screen.getAllByText('홍길동')).toHaveLength(2)
    expect(screen.getAllByText('hong@example.com')).toHaveLength(2)
  })

  it('keeps the API settings deep link in the account menu on desktop and mobile without a separate parse-template entry', () => {
    render(React.createElement(Nav, { user: { name: '홍길동', email: 'hong@example.com' } }))

    fireEvent.pointerDown(screen.getAllByRole('button', { name: /홍길동/ })[0], { button: 0, ctrlKey: false })
    expect(screen.getByRole('menuitem', { name: 'API 설정' }).getAttribute('href')).toBe('/settings?section=store-connections')
    expect(screen.queryByRole('menuitem', { name: '파싱 템플릿' })).toBeNull()
    expect(screen.getByText('로그아웃')).toBeTruthy()

    cleanup()
    render(React.createElement(Nav, { user: { name: '홍길동', email: 'hong@example.com' } }))
    fireEvent.click(screen.getByRole('button', { name: '메뉴 열기' }))
    const mobileMenu = within(screen.getByRole('dialog', { name: '모바일 메뉴' }))
    fireEvent.pointerDown(mobileMenu.getByRole('button', { name: /홍길동/ }), { button: 0, ctrlKey: false })
    expect(screen.getAllByRole('menuitem', { name: 'API 설정' }).some((item) => item.getAttribute('href') === '/settings?section=store-connections')).toBe(true)
    expect(screen.queryAllByRole('menuitem', { name: '파싱 템플릿' })).toHaveLength(0)
  })
})

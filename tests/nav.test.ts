// @vitest-environment jsdom
import '@testing-library/jest-dom'
import React from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'

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

const DESKTOP_WIDTH = 1024
const MOBILE_WIDTH = 480

function setViewportWidth(width: number) {
  Object.defineProperty(window, 'innerWidth', {
    writable: true,
    configurable: true,
    value: width,
  })

  window.matchMedia = vi.fn().mockImplementation((query: string) => ({
    matches: width < 768,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })) as unknown as typeof window.matchMedia
}

beforeEach(() => {
  mocks.pathname = '/'
  setViewportWidth(DESKTOP_WIDTH)
})

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
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
    expect(screen.getByTestId('sidebar-provider')).toHaveClass('fixed', 'inset-0')
    expect(screen.getByRole('button', { name: '소싱' })).not.toHaveClass('border-[color:var(--border-strong)]')
  })

  it('does not mark the sourcing section active outside sourcing routes', () => {
    mocks.pathname = '/products'

    render(React.createElement(Nav))

    expect(screen.getByRole('link', { name: '상품 관리' })).toHaveAttribute('aria-current', 'page')
    expect(screen.getByRole('button', { name: '소싱' })).not.toHaveClass('border-[color:var(--border-strong)]')
  })

  it('opens the mobile drawer and renders the same information architecture', async () => {
    setViewportWidth(MOBILE_WIDTH)
    render(React.createElement(Nav))

    fireEvent.click(screen.getByRole('button', { name: '메뉴 열기' }))

    const drawer = await screen.findByRole('dialog', { name: '모바일 메뉴' })
    expect(drawer).toBeTruthy()
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

  it('shows the logged-in user profile summary when user data is provided', async () => {
    setViewportWidth(MOBILE_WIDTH)
    render(React.createElement(Nav, { user: { name: '홍길동', email: 'hong@example.com' } }))

    fireEvent.click(screen.getByRole('button', { name: '메뉴 열기' }))
    await screen.findByRole('dialog', { name: '모바일 메뉴' })

    // Open the profile dropdown menu to show both profile locations (sidebar footer + dropdown content)
    fireEvent.pointerDown(screen.getAllByRole('button', { name: /홍길동/ })[0], { button: 0, ctrlKey: false })

    expect(screen.getAllByText('홍길동')).toHaveLength(2)
    expect(screen.getAllByText('hong@example.com')).toHaveLength(2)
  })

  it('keeps the API settings deep link in the account menu on desktop and mobile without a separate parse-template entry', async () => {
    render(React.createElement(Nav, { user: { name: '홍길동', email: 'hong@example.com' } }))

    fireEvent.pointerDown(screen.getAllByRole('button', { name: /홍길동/ })[0], { button: 0, ctrlKey: false })
    expect(screen.getByRole('menuitem', { name: 'API 설정' }).getAttribute('href')).toBe('/settings?section=store-connections')
    expect(screen.queryByRole('menuitem', { name: '파싱 템플릿' })).toBeNull()
    expect(screen.getByText('로그아웃')).toBeTruthy()

    cleanup()
    setViewportWidth(MOBILE_WIDTH)
    render(React.createElement(Nav, { user: { name: '홍길동', email: 'hong@example.com' } }))
    fireEvent.click(screen.getByRole('button', { name: '메뉴 열기' }))
    const mobileMenu = within(await screen.findByRole('dialog', { name: '모바일 메뉴' }))
    fireEvent.pointerDown(mobileMenu.getByRole('button', { name: /홍길동/ }), { button: 0, ctrlKey: false })
    expect(screen.getAllByRole('menuitem', { name: 'API 설정' }).some((item) => item.getAttribute('href') === '/settings?section=store-connections')).toBe(true)
    expect(screen.queryAllByRole('menuitem', { name: '파싱 템플릿' })).toHaveLength(0)
  })
})

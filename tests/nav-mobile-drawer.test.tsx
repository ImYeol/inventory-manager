// @vitest-environment jsdom
import '@testing-library/jest-dom'
import React from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'

vi.mock('next/navigation', () => ({
  usePathname: vi.fn(() => '/'),
}))

import Nav from '@/app/components/Nav'

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

function renderMobileNav() {
  return render(
    <Nav
      user={{
        name: 'Test User',
        email: 'test@example.com',
      }}
    />,
  )
}

describe('Nav mobile drawer accessibility', () => {
  beforeEach(() => {
    setViewportWidth(MOBILE_WIDTH)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('opens drawer on trigger click and focus moves into drawer', async () => {
    renderMobileNav()

    // Get the hamburger trigger button
    const triggerButton = screen.getByRole('button', { name: '메뉴 열기' })

    // Initially, drawer should not be visible
    expect(screen.queryByRole('dialog', { name: '모바일 메뉴' })).not.toBeInTheDocument()

    // Open the drawer
    fireEvent.click(triggerButton)

    // Drawer should now be visible
    const drawer = await screen.findByRole('dialog', { name: '모바일 메뉴' })
    expect(drawer).toBeInTheDocument()

    // Focus should move into the drawer
    const hasDrawerFocus = drawer.contains(document.activeElement) || document.activeElement === drawer
    expect(hasDrawerFocus).toBe(true)
  })

  it('restores focus to trigger when drawer is closed via its close control', async () => {
    renderMobileNav()

    const triggerButton = screen.getByRole('button', { name: '메뉴 열기' })

    // Open the drawer
    fireEvent.click(triggerButton)
    expect(await screen.findByRole('dialog', { name: '모바일 메뉴' })).toBeInTheDocument()

    // Close the drawer by clicking the close button
    const closeButton = screen.getByRole('button', { name: '메뉴 닫기' })
    fireEvent.click(closeButton)

    // Drawer should be closed
    expect(screen.queryByRole('dialog', { name: '모바일 메뉴' })).not.toBeInTheDocument()

    // Focus should return to the trigger button
    await waitFor(() => expect(document.activeElement).toBe(triggerButton))
  })

  it('closes drawer when clicking the close button', async () => {
    renderMobileNav()

    const triggerButton = screen.getByRole('button', { name: '메뉴 열기' })
    expect(triggerButton).toBeTruthy()

    // Open the drawer
    fireEvent.click(triggerButton)
    expect(await screen.findByRole('dialog', { name: '모바일 메뉴' })).toBeInTheDocument()

    // Click the close button
    const closeButton = screen.getByRole('button', { name: '메뉴 닫기' })
    fireEvent.click(closeButton)

    // Drawer should be closed
    expect(screen.queryByRole('dialog', { name: '모바일 메뉴' })).not.toBeInTheDocument()

    // Focus should return to trigger button
    const triggerButtonAfterClose = screen.getByRole('button', { name: '메뉴 열기' })
    await waitFor(() => expect(document.activeElement).toBe(triggerButtonAfterClose))
  })

  it('has proper aria-modal attribute on the dialog element', async () => {
    renderMobileNav()

    const triggerButton = screen.getByRole('button', { name: '메뉴 열기' })

    // Open the drawer
    fireEvent.click(triggerButton)

    const drawer = await screen.findByRole('dialog', { name: '모바일 메뉴' })
    expect(drawer).toBeInTheDocument()

    // The drawer should declare aria-modal="true" to properly indicate it's a modal
    expect(drawer).toHaveAttribute('aria-modal', 'true')
  })
})

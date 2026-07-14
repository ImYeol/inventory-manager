// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'

const mocks = vi.hoisted(() => ({ getOrdersWorkspaceData: vi.fn() }))
vi.mock('@/lib/actions/order-sync', () => ({ getOrdersWorkspaceData: mocks.getOrdersWorkspaceData }))

import OrdersPage from '@/app/(protected)/orders/page'

describe('OrdersPage', () => {
  it('renders the orders table owner with fixed views and minimal filters', async () => {
    mocks.getOrdersWorkspaceData.mockResolvedValue([])
    render(await OrdersPage())
    expect(screen.getByRole('heading', { name: '주문' })).toBeTruthy()
    expect(screen.getByText('출고 준비')).toBeTruthy()
    expect(screen.getByText('확인 필요')).toBeTruthy()
  })
})

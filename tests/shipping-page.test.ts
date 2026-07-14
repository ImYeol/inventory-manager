import { describe, expect, it, vi } from 'vitest'

const redirect = vi.hoisted(() => vi.fn())
vi.mock('next/navigation', () => ({ redirect }))

import ShippingPage from '@/app/(protected)/shipping/page'

describe('ShippingPage', () => {
  it('redirects the legacy shipping route to the orders-owned tracking import', async () => {
    await ShippingPage()
    expect(redirect).toHaveBeenCalledWith('/orders/tracking-import')
  })
})

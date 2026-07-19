import { describe, expect, it, vi } from 'vitest'

const redirect = vi.hoisted(() => vi.fn())

vi.mock('next/navigation', () => ({ redirect }))

import SourcingPage from '@/app/(protected)/sourcing/page'

describe('SourcingPage', () => {
  it('opens the canonical arrival workspace by default', () => {
    SourcingPage()

    expect(redirect).toHaveBeenCalledWith('/sourcing/arrivals')
  })
})

// @vitest-environment jsdom
import React from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'

const mocks = vi.hoisted(() => ({
  refresh: vi.fn(),
  createFactory: vi.fn(),
  setFactoryActive: vi.fn(),
}))

vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: mocks.refresh }),
}))

vi.mock('@/lib/actions', () => ({
  createFactory: mocks.createFactory,
  setFactoryActive: mocks.setFactoryActive,
}))

import FactoriesView from '@/app/(protected)/sourcing/factories/FactoriesView'

beforeEach(() => {
  Object.values(mocks).forEach((mock) => mock.mockReset())
})

describe('FactoriesView', () => {
  it('creates and toggles factories', async () => {
    mocks.createFactory.mockResolvedValue({ success: true })
    mocks.setFactoryActive.mockResolvedValue({ success: true })

    render(
      React.createElement(FactoriesView, {
        factories: [
          {
            id: 1,
            name: '광주 협력사',
            contactName: '홍길동',
            phone: '010-1111-2222',
            email: null,
            notes: null,
            isActive: true,
            arrivalCount: 2,
            pendingQuantity: 24,
          },
        ],
      }),
    )

    fireEvent.change(screen.getByPlaceholderText('예: 광주 봉제 협력사'), { target: { value: '부산 협력사' } })
    fireEvent.click(screen.getByRole('button', { name: '공장 등록' }))

    await waitFor(() => expect(mocks.createFactory).toHaveBeenCalledWith(expect.objectContaining({ name: '부산 협력사' })))

    fireEvent.click(screen.getByRole('button', { name: '비활성화' }))
    await waitFor(() => expect(mocks.setFactoryActive).toHaveBeenCalledWith(1, false))
  })
})

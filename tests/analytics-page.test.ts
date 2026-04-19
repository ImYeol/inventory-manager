// @vitest-environment jsdom
import React from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'

const mocks = vi.hoisted(() => ({
  getAnalyticsData: vi.fn(),
  analyticsView: vi.fn(),
}))

vi.mock('@/lib/data', () => ({
  getAnalyticsData: mocks.getAnalyticsData,
}))

vi.mock('@/app/(protected)/analytics/AnalyticsView', () => ({
  default: (props: { models: unknown; initialSummary: unknown }) => {
    mocks.analyticsView(props)
    return React.createElement('div', { 'data-testid': 'analytics-view' })
  },
}))

import AnalyticsPage from '@/app/(protected)/analytics/page'

afterEach(() => {
  cleanup()
  mocks.getAnalyticsData.mockReset()
  mocks.analyticsView.mockReset()
})

describe('AnalyticsPage', () => {
  it('renders a concise analytics shell and passes shared summary data to the view', async () => {
    const models = [{ id: 1, name: 'LP01' }]
    const inventorySummary = [{ modelName: 'LP01', total: 12 }]
    mocks.getAnalyticsData.mockResolvedValue({ models, inventorySummary })

    render(await AnalyticsPage())

    expect(screen.getByRole('heading', { name: '재고 분석' })).toBeTruthy()
    expect(screen.getByText('기간, 모델, 창고 단위로 재고 흐름을 정리합니다.')).toBeTruthy()
    expect(screen.getByTestId('analytics-view')).toBeTruthy()
    expect(mocks.analyticsView).toHaveBeenCalledWith(expect.objectContaining({ models, initialSummary: inventorySummary }))
  })
})

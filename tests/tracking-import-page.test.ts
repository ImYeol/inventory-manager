// @vitest-environment jsdom
import React from 'react'
import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import fs from 'node:fs'
import path from 'node:path'

const mocks = vi.hoisted(() => ({
  listTrackingPresets: vi.fn(),
}))
vi.mock('@/lib/actions/tracking-import', () => ({
  listTrackingPresets: mocks.listTrackingPresets,
}))

import TrackingImportPage from '@/app/(protected)/orders/tracking-import/page'
import TrackingImportWorkspace from '@/app/(protected)/orders/tracking-import/tracking-import-workspace'

describe('TrackingImportWorkspace', () => {
  it('provides an explicit canonical return link to orders in the page header', async () => {
    mocks.listTrackingPresets.mockResolvedValue([])

    render(await TrackingImportPage())

    const returnLink = screen.getByRole('link', { name: '주문으로' })
    expect(returnLink.getAttribute('href')).toBe('/orders')
    expect(returnLink.querySelector('[aria-hidden="true"]')).toBeTruthy()
  })

  it('shows the file-to-dispatch workflow and reuses a dense preview surface', () => {
    render(React.createElement(TrackingImportWorkspace))
    expect(screen.getByText('파일 → 시트/헤더 → 컬럼 매핑 → 미리보기 → 발송')).toBeTruthy()
    expect(screen.getByLabelText('송장 파일')).toBeTruthy()
    expect(screen.getByText('분류 미리보기').closest('section')?.className).toContain('ui-data-surface')
    expect((screen.getByRole('button', { name: '검증' }) as HTMLButtonElement).disabled).toBe(true)
    const source = fs.readFileSync(path.resolve(process.cwd(), 'src/app/(protected)/orders/tracking-import/tracking-import-workspace.tsx'), 'utf8')
    expect(source).toContain('previewTrackingImport')
    expect(source).toContain('finalizeTrackingImport')
    expect(source).toContain('시트 선택')
    expect(source).toContain('헤더 행')
    expect(source).toContain('saveTrackingPreset')
    expect(source).toContain("from '@/components/ui/button'")
    expect(source).not.toMatch(/ui-button-(?:primary|secondary)/)
  })
})

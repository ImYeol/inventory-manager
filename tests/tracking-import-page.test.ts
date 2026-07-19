// @vitest-environment jsdom
import React from 'react'
import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import fs from 'node:fs'
import path from 'node:path'

const redirect = vi.hoisted(() => vi.fn())
vi.mock('next/navigation', () => ({ redirect }))

import TrackingImportPage from '@/app/(protected)/orders/tracking-import/page'
import TrackingImportWorkspace from '@/app/(protected)/orders/tracking-import/tracking-import-workspace'

describe('TrackingImportPage', () => {
  it('redirects the legacy standalone route to /orders now that the flow lives in the orders FixedSheet modal', () => {
    TrackingImportPage()
    expect(redirect).toHaveBeenCalledWith('/orders')
  })
})

describe('TrackingImportWorkspace', () => {
  it('shows the file-to-dispatch workflow with a drag-and-drop file input and reuses a dense preview surface', () => {
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
    expect(source).toContain('FileDropInput')
    expect(source).not.toMatch(/<input[^>]*type="file"/)
  })
})

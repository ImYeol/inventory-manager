// @vitest-environment jsdom
import React from 'react'
import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import TrackingImportWorkspace from '@/app/(protected)/orders/tracking-import/tracking-import-workspace'

describe('TrackingImportWorkspace', () => {
  it('shows the file-to-dispatch workflow and reuses a dense preview surface', () => {
    render(React.createElement(TrackingImportWorkspace))
    expect(screen.getByText('파일 → 시트/헤더 → 컬럼 매핑 → 미리보기 → 발송')).toBeTruthy()
    expect(screen.getByLabelText('송장 파일')).toBeTruthy()
    expect(screen.getByText('분류 미리보기').closest('section')?.className).toContain('ui-data-surface')
  })
})

// @vitest-environment jsdom
import React from 'react'
import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'

import SettingsView from '@/app/(protected)/settings/SettingsView'

afterEach(() => {
  cleanup()
})

describe('SettingsView', () => {
  it('renders settings as an admin hub and points store connections to /integrations', () => {
    render(React.createElement(SettingsView))

    expect(screen.getByText('설정은 기준 데이터와 운영 진입점만 제공합니다.')).toBeTruthy()
    expect(screen.getByText('네이버와 쿠팡 연결 정보는 `/integrations`에서만 수정합니다.')).toBeTruthy()
    expect(screen.getByRole('heading', { name: '기준 데이터' })).toBeTruthy()
    expect(screen.getByRole('heading', { name: '스토어 연결' })).toBeTruthy()
    expect(screen.getByText('연결 상태와 자격증명 편집은 `/integrations`에서만 처리합니다.')).toBeTruthy()
  })
})

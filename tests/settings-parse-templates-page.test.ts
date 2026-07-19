// @vitest-environment jsdom
import React from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'

const mocks = vi.hoisted(() => ({
  getActiveInboundTemplates: vi.fn(),
  listTrackingPresets: vi.fn(),
  createInboundTemplateVersion: vi.fn(),
  inspectInboundTemplateSample: vi.fn(),
  saveTrackingPreset: vi.fn(),
  refresh: vi.fn(),
}))

vi.mock('@/lib/data', () => ({ getActiveInboundTemplates: mocks.getActiveInboundTemplates }))
vi.mock('@/lib/actions/tracking-import', () => ({ listTrackingPresets: mocks.listTrackingPresets, saveTrackingPreset: mocks.saveTrackingPreset }))
vi.mock('@/lib/actions/inbound-import', () => ({ createInboundTemplateVersion: mocks.createInboundTemplateVersion, inspectInboundTemplateSample: mocks.inspectInboundTemplateSample }))
vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh: mocks.refresh }) }))
vi.mock('next/link', () => ({
  default: ({ href, children, className }: { href: string; children: React.ReactNode; className?: string }) =>
    React.createElement('a', { href, className }, children),
}))

import SettingsParseTemplatesPage from '@/app/(protected)/settings/parse-templates/page'
import ParseTemplatesSettingsView from '@/app/(protected)/settings/parse-templates/ParseTemplatesSettingsView'

afterEach(() => {
  cleanup()
  Object.values(mocks).forEach((mock) => mock.mockReset())
})

describe('SettingsParseTemplatesPage', () => {
  it('lists inbound parse templates and tracking parse presets under Settings ownership', async () => {
    mocks.getActiveInboundTemplates.mockResolvedValue([{ id: 7, name: '중국 공장 기본', versionId: 11, versionNumber: 2 }])
    mocks.listTrackingPresets.mockResolvedValue([{ id: 5, name: '내 프리셋', channel: null, mapping: { orderNumber: '주문번호', trackingNumber: '운송장번호', carrier: '', recipientName: '', address: '', shippedAt: '' } }])

    render(await SettingsParseTemplatesPage())

    expect(screen.getByRole('heading', { name: '파싱 템플릿' })).toBeTruthy()
    expect(screen.getByRole('heading', { name: '입고 파싱 템플릿' })).toBeTruthy()
    expect(screen.getByRole('heading', { name: '주문 송장 파싱 프리셋' })).toBeTruthy()
    expect(screen.getByText('중국 공장 기본')).toBeTruthy()
    expect(screen.getByText('v2')).toBeTruthy()
    expect(screen.getByText('내 프리셋')).toBeTruthy()
    expect(screen.getByText('쿠팡 송장')).toBeTruthy()
    const returnLink = screen.getByRole('link', { name: /설정으로/ })
    expect(returnLink.getAttribute('href')).toBe('/settings')
  })
})

describe('ParseTemplatesSettingsView', () => {
  it('creates a new inbound parse-template version from a sample file', async () => {
    mocks.inspectInboundTemplateSample.mockResolvedValue({ sheets: [{ name: '입고', rows: [['외부 SKU', '수량'], ['EXT-1', '3']] }] })
    mocks.createInboundTemplateVersion.mockResolvedValue({ id: 7, name: '중국 공장 기본', versionId: 12, versionNumber: 3 })

    render(React.createElement(ParseTemplatesSettingsView, {
      inboundTemplates: [{ id: 7, name: '중국 공장 기본', versionId: 11, versionNumber: 2 }],
      trackingPresets: [],
    }))

    fireEvent.click(screen.getByRole('button', { name: '새 버전 만들기' }))
    const dialog = await screen.findByRole('dialog', { name: /새 버전/ })
    const file = new File(['contents'], 'sample.xlsx')
    fireEvent.change(screen.getByLabelText('샘플 파일'), { target: { files: [file] } })
    await waitFor(() => expect(mocks.inspectInboundTemplateSample).toHaveBeenCalledWith(file))

    fireEvent.click(screen.getByRole('combobox', { name: '외부 SKU 열' }))
    fireEvent.click(await screen.findByRole('option', { name: '외부 SKU' }))
    fireEvent.click(screen.getByRole('combobox', { name: '수량 열' }))
    fireEvent.click(await screen.findByRole('option', { name: '수량' }))

    const saveButton = within(dialog).getByRole('button', { name: '버전 저장' })
    fireEvent.click(saveButton)
    await waitFor(() => expect(mocks.createInboundTemplateVersion).toHaveBeenCalledWith(expect.objectContaining({
      templateId: 7, name: '중국 공장 기본', sheetName: '입고', headerRowNumber: 1, mappings: { externalSku: '외부 SKU', quantity: '수량' },
    })))
  })

  it('clones a built-in tracking preset under a new name instead of mutating it', async () => {
    mocks.saveTrackingPreset.mockResolvedValue({ id: 9, name: '쿠팡 송장 복사본', channel: null, mapping: {} })

    render(React.createElement(ParseTemplatesSettingsView, { inboundTemplates: [], trackingPresets: [] }))

    fireEvent.click(screen.getAllByRole('button', { name: '복제해서 새 프리셋 만들기' })[0])
    const dialog = await screen.findByRole('dialog', { name: '파싱 프리셋 복제' })
    expect((within(dialog).getByLabelText('새 프리셋 이름') as HTMLInputElement).value).toBe('쿠팡 송장 복사본')
    fireEvent.click(within(dialog).getByRole('button', { name: '프리셋 저장' }))
    await waitFor(() => expect(mocks.saveTrackingPreset).toHaveBeenCalledWith(expect.objectContaining({ name: '쿠팡 송장 복사본' })))
  })
})

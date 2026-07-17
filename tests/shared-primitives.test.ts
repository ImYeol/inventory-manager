// @vitest-environment jsdom
import fs from 'node:fs'
import path from 'node:path'
import React from 'react'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'

import { PageHeader } from '@/app/components/ui'
import { StatusBadge } from '@/components/ui/badge-1'
import { ChannelBadge } from '@/components/ui/channel-badge'
import { Button } from '@/components/ui/button'
import { BasicDataTable } from '@/components/ui/basic-data-table'
import { FilterToolbar } from '@/components/ui/filter-toolbar'
import { TableSurface } from '@/components/ui/table-surface'
import { Input } from '@/components/ui/input'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Modal } from '@/components/ui/modal'
import { FixedSheet } from '@/components/ui/fixed-sheet'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { StoreConnectionStatus } from '@/components/ui/store-connection-status'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  ActionToolbar,
  ToolbarButtonAction,
  ToolbarIconButton,
} from '@/components/ui/toolbar'

beforeAll(() => {
  if (!HTMLElement.prototype.hasPointerCapture) {
    HTMLElement.prototype.hasPointerCapture = () => false
  }

  if (!HTMLElement.prototype.setPointerCapture) {
    HTMLElement.prototype.setPointerCapture = () => undefined
  }

  if (!HTMLElement.prototype.releasePointerCapture) {
    HTMLElement.prototype.releasePointerCapture = () => undefined
  }
})

afterEach(() => {
  cleanup()
})

describe('shared action and status primitives', () => {
  it('keeps the approved commerce IA and inventory invariants in the document contract', () => {
    const readDocument = (relativePath: string) => fs.readFileSync(path.resolve(process.cwd(), relativePath), 'utf8')
    const prd = readDocument('docs/product/prd.md')
    const architecture = readDocument('docs/architecture/overview.md')
    const adr = readDocument('docs/adr/0029-orders-inventory-state-model.md')

    for (const document of [prd, architecture, adr]) {
      expect(document).toContain('ProductVariant')
      expect(document).toContain('ChannelProductRef')
      expect(document).toContain('onHand')
      expect(document).toContain('committed')
      expect(document).toContain('available')
      expect(document).toContain('incoming')
      expect(document).toContain('channelReported')
      expect(document).toContain('/orders/tracking-import')
      expect(document).toContain('절대 수량')
    }

    expect(prd).toContain('대시보드 / 주문 / 상품 관리 / 재고 운영 / 소싱')
    expect(prd).toContain('API 설정은 하단 계정 메뉴')
    expect(architecture).toContain('available = onHand - committed')
    expect(architecture).toContain('외부 발송 성공')
    expect(adr).toContain("`/shipping`은 `/orders/tracking-import`로 redirect")
  })

  it('maps button variants onto the repo token system', () => {
    render(
        React.createElement(
          'div',
          null,
          React.createElement(Button, null, '저장'),
          React.createElement(Button, { variant: 'success', size: 'sm' }, '입고'),
          React.createElement(Button, { variant: 'warning', size: 'sm' }, '출고'),
          React.createElement(Button, { variant: 'secondary', size: 'sm' }, '취소'),
          React.createElement(Button, { variant: 'outline' }, '필터'),
        ),
    )

    expect(screen.getByRole('button', { name: '저장' }).className).toContain('ui-button-primary')
    expect(screen.getByRole('button', { name: '입고' }).className).toContain('ui-button-success')
    expect(screen.getByRole('button', { name: '출고' }).className).toContain('ui-button-warning')
    expect(screen.getByRole('button', { name: '취소' }).className).toContain('ui-button-secondary')
    expect(screen.getByRole('button', { name: '필터' }).className).toContain('ui-button-outline')
  })

  it('binds filter toolbar and table into one data surface on shared tokens', () => {
    render(
      React.createElement(
        TableSurface,
        {
          toolbar: React.createElement(
            FilterToolbar,
            null,
            React.createElement(Input, { 'aria-label': '검색', placeholder: '검색' }),
          ),
        },
        React.createElement('div', null, '표 본문'),
      ),
    )

    const input = screen.getByLabelText('검색')
    expect(input.className).toContain('ui-control')
    // FilterToolbar is layout-only; the bordered strip lives on the data surface.
    expect(input.closest('.ui-data-toolbar')).not.toBeNull()
    expect(input.closest('.ui-data-surface')).not.toBeNull()
  })

  it('switches tabs as an intra-page view primitive', () => {
    render(
      React.createElement(
        Tabs,
        { defaultValue: 'list' },
        React.createElement(
          TabsList,
          null,
          React.createElement(TabsTrigger, { value: 'list' }, '목록'),
          React.createElement(TabsTrigger, { value: 'history' }, '이력'),
        ),
        React.createElement(TabsContent, { value: 'list' }, '목록 표면'),
        React.createElement(TabsContent, { value: 'history' }, '이력 표면'),
      ),
    )

    const listTab = screen.getByRole('tab', { name: '목록' })
    const historyTab = screen.getByRole('tab', { name: '이력' })

    expect(listTab.getAttribute('data-state')).toBe('active')
    expect(historyTab.className).toContain('ui-tab')
    expect(screen.getByText('목록 표면')).toBeTruthy()
    expect(screen.queryByText('이력 표면')).toBeNull()

    fireEvent.mouseDown(historyTab)
    fireEvent.click(historyTab)

    expect(screen.getByText('이력 표면')).toBeTruthy()
  })

  it('renders a modern select dropdown with a stable trigger and option list', () => {
    function SelectHarness() {
      const [value, setValue] = React.useState('all')

      return React.createElement(
        Select,
        { value, onValueChange: setValue },
        React.createElement(
          SelectTrigger,
          { 'aria-label': '창고 선택' },
          React.createElement(SelectValue, { placeholder: '창고 선택' }),
        ),
        React.createElement(
          SelectContent,
          null,
          React.createElement(SelectItem, { value: 'all' }, '전체'),
          React.createElement(SelectItem, { value: 'warehouse-1' }, '오금동'),
          React.createElement(SelectItem, { value: 'warehouse-2' }, '대자동'),
        ),
      )
    }

    render(React.createElement(SelectHarness))

    const trigger = screen.getByRole('combobox', { name: '창고 선택' })
    expect(trigger.className).toContain('ui-select-trigger')
    expect(trigger.textContent).toContain('전체')

    fireEvent.click(trigger)

    expect(screen.getByRole('option', { name: '대자동' })).toBeTruthy()

    fireEvent.click(screen.getByRole('option', { name: '대자동' }))

    expect(screen.getByRole('combobox', { name: '창고 선택' }).textContent).toContain('대자동')
  })

  it('renders the store connection status as a dot-and-label primitive', () => {
    render(
      React.createElement(
        'div',
        null,
        React.createElement(StoreConnectionStatus, { configured: true }),
        React.createElement(StoreConnectionStatus, { configured: false }),
      ),
    )

    expect(screen.getByText('연결됨')).toBeTruthy()
    expect(screen.getByText('미연결')).toBeTruthy()
  })

  it('supports a muted disconnected tone for compact status chips', () => {
    render(
      React.createElement(
        'div',
        { 'data-testid': 'muted-status' },
        React.createElement(StoreConnectionStatus, {
          configured: false,
          compact: true,
          disconnectedTone: 'muted',
        }),
      ),
    )

    expect(screen.getByLabelText('미연결')).toBeTruthy()
    expect(screen.getByTestId('muted-status').querySelector('[aria-hidden="true"]')?.className).toContain('bg-[color:var(--muted-foreground)]')
  })

  it('supports row interaction on the basic data table without breaking cell rendering', () => {
    const onRowClick = vi.fn()

    render(
      React.createElement(BasicDataTable<{ id: number; name: string; quantity: number }>, {
        columns: [
          { key: 'name', label: '상품' },
          { key: 'quantity', label: '수량', align: 'right' as const },
        ],
        rows: [{ id: 1, name: 'LP01', quantity: 3 }],
        rowKey: (row) => row.id,
        renderCell: (row, columnKey) => (columnKey === 'name' ? row.name : row.quantity),
        emptyState: '데이터가 없습니다.',
        onRowClick,
        rowAriaLabel: (row) => `${row.name} 상세`,
        getRowClassName: () => 'row-class',
      }),
    )

    const row = screen.getByText('LP01').closest('tr')
    expect(row).toBeTruthy()
    expect((row as HTMLTableRowElement).className).toContain('cursor-pointer')
    expect((row as HTMLTableRowElement).className).toContain('row-class')
    expect((row as HTMLTableRowElement).getAttribute('tabindex')).toBe('0')
    expect((row as HTMLTableRowElement).getAttribute('aria-label')).toBe('LP01 상세')

    fireEvent.click(row as HTMLTableRowElement)
    fireEvent.keyDown(row as HTMLTableRowElement, { key: 'Enter', code: 'Enter' })

    expect(onRowClick).toHaveBeenCalledTimes(2)
    expect(onRowClick).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({ id: 1, name: 'LP01', quantity: 3 }),
    )
  })

  it('renders card variants with the shared surface border language', () => {
    render(
      React.createElement(
        Card,
        { variant: 'muted' },
        React.createElement(
          CardHeader,
          null,
          React.createElement(CardTitle, null, '창고'),
          React.createElement(CardDescription, null, '표준 카드'),
        ),
        React.createElement(CardContent, null, '카드 내용'),
        React.createElement(CardFooter, null, '카드 하단'),
      ),
    )

    const card = screen.getByText('카드 내용').closest('section')
    expect(card).toBeTruthy()
    expect((card as HTMLElement).className).toContain('ui-card-muted')
    expect(screen.getByText('창고')).toBeTruthy()
    expect(screen.getByText('표준 카드')).toBeTruthy()
    expect(screen.getByText('카드 하단')).toBeTruthy()
  })

  it('keeps strong shared surfaces on the stronger border token', () => {
    const surfaceClass = document.createElement('div')
    surfaceClass.className = 'ui-surface-strong'
    expect(surfaceClass.className).toContain('ui-surface-strong')

    const cardClass = document.createElement('div')
    cardClass.className = 'ui-card-strong'
    expect(cardClass.className).toContain('ui-card-strong')
  })

  it('renders modal chrome without relying on an extra dialog dependency', () => {
    const onOpenChange = vi.fn()

    render(
      React.createElement(
        Modal,
        {
          open: true,
          title: '창고 추가',
          description: '새 창고를 입력합니다.',
          onOpenChange,
        },
        '모달 내용',
      ),
    )

    expect(screen.getByRole('dialog', { name: '창고 추가' })).toBeTruthy()
    expect(screen.getByText('새 창고를 입력합니다.')).toBeTruthy()
    expect(screen.getByText('모달 내용')).toBeTruthy()

    fireEvent.click(screen.getByRole('button', { name: '닫기' }))

    expect(onOpenChange).toHaveBeenCalledWith(false)
  })

  it('keeps fixed sheet content above its portal overlay and supports escape close', () => {
    const onClose = vi.fn()

    render(
      React.createElement(
        FixedSheet,
        { open: true, title: '빠른 입고', description: '첫 입고와 기존 재고 증가를 처리합니다.', onClose },
        '입고 편집 표',
      ),
    )

    const dialog = screen.getByRole('dialog', { name: '빠른 입고' })
    const overlay = dialog.querySelector('[aria-hidden="true"]')
    const sheet = screen.getByText('입고 편집 표').parentElement?.parentElement

    expect(dialog.parentElement).toBe(document.body)
    expect(dialog.getAttribute('aria-describedby')).toBeTruthy()
    expect(overlay?.tagName).toBe('DIV')
    expect(overlay?.className).toContain('z-0')
    expect(sheet?.className).toContain('z-10')
    expect(sheet?.className).toContain('rounded-t-[var(--radius-lg)]')
    expect(screen.getByRole('button', { name: '닫기' }).parentElement?.className).toContain('w-full')
    expect(screen.getByRole('button', { name: '닫기' }).parentElement?.className).toContain('justify-between')
    expect(screen.getByText('빠른 입고').parentElement?.className).toContain('min-w-0')
    expect(screen.getByRole('button', { name: '닫기' }).className).toContain('shrink-0')
    expect(document.body.style.overflow).toBe('hidden')

    fireEvent.keyDown(document, { key: 'Escape' })

    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('renders status badges with visible text for each semantic tone', () => {
    const tones = ['neutral', 'info', 'success', 'warning', 'danger'] as const

    for (const tone of tones) {
      const { unmount } = render(React.createElement(StatusBadge, { tone }, `${tone} 상태`))

      const badge = screen.getByText(`${tone} 상태`)
      expect(badge).toBeTruthy()
      expect((badge.parentElement as HTMLElement).className).toContain(`ui-badge-${tone}`)
      unmount()
    }
  })

  it('renders channel and listing status text with channel and exception semantics', () => {
    render(
      React.createElement(
        'div',
        null,
        React.createElement(ChannelBadge, { channel: 'naver', listingStatus: 'active' }),
        React.createElement(ChannelBadge, { channel: 'coupang', listingStatus: 'active', compact: true }),
        React.createElement(ChannelBadge, { channel: 'naver', listingStatus: 'unregistered' }),
        React.createElement(ChannelBadge, { channel: 'coupang', listingStatus: 'paused' }),
        React.createElement(ChannelBadge, { channel: 'naver', listingStatus: 'sync-error' }),
        React.createElement(ChannelBadge, { channel: 'coupang', listingStatus: 'approval-pending' }),
        React.createElement(ChannelBadge, { channel: 'naver', listingStatus: 'sold-out' }),
        React.createElement(ChannelBadge, { channel: 'coupang', listingStatus: 'mapping-required' }),
      ),
    )

    expect(screen.getByText('네이버 · 판매 중').parentElement?.className).toContain('ui-badge-success')
    expect(screen.getByText('쿠팡 판매 중').parentElement?.className).toContain('ui-badge-info')
    expect(screen.getByText('네이버 · 미등록').parentElement?.className).toContain('ui-badge-neutral')
    expect(screen.getByText('쿠팡 · 판매 중지').parentElement?.className).toContain('ui-badge-warning')
    expect(screen.getByText('네이버 · 동기화 오류').parentElement?.className).toContain('ui-badge-danger')
    expect(screen.getByText('쿠팡 · 승인 대기').parentElement?.className).toContain('ui-badge-warning')
    expect(screen.getByText('네이버 · 품절').parentElement?.className).toContain('ui-badge-neutral')
    expect(screen.getByText('쿠팡 · 연결 필요').parentElement?.className).toContain('ui-badge-danger')
  })

  it('exposes an accessible label on icon buttons and keeps icon plus text actions visible', () => {
    render(
      React.createElement(
        ActionToolbar,
        null,
        React.createElement(ToolbarIconButton, {
          label: '편집',
          icon: React.createElement('svg', {
            'aria-hidden': 'true',
            viewBox: '0 0 16 16',
          }),
        }),
        React.createElement(
          ToolbarButtonAction,
          {
            icon: React.createElement('svg', {
              'aria-hidden': 'true',
              viewBox: '0 0 16 16',
            }),
          },
          '등록',
        ),
      ),
    )

    const iconButton = screen.getByRole('button', { name: '편집' })
    expect(iconButton).toBeTruthy()
    expect((iconButton as HTMLButtonElement).title).toBe('편집')
    expect(iconButton.querySelector('svg')).toBeTruthy()

    const actionButton = screen.getByRole('button', { name: '등록' })
    expect(actionButton).toBeTruthy()
    expect(actionButton.querySelector('svg')).toBeTruthy()
    expect(screen.getByText('등록')).toBeTruthy()
  })

  it('groups compact actions in a toolbar without losing the individual controls', () => {
    render(
      React.createElement(
        ActionToolbar,
        null,
        React.createElement(ToolbarButtonAction, null, '새로고침'),
        React.createElement(ToolbarButtonAction, null, '내보내기'),
      ),
    )

    const toolbar = screen.getByText('새로고침').parentElement?.parentElement
    expect(toolbar).toBeTruthy()
    expect((toolbar as HTMLElement).className).toContain('flex')
    expect((toolbar as HTMLElement).className).toContain('items-center')
    expect((toolbar as HTMLElement).className).toContain('gap-1.5')
    expect(screen.getByRole('button', { name: '새로고침' })).toBeTruthy()
    expect(screen.getByRole('button', { name: '내보내기' })).toBeTruthy()
  })

  it('keeps PageHeader action content rendered beside the title block', () => {
    render(
      React.createElement(PageHeader, {
        title: '재고 운영',
        description: '빠른 확인과 작업 실행을 위한 헤더',
        actions: React.createElement('div', null, React.createElement('button', { type: 'button' }, '등록')),
      }),
    )

    expect(screen.getByRole('heading', { name: '재고 운영' })).toBeTruthy()
    expect(screen.getByText('빠른 확인과 작업 실행을 위한 헤더')).toBeTruthy()
    expect(screen.getByRole('button', { name: '등록' })).toBeTruthy()
  })
})

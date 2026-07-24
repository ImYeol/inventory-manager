// @vitest-environment jsdom
import fs from 'node:fs'
import path from 'node:path'
import React from 'react'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'

import { PageHeader } from '@/app/components/ui'
import { StatusBadge } from '@/components/ui/badge-1'
import { ChannelBadge } from '@/components/ui/channel-badge'
import { Button } from '@/components/ui/button'
import { ButtonGroup } from '@/components/ui/button-group'
import { ColumnVisibilityMenu } from '@/components/ui/column-visibility-menu'
import { ActionRow, FilterToolbar, QueryRow } from '@/components/ui/filter-toolbar'
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

type TestModalProps = Omit<React.ComponentProps<typeof Modal>, 'children'> & { children?: React.ReactNode }
type TestToolbarActionProps = Omit<React.ComponentProps<typeof ToolbarButtonAction>, 'children'> & { children?: React.ReactNode }
const TestModal = Modal as React.ComponentType<TestModalProps>
const TestToolbarButtonAction = ToolbarButtonAction as React.ComponentType<TestToolbarActionProps>
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet'
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
  it('exposes the standalone query/action row contract without forced wrapping', () => {
    render(
      React.createElement(
        FilterToolbar,
        null,
        React.createElement(QueryRow, null, React.createElement(Input, { 'aria-label': '검색' })),
        React.createElement(ActionRow, null, React.createElement('span', null, '4건')),
      ),
    )

    expect(screen.getByLabelText('검색').closest('[data-slot="data-query-row"]')).toBeTruthy()
    expect(screen.getByText('4건').closest('[data-slot="data-action-row"]')).toBeTruthy()
    expect(screen.getByText('4건').closest('[data-slot="data-action-row"]')?.className).toContain('justify-between')
    expect(screen.getByText('4건').closest('[data-slot="data-action-row"]')?.className).not.toContain('flex-wrap')
  })

  it('keeps related actions grouped and the column control intrinsic width', () => {
    render(
      React.createElement(
        'div',
        null,
        React.createElement(
          ButtonGroup,
          null,
          React.createElement(Button, { variant: 'outline', size: 'sm' }, '입고'),
          React.createElement(Button, { variant: 'outline', size: 'sm' }, '출고'),
        ),
        React.createElement(ColumnVisibilityMenu, {
          columns: [{ key: 'name', label: '상품명' }],
          visibleColumns: new Set(['name']),
          onToggle: vi.fn(),
        }),
      ),
    )

    expect(screen.getByRole('group').getAttribute('data-slot')).toBe('button-group')
    const columnButton = screen.getByRole('button', { name: '컬럼' })
    expect(columnButton.className).toContain('w-fit')
    expect(columnButton.className).toContain('shrink-0')
  })

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

  it('keeps FilterToolbar layout-only when a caller explicitly places it in a TableSurface slot', () => {
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

  it('keeps TableSurface controls optional and its canonical surface limited to table chrome', () => {
    render(
      React.createElement(
        'div',
        null,
        React.createElement(FilterToolbar, null, React.createElement(Input, { 'aria-label': '검색' })),
        React.createElement(TableSurface, null, React.createElement('div', { 'data-testid': 'table-body' }, '표 본문')),
      ),
    )

    const surface = screen.getByTestId('table-body').closest('.ui-data-surface')
    expect(surface).toBeTruthy()
    expect(surface?.querySelector('.ui-data-toolbar')).toBeNull()
    expect(screen.getByLabelText('검색').closest('.ui-data-surface')).toBeNull()
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
        TestModal,
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

  const renderSheet = (props: { open: boolean; onOpenChange: (open: boolean) => void }, children: React.ReactNode) =>
    React.createElement(Sheet, { open: props.open, onOpenChange: props.onOpenChange },
      React.createElement(SheetContent, { side: 'right', className: 'sm:max-w-xl' },
        React.createElement(SheetHeader, null,
          React.createElement(SheetTitle, null, '빠른 입고'),
          React.createElement(SheetDescription, null, '첫 입고와 기존 재고 증가를 처리합니다.'),
        ),
        children,
      ),
    )

  it('portals sheet content to body with an accessible title/description and supports escape close', async () => {
    const onOpenChange = vi.fn()

    render(renderSheet({ open: true, onOpenChange }, '입고 편집 표'))

    const dialog = await screen.findByRole('dialog', { name: '빠른 입고' })

    expect(document.body.contains(dialog)).toBe(true)
    expect(dialog.getAttribute('aria-describedby')).toBeTruthy()
    expect(screen.getByText('입고 편집 표')).toBeTruthy()

    fireEvent.keyDown(document, { key: 'Escape' })

    await waitFor(() => expect(onOpenChange).toHaveBeenCalled())
    expect(onOpenChange.mock.calls[0][0]).toBe(false)
  })

  it('closes the sheet when the overlay is clicked', async () => {
    const onOpenChange = vi.fn()

    render(renderSheet({ open: true, onOpenChange }, '입고 편집 표'))
    await screen.findByRole('dialog', { name: '빠른 입고' })

    const overlay = document.querySelector('[data-slot="sheet-overlay"]') as HTMLElement
    expect(overlay).toBeTruthy()
    fireEvent.click(overlay)

    await waitFor(() => expect(onOpenChange).toHaveBeenCalled())
    expect(onOpenChange.mock.calls[0][0]).toBe(false)
  })

  it('returns focus to the opening control after the sheet closes', async () => {
    function Example() {
      const [open, setOpen] = React.useState(false)
      return React.createElement('div', null,
        React.createElement('button', { onClick: () => setOpen(true) }, '입고 열기'),
        renderSheet({ open, onOpenChange: setOpen }, React.createElement('input', { 'aria-label': '입고 수량' })),
      )
    }

    render(React.createElement(Example))
    const trigger = screen.getByRole('button', { name: '입고 열기' })
    trigger.focus()
    fireEvent.click(trigger)

    await screen.findByRole('dialog', { name: '빠른 입고' })
    fireEvent.click(screen.getByRole('button', { name: '닫기' }))

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    await waitFor(() => expect(document.activeElement).toBe(trigger))
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
          TestToolbarButtonAction,
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
    expect((toolbar as HTMLElement).className).toContain('gap-2')
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

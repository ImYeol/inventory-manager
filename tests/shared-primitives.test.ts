// @vitest-environment jsdom
import React from 'react'
import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'

import { PageHeader } from '@/app/components/ui'
import { StatusBadge } from '@/components/ui/badge-1'
import {
  ActionToolbar,
  ToolbarButtonAction,
  ToolbarIconButton,
} from '@/components/ui/toolbar'

afterEach(() => {
  cleanup()
})

describe('shared action and status primitives', () => {
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

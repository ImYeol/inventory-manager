import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import {
  DialogDescription,
  DialogTitle,
  WorkDialog,
  WorkDialogBody,
  WorkDialogContent,
  WorkDialogFooter,
  WorkDialogHeader,
} from '@/components/ui/dialog'

afterEach(() => cleanup())

describe('WorkDialog responsive foundation', () => {
  it('composes an accessible wide desktop dialog with a scrollable body and stable footer', () => {
    render(
      <WorkDialog open onOpenChange={() => {}}>
        <WorkDialogContent>
          <WorkDialogHeader>
            <DialogTitle>입고 예정 추가</DialogTitle>
            <DialogDescription>입고 예정 정보를 입력합니다.</DialogDescription>
          </WorkDialogHeader>
          <WorkDialogBody>긴 입력 테이블</WorkDialogBody>
          <WorkDialogFooter>저장</WorkDialogFooter>
        </WorkDialogContent>
      </WorkDialog>,
    )

    const dialog = screen.getByRole('dialog', { name: '입고 예정 추가' })
    const description = screen.getByText('입고 예정 정보를 입력합니다.')
    const body = screen.getByText('긴 입력 테이블')
    const footer = screen.getByText('저장')

    expect(dialog).toHaveAttribute('aria-describedby', description.id)
    expect(dialog).toHaveAttribute('data-slot', 'work-dialog-content')
    expect(dialog).toHaveClass('sm:max-w-[min(960px,calc(100%-2rem))]')
    expect(dialog).toHaveClass('sm:rounded-[var(--radius-overlay)]')
    expect(body).toHaveAttribute('data-slot', 'work-dialog-body')
    expect(body).toHaveClass('min-h-0', 'overflow-y-auto')
    expect(footer).toHaveAttribute('data-slot', 'work-dialog-footer')
  })

  it('uses an inset-free full-screen mobile layout without changing the Dialog API', () => {
    render(
      <WorkDialog open onOpenChange={() => {}}>
        <WorkDialogContent>
          <WorkDialogHeader>
            <DialogTitle>송장 등록</DialogTitle>
          </WorkDialogHeader>
          <WorkDialogBody>파일 입력</WorkDialogBody>
          <WorkDialogFooter>등록</WorkDialogFooter>
        </WorkDialogContent>
      </WorkDialog>,
    )

    const dialog = screen.getByRole('dialog', { name: '송장 등록' })
    expect(dialog).toHaveClass('inset-0', 'max-h-none', 'rounded-none')
    expect(dialog).toHaveClass('min-h-[100dvh]', 'h-[100dvh]')
    expect(dialog).toHaveClass('min-w-0', 'max-w-[100vw]', 'overflow-x-hidden')
    expect(screen.getByText('파일 입력')).toBeInTheDocument()
    expect(screen.getByText('등록')).toBeInTheDocument()
  })

  it('preserves the base Dialog exports for existing consumers', () => {
    expect(WorkDialog).toBeDefined()
    expect(WorkDialogContent).toBeDefined()
    expect(DialogTitle).toBeDefined()
    expect(DialogDescription).toBeDefined()
  })
})

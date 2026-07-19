"use client"

import { useEffect, useId, useRef, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'

import { cn } from '@/lib/utils'
import { ui } from '@/app/components/ui'
import { Button } from './button'

type FixedSheetProps = {
  open: boolean
  title: string
  description?: ReactNode
  onClose: () => void
  children: ReactNode
  className?: string
}

export function FixedSheet({ open, title, description, onClose, children, className }: FixedSheetProps) {
  const titleId = useId()
  const descriptionId = useId()
  const dialogRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLElement | null>(null)
  const onCloseRef = useRef(onClose)

  useEffect(() => {
    onCloseRef.current = onClose
  }, [onClose])

  useEffect(() => {
    if (!open) return

    triggerRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const focusableSelector = 'button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [href], [tabindex]:not([tabindex="-1"])'
    const focusSheet = window.requestAnimationFrame(() => {
      const firstAction = dialogRef.current?.querySelector<HTMLElement>(focusableSelector)
      ;(firstAction ?? dialogRef.current)?.focus()
    })

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onCloseRef.current()
        return
      }
      if (event.key !== 'Tab' || !dialogRef.current) return
      const focusable = [...dialogRef.current.querySelectorAll<HTMLElement>(focusableSelector)]
        .filter((element) => !element.hasAttribute('hidden') && element.getAttribute('aria-hidden') !== 'true')
      if (!focusable.length) {
        event.preventDefault()
        dialogRef.current.focus()
        return
      }
      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      if (event.shiftKey && (document.activeElement === first || document.activeElement === dialogRef.current)) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && (document.activeElement === last || document.activeElement === dialogRef.current)) {
        event.preventDefault()
        first.focus()
      }
    }

    document.addEventListener('keydown', handleKeyDown)

    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      document.body.style.overflow = previousOverflow
      window.cancelAnimationFrame(focusSheet)
      triggerRef.current?.focus()
    }
  }, [open])

  if (!open) return null

  return createPortal(
    <div ref={dialogRef} tabIndex={-1} className="fixed inset-0 z-[60] outline-none" role="dialog" aria-modal="true" aria-labelledby={titleId} aria-describedby={description ? descriptionId : undefined}>
      <div aria-hidden="true" onClick={onClose} className={cn(ui.modalOverlay, '!z-0 cursor-default')} />
      <div
        className={cn(
          ui.surfaceStrong,
          'absolute inset-x-0 bottom-0 top-10 z-10 overflow-hidden rounded-t-[var(--radius-lg)] md:inset-x-[max(2rem,calc(50%-32rem))] md:bottom-8 md:top-8 md:rounded-[var(--radius-lg)]',
          className,
        )}
      >
        <div className="flex h-full flex-col">
          <div className={ui.modalHeader}>
            <div className="flex w-full items-start justify-between gap-4">
              <div className="min-w-0">
                <h2 id={titleId} className="text-sm font-semibold tracking-tight text-[color:var(--foreground)]">
                  {title}
                </h2>
                {description ? <p id={descriptionId} className="mt-1 text-sm leading-6 text-[color:var(--muted-foreground)]">{description}</p> : null}
              </div>
              <Button type="button" variant="ghost" size="icon" className="shrink-0" onClick={onClose} aria-label="닫기">
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
          <div className={cn(ui.modalBody, 'min-h-0 flex-1 overflow-y-auto')}>{children}</div>
        </div>
      </div>
    </div>,
    document.body,
  )
}

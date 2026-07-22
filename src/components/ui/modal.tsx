"use client"

// INTENTIONAL DEVIATION from shadcn Dialog: modal={false} — 중첩 Select/Popover 포커스 충돌
// 버그의 확정 해결책. shadcn 표준형으로 되돌리지 말 것. 근거: 파일 내 상세 주석과 ADR-037.

import * as React from 'react'
import * as Dialog from '@radix-ui/react-dialog'
import { X } from 'lucide-react'

import { cn } from '@/lib/utils'
import { ui } from '@/app/components/ui'
import { Button } from './button'

type ModalProps = {
  open: boolean
  title: React.ReactNode
  description?: React.ReactNode
  onOpenChange: (open: boolean) => void
  children: React.ReactNode
  footer?: React.ReactNode
  className?: string
}

const FOCUSABLE_SELECTOR =
  'button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [href], [tabindex]:not([tabindex="-1"])'

export function Modal({ open, title, description, onOpenChange, children, footer, className }: ModalProps) {
  const titleId = React.useId()
  const descriptionId = React.useId()
  const contentRef = React.useRef<HTMLDivElement>(null)
  const triggerRef = React.useRef<HTMLElement | null>(null)

  // Radix Dialog is used non-modal (`modal={false}`) below: Radix's own modal
  // FocusScope aggressively re-grabs focus on every `focusout`, which fights
  // synchronously with nested Radix Select/Popover content portalled outside
  // Dialog.Content's DOM subtree (a real interaction bug — confirmed via jsdom
  // stack-overflow repro when selecting an option from a Select rendered
  // inside this Modal). We keep Dialog for Portal/Escape/outside-click/ARIA,
  // and trap focus ourselves with a Tab-keydown handler instead — the same
  // approach FixedSheet already uses correctly, which only reacts to Tab
  // keydown rather than every focus event, so it doesn't fight Select.
  //
  // We also render multiple <Modal>s as JSX siblings (e.g. FactoriesView's
  // detail modal + its "새 버전" modal), not nested. Radix attributes a
  // pointerdown/focus event to a Dialog's own React subtree even across
  // portals, so a click anywhere inside modal B (including its own portalled
  // Select dropdown) is "outside" for sibling modal A and would otherwise
  // call A's onDismiss via DismissableLayer — silently closing it. Prevented
  // below for both the pointerdown and focus dispatch paths.
  React.useEffect(() => {
    if (!open) return

    triggerRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    const focusFrame = window.requestAnimationFrame(() => {
      const firstAction = contentRef.current?.querySelector<HTMLElement>(FOCUSABLE_SELECTOR)
      ;(firstAction ?? contentRef.current)?.focus()
    })

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Tab' || !contentRef.current) return
      const focusable = [...contentRef.current.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)].filter(
        (element) => !element.hasAttribute('hidden') && element.getAttribute('aria-hidden') !== 'true',
      )
      if (!focusable.length) {
        event.preventDefault()
        contentRef.current.focus()
        return
      }
      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      if (event.shiftKey && (document.activeElement === first || document.activeElement === contentRef.current)) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && (document.activeElement === last || document.activeElement === contentRef.current)) {
        event.preventDefault()
        first.focus()
      }
    }

    document.addEventListener('keydown', handleKeyDown)

    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      document.body.style.overflow = previousOverflow
      window.cancelAnimationFrame(focusFrame)
      triggerRef.current?.focus()
    }
  }, [open])

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange} modal={false}>
      <Dialog.Portal>
        <div aria-hidden="true" onClick={() => onOpenChange(false)} className={cn(ui.modalOverlay, 'cursor-default')} />
        <div className="fixed inset-0 z-[60] flex items-center justify-center">
          <Dialog.Content
            ref={contentRef}
            className={cn(ui.modal, className)}
            aria-labelledby={titleId}
            aria-describedby={description ? descriptionId : undefined}
            onFocusOutside={(event) => event.preventDefault()}
            onPointerDownOutside={(event) => event.preventDefault()}
          >
            <div className={ui.modalHeader}>
              <div className="min-w-0">
                <Dialog.Title asChild>
                  <h2 id={titleId} className="text-sm font-semibold tracking-tight text-[color:var(--foreground)]">
                    {title}
                  </h2>
                </Dialog.Title>
                {description ? (
                  <Dialog.Description asChild>
                    <p id={descriptionId} className="mt-1 text-sm leading-6 text-[color:var(--muted-foreground)]">
                      {description}
                    </p>
                  </Dialog.Description>
                ) : null}
              </div>
              <Dialog.Close asChild>
                <Button type="button" variant="ghost" size="icon" className="h-10 w-10" aria-label="닫기">
                  <X className="h-4 w-4" />
                </Button>
              </Dialog.Close>
            </div>
            <div className={ui.modalBody}>{children}</div>
            {footer ? <div className={ui.modalFooter}>{footer}</div> : null}
          </Dialog.Content>
        </div>
      </Dialog.Portal>
    </Dialog.Root>
  )
}

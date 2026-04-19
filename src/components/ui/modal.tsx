"use client"

import * as React from 'react'
import { createPortal } from 'react-dom'
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

export function Modal({ open, title, description, onOpenChange, children, footer, className }: ModalProps) {
  const titleId = React.useId()
  const descriptionId = React.useId()

  React.useEffect(() => {
    if (!open) {
      return
    }

    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onOpenChange(false)
      }
    }

    document.addEventListener('keydown', handleKeyDown)

    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      document.body.style.overflow = previousOverflow
    }
  }, [open, onOpenChange])

  if (!open) {
    return null
  }

  const dialog = (
    <div className="fixed inset-0 z-[60]">
      <div className={cn(ui.modalOverlay, 'cursor-default')} aria-hidden="true" onClick={() => onOpenChange(false)} />
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={description ? descriptionId : undefined}
        className={cn(ui.modal, className)}
      >
        <div className={ui.modalHeader}>
          <div className="min-w-0">
            <h2 id={titleId} className="text-sm font-semibold tracking-tight text-[color:var(--foreground)]">
              {title}
            </h2>
            {description ? (
              <p id={descriptionId} className="mt-1 text-sm leading-6 text-[color:var(--muted-foreground)]">
                {description}
              </p>
            ) : null}
          </div>
          <Button type="button" variant="ghost" size="icon" className="h-10 w-10" onClick={() => onOpenChange(false)} aria-label="닫기">
            <X className="h-4 w-4" />
          </Button>
        </div>
        <div className={ui.modalBody}>{children}</div>
        {footer ? <div className={ui.modalFooter}>{footer}</div> : null}
      </section>
    </div>
  )

  return createPortal(dialog, document.body)
}

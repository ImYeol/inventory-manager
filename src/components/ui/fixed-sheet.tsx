"use client"

import { useEffect, useId, type ReactNode } from 'react'
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

  useEffect(() => {
    if (!open) return

    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }

    document.addEventListener('keydown', handleKeyDown)

    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      document.body.style.overflow = previousOverflow
    }
  }, [onClose, open])

  if (!open) return null

  return createPortal(
    <div className="fixed inset-0 z-[60]" role="dialog" aria-modal="true" aria-labelledby={titleId} aria-describedby={description ? descriptionId : undefined}>
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
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 id={titleId} className="text-sm font-semibold tracking-tight text-[color:var(--foreground)]">
                  {title}
                </h2>
                {description ? <p id={descriptionId} className="mt-1 text-sm leading-6 text-[color:var(--muted-foreground)]">{description}</p> : null}
              </div>
              <Button type="button" variant="ghost" className="h-11 min-w-11 px-3" onClick={onClose} aria-label="닫기">
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

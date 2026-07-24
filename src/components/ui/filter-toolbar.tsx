"use client"

import { useEffect, useState, type ReactNode } from 'react'
import { cn } from '@/lib/utils'
import { Button, type ButtonProps } from './button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './dialog'
import { Popover, PopoverContent, PopoverTitle, PopoverTrigger } from './popover'

/**
 * Layout for standalone data controls. Query and action rows are explicit
 * siblings; each row stays single-line so a narrow viewport can switch to the
 * responsive filter trigger instead of changing toolbar height unpredictably.
 */
export function FilterToolbar({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={cn(
        'flex w-full min-w-0 flex-col items-stretch justify-start gap-2',
        className,
      )}
    >
      {children}
    </div>
  )
}

export function QueryRow({ children, className }: { children: ReactNode; className?: string }) {
  return <div data-slot="data-query-row" className={cn('flex min-w-0 flex-nowrap items-center justify-between gap-3 overflow-x-auto', className)}>{children}</div>
}

export type ActionRowAlignment = 'split' | 'start' | 'end'

export function ActionRow({
  children,
  className,
  align = 'split',
}: {
  children?: ReactNode
  className?: string
  align?: ActionRowAlignment
}) {
  return (
    <div
      data-slot="data-action-row"
      data-align={align}
      className={cn(
        'flex min-w-0 max-w-full flex-nowrap items-center gap-3 overflow-x-auto',
        align === 'split' && 'justify-between',
        align === 'start' && 'justify-start',
        align === 'end' && 'justify-end',
        className,
      )}
    >
      {children}
    </div>
  )
}

export function QueryRowStart({ children, className }: { children: ReactNode; className?: string }) {
  return <div data-slot="data-query-start" className={cn('flex min-w-0 flex-1 items-center gap-2', className)}>{children}</div>
}

export function QueryRowEnd({ children, className }: { children: ReactNode; className?: string }) {
  return <div data-slot="data-query-end" className={cn('ml-auto flex shrink-0 items-center gap-2', className)}>{children}</div>
}

export function ActionRowStart({ children, className }: { children: ReactNode; className?: string }) {
  return <div data-slot="data-action-start" className={cn('flex min-w-0 flex-1 items-center gap-2', className)}>{children}</div>
}

export function ActionRowEnd({ children, className }: { children: ReactNode; className?: string }) {
  return <div data-slot="data-action-end" className={cn('flex max-w-full shrink-0 items-center gap-2 overflow-x-auto', className)}>{children}</div>
}

/**
 * A non-segmented action family. Every child keeps its own border and radius;
 * the group only owns compact spacing and bounded horizontal overflow.
 */
export function IndependentActionGroup({
  children,
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      role="group"
      data-slot="independent-action-group"
      className={cn(
        'flex w-fit max-w-full shrink-0 flex-nowrap items-center gap-[var(--space-1)] overflow-x-auto',
        className,
      )}
      {...props}
    >
      {children}
    </div>
  )
}

/** Query-row reset only; unrelated low-emphasis ghost actions stay unchanged. */
export function QueryResetButton({ children = '필터 초기화', ...props }: Omit<ButtonProps, 'variant' | 'size'>) {
  return (
    <Button type="button" variant="outline" size="sm" data-purpose="query-reset" {...props}>
      {children}
    </Button>
  )
}

/**
 * Keeps secondary filters out of the toolbar when the available width is tight.
 * Tablet/desktop uses Popover; mobile uses a full-screen Dialog for a stable
 * editing surface while preserving an accessible title in both cases.
 */
export function ResponsiveFilterControls({
  children,
  label = '필터',
  mode,
}: {
  children: ReactNode
  label?: string
  /** Controlled mode makes layout deterministic in tests and container-aware consumers. */
  mode?: 'wide' | 'compact' | 'mobile'
}) {
  const [open, setOpen] = useState(false)
  const resolvedMode = useResponsiveFilterMode(mode)

  if (resolvedMode === 'wide') {
    return (
      <div data-slot="responsive-filter-controls" data-filter-mode="wide" className="flex min-w-0 flex-1 items-center gap-2">
        {children}
      </div>
    )
  }

  if (resolvedMode === 'mobile') {
    return (
      <div data-slot="responsive-filter-controls" data-filter-mode="mobile">
        <Dialog open={open} onOpenChange={setOpen}>
          <Button type="button" variant="outline" size="sm" onClick={() => setOpen(true)}>{label}</Button>
          <DialogContent className="inset-0 flex max-h-[100dvh] min-h-[100dvh] max-w-none translate-x-0 translate-y-0 flex-col rounded-none p-4" aria-describedby={undefined}>
            <DialogHeader><DialogTitle>{label}</DialogTitle></DialogHeader>
            <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto">{children}</div>
          </DialogContent>
        </Dialog>
      </div>
    )
  }

  return (
    <div data-slot="responsive-filter-controls" data-filter-mode="compact">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger render={<Button type="button" variant="outline" size="sm" />}>{label}</PopoverTrigger>
        <PopoverContent align="end" className="rounded-[var(--radius-overlay)]">
          <PopoverTitle className="sr-only">{label}</PopoverTitle>
          <div className="flex flex-col gap-3">{children}</div>
        </PopoverContent>
      </Popover>
    </div>
  )
}

const MOBILE_FILTER_BREAKPOINT = 768
const COMPACT_FILTER_BREAKPOINT = 1024

function useResponsiveFilterMode(controlledMode?: 'wide' | 'compact' | 'mobile') {
  const [detectedMode, setDetectedMode] = useState<'wide' | 'compact' | 'mobile'>('wide')

  useEffect(() => {
    if (controlledMode) return

    const update = () => {
      const width = window.innerWidth
      setDetectedMode(
        width < MOBILE_FILTER_BREAKPOINT
          ? 'mobile'
          : width < COMPACT_FILTER_BREAKPOINT
            ? 'compact'
            : 'wide',
      )
    }

    update()
    window.addEventListener('resize', update)
    return () => window.removeEventListener('resize', update)
  }, [controlledMode])

  return controlledMode ?? detectedMode
}

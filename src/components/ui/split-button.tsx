'use client'

import * as React from 'react'
import { ChevronDownIcon } from '@radix-ui/react-icons'

import { cn } from '@/lib/utils'
import { Button, type ButtonProps } from './button'
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger } from './dropdown-menu'

type SplitButtonProps = {
  label: string
  onClick: () => void
  menuLabel: string
  children: React.ReactNode
  variant?: ButtonProps['variant']
  size?: ButtonProps['size']
  disabled?: boolean
  className?: string
}

/**
 * Primary action segment + caret dropdown for "one main action + a cluster of
 * secondary actions" toolbars (docs/design/components.md). The primary segment
 * stays a single fixed action — it never relabels to the last picked menu item —
 * so the toolbar keeps one obvious default entry point (ADR-004 mode-lock intent
 * extends to which action a click commits to).
 */
export function SplitButton({
  label,
  onClick,
  menuLabel,
  children,
  variant = 'success',
  size = 'default',
  disabled,
  className,
}: SplitButtonProps) {
  return (
    <div className={cn('inline-flex', className)}>
      <Button
        type="button"
        variant={variant}
        size={size}
        onClick={onClick}
        disabled={disabled}
        className="rounded-r-none"
      >
        {label}
      </Button>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            type="button"
            variant={variant}
            size={size}
            disabled={disabled}
            aria-label={menuLabel}
            className="rounded-l-none border-l border-l-[color:var(--border)] px-2"
          >
            <ChevronDownIcon />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">{children}</DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}

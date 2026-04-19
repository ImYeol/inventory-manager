"use client"

import type { ReactNode } from 'react'
import { X } from 'lucide-react'

import { cn } from '@/lib/utils'
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
  if (!open) return null

  return (
    <div className="fixed inset-0 z-50" role="dialog" aria-modal="true" aria-labelledby="fixed-sheet-title">
      <button type="button" aria-label="입력 창 닫기" onClick={onClose} className="absolute inset-0 bg-slate-950/45" />
      <div
        className={cn(
          'absolute inset-x-0 bottom-0 top-10 overflow-hidden rounded-t-[28px] border border-slate-200 bg-white shadow-2xl md:inset-x-[max(2rem,calc(50%-32rem))] md:bottom-8 md:top-8 md:rounded-[28px]',
          className,
        )}
      >
        <div className="flex h-full flex-col">
          <div className="border-b border-slate-200 px-4 py-4 md:px-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 id="fixed-sheet-title" className="text-sm font-semibold text-slate-950">
                  {title}
                </h2>
                {description ? <p className="mt-1 text-sm text-slate-500">{description}</p> : null}
              </div>
              <Button type="button" variant="ghost" className="h-11 min-w-11 px-3" onClick={onClose} aria-label="닫기">
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4 md:px-6 md:py-5">{children}</div>
        </div>
      </div>
    </div>
  )
}

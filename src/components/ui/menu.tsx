import Link from 'next/link'
import type { ReactNode } from 'react'
import { ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'
import { ui } from '@/app/components/ui'

type MenuLinkProps = {
  href: string
  label: string
  icon?: ReactNode
  active?: boolean
  compact?: boolean
  onClick?: () => void
}

export function MenuLink({ href, label, icon, active, compact = false, onClick }: MenuLinkProps) {
  return (
    <Link
      href={href}
      onClick={onClick}
      aria-current={active ? 'page' : undefined}
      className={cn(
        compact ? ui.navSubItem : ui.navItem,
        compact ? 'h-10' : 'h-11',
        active && ui.navItemActive,
      )}
    >
      {icon ? <span aria-hidden="true" className="shrink-0 text-slate-500 transition-colors group-hover:text-slate-700">{icon}</span> : null}
      <span className="truncate">{label}</span>
    </Link>
  )
}

type MenuSectionProps = {
  title: string
  icon?: ReactNode
  open: boolean
  onToggle: () => void
  children: ReactNode
}

export function MenuSection({ title, icon, open, onToggle, children }: MenuSectionProps) {
  return (
    <div className="space-y-1">
      <button
        type="button"
        aria-expanded={open}
        onClick={onToggle}
        className={cn(
          ui.navSectionButton,
          open && ui.navItemActive,
        )}
      >
        <span className="flex items-center gap-2">
          {icon ? <span aria-hidden="true" className="shrink-0 text-slate-500 transition-colors group-hover:text-slate-700">{icon}</span> : null}
          <span>{title}</span>
        </span>
        <ChevronDown aria-hidden="true" className={cn('h-4 w-4 shrink-0 transition-transform', open && 'rotate-180')} />
      </button>
      {open ? <div className="space-y-1 border-l border-slate-200 pl-3">{children}</div> : null}
    </div>
  )
}

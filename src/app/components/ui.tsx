import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

export function cx(...parts: Array<string | false | null | undefined>) {
  return cn(...parts)
}

export const ui = {
  shell: 'mx-auto w-full max-w-7xl px-4 py-5 md:px-8 md:py-6',
  shellNarrow: 'mx-auto w-full max-w-3xl px-4 py-5 md:px-8 md:py-6',
  panel: 'surface',
  panelHeader: 'surface-header px-4 py-3 md:px-4',
  panelBody: 'surface-body',
  label: 'ui-label',
  control: 'ui-control',
  controlSm: 'ui-control ui-control-sm',
  button: 'ui-button',
  buttonPrimary: 'ui-button ui-button-primary',
  buttonSecondary: 'ui-button ui-button-secondary',
  buttonGhost: 'ui-button ui-button-ghost',
  toolbar: 'flex flex-nowrap items-center gap-1.5 overflow-x-auto pb-1',
  toolbarAction: 'ui-button ui-button-secondary h-11 px-3 text-sm font-medium whitespace-nowrap',
  iconButton: 'ui-button ui-button-secondary h-11 w-11 shrink-0 px-0',
  badge: 'ui-badge',
  tab: 'ui-tab inline-flex h-8 items-center rounded-full px-3 text-xs font-semibold tracking-tight text-slate-500 transition-colors hover:border-slate-200 hover:bg-slate-50 hover:text-slate-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--focus-ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-white',
  tabActive: 'ui-tab ui-tab-active inline-flex h-8 items-center rounded-full px-3 text-xs font-semibold tracking-tight',
  pill: 'ui-pill',
  pillMuted: 'ui-pill ui-pill-muted',
  tableShell: 'ui-table-shell',
  tableHeadCell: 'ui-table-head px-4 py-3 text-left',
  tableCell: 'ui-table-cell',
  emptyState: 'ui-empty px-6 py-14 text-center text-sm md:text-base',
  pageKicker:
    'inline-flex items-center rounded-full border border-slate-200 bg-white px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500',
  pageTitle: 'text-2xl font-semibold tracking-tight text-slate-950 md:text-3xl',
  pageLead: 'max-w-2xl text-sm leading-6 text-slate-500 md:text-base',
  number: 'font-mono tabular-nums',
  helpText: 'text-xs text-slate-500',
  navSectionButton:
    'group flex w-full items-center justify-between gap-2 rounded-2xl border border-transparent px-3 py-2.5 text-left text-sm font-medium text-slate-600 transition-colors hover:border-slate-200 hover:bg-slate-50 hover:text-slate-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--focus-ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-white',
  navItem:
    'group flex items-center gap-2 rounded-2xl border border-transparent px-3 py-2.5 text-sm font-medium text-slate-600 transition-colors hover:border-slate-200 hover:bg-slate-50 hover:text-slate-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--focus-ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-white',
  navItemActive:
    'border-slate-200 bg-slate-50 text-slate-950 shadow-[0_1px_1px_rgba(15,23,42,0.03)]',
  navSubItem:
    'group flex items-center gap-2 rounded-xl border border-transparent px-3 py-2 text-sm font-medium text-slate-500 transition-colors hover:border-slate-200 hover:bg-slate-50 hover:text-slate-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--focus-ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-white',
  mobileTopbar:
    'fixed inset-x-0 top-0 z-40 flex h-16 items-center justify-between border-b border-slate-200 bg-white/95 px-4 backdrop-blur md:hidden',
  mobileDrawerScrim: 'fixed inset-0 z-40 bg-slate-950/35 md:hidden',
  mobileDrawer:
    'fixed inset-y-0 left-0 z-50 flex w-[min(88vw,22rem)] flex-col border-r border-slate-200 bg-white shadow-xl md:hidden',
}

type PageHeaderProps = {
  kicker?: string
  title: string
  description?: string
  actions?: ReactNode
  className?: string
}

export function PageHeader({ title, description, actions, className }: PageHeaderProps) {
  return (
    <div className={cx('mb-4 flex flex-col gap-3 md:mb-5 md:flex-row md:items-end md:justify-between', className)}>
      <div className="max-w-2xl space-y-1.5">
        <h1 className={ui.pageTitle}>{title}</h1>
        {description ? <p className={ui.pageLead}>{description}</p> : null}
      </div>
      {actions ? <div className="flex flex-nowrap items-center gap-1.5 overflow-x-auto pb-1">{actions}</div> : null}
    </div>
  )
}

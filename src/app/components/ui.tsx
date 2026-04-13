import type { ReactNode } from 'react'

export function cx(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(' ')
}

export const ui = {
  shell: 'mx-auto w-full max-w-6xl px-4 py-6 md:px-8 md:py-8',
  shellNarrow: 'mx-auto w-full max-w-2xl px-4 py-6 md:px-8 md:py-8',
  panel: 'surface',
  panelHeader: 'surface-header px-4 py-3 md:px-5',
  panelBody: 'surface-body',
  label: 'ui-label',
  control: 'ui-control',
  controlSm: 'ui-control ui-control-sm',
  button: 'ui-button',
  buttonPrimary: 'ui-button ui-button-primary',
  buttonSecondary: 'ui-button ui-button-secondary',
  buttonGhost: 'ui-button ui-button-ghost',
  tab: 'ui-tab',
  tabActive: 'ui-tab ui-tab-active',
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
}

type PageHeaderProps = {
  kicker?: string
  title: string
  description?: string
  actions?: ReactNode
  className?: string
}

export function PageHeader({ kicker, title, description, actions, className }: PageHeaderProps) {
  return (
    <div className={cx('mb-6 flex flex-col gap-4 md:mb-8 md:flex-row md:items-end md:justify-between', className)}>
      <div className="max-w-2xl space-y-2">
        {kicker ? <div className={ui.pageKicker}>{kicker}</div> : null}
        <h1 className={ui.pageTitle}>{title}</h1>
        {description ? <p className={ui.pageLead}>{description}</p> : null}
      </div>
      {actions ? <div className="flex flex-nowrap items-center gap-2 overflow-x-auto pb-1">{actions}</div> : null}
    </div>
  )
}

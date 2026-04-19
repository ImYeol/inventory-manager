import type { HTMLAttributes, ReactNode } from 'react'
import { cn } from '@/lib/utils'
import { ui } from '@/app/components/ui'

export type BadgeTone = 'neutral' | 'info' | 'success' | 'warning' | 'danger'

type BadgeProps = HTMLAttributes<HTMLSpanElement> & {
  tone?: BadgeTone
  icon?: ReactNode
}

const toneClasses: Record<BadgeTone, string> = {
  neutral: 'ui-badge-neutral',
  info: 'ui-badge-info',
  success: 'ui-badge-success',
  warning: 'ui-badge-warning',
  danger: 'ui-badge-danger',
}

export function Badge({ tone = 'neutral', icon, className, children, ...props }: BadgeProps) {
  return (
    <span className={cn(ui.badge, toneClasses[tone], className)} {...props}>
      {icon ? <span aria-hidden="true" className="shrink-0">{icon}</span> : null}
      <span>{children}</span>
    </span>
  )
}

export function StatusBadge(props: BadgeProps) {
  return <Badge {...props} />
}

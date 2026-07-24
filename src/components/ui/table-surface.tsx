import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

/**
 * Unified data surface. The canonical path contains only table/header/body/footer
 * chrome. `toolbar` remains a compatibility bridge for pre-migration callers.
 *
 * The child table must NOT bring its own `ui-table-shell` border — this surface
 * owns the border, radius, and elevation.
 */
export function TableSurface({
  toolbar,
  children,
  footer,
  className,
  scrollClassName,
}: {
  toolbar?: ReactNode
  children?: ReactNode
  footer?: ReactNode
  className?: string
  scrollClassName?: string
}) {
  return (
    <section data-slot="table-surface" className={cn('ui-data-surface', className)}>
      {toolbar ? <div className="ui-data-toolbar">{toolbar}</div> : null}
      <div className={cn('ui-data-scroll', scrollClassName)}>{children}</div>
      {footer ? <div className="ui-data-footer">{footer}</div> : null}
    </section>
  )
}

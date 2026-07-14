import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

/**
 * Unified data surface. Composes an optional filter/action toolbar strip and a
 * table body into a single seamless bordered surface, so pages never stack a
 * standalone filter box on top of a standalone table shell.
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
  children: ReactNode
  footer?: ReactNode
  className?: string
  scrollClassName?: string
}) {
  return (
    <section className={cn('ui-data-surface', className)}>
      {toolbar ? <div className="ui-data-toolbar">{toolbar}</div> : null}
      <div className={cn('ui-data-scroll', scrollClassName)}>{children}</div>
      {footer ? <div className="ui-data-footer">{footer}</div> : null}
    </section>
  )
}

import * as React from 'react'

import { cn } from '@/lib/utils'
import { ui } from '@/app/components/ui'

type CardSurface = 'default' | 'muted' | 'strong'
type CardContentLayout = 'inset' | 'continuous'

type CardProps = React.HTMLAttributes<HTMLElement> & {
  /** Figma-aligned Card surface property. */
  surface?: CardSurface
  /** @deprecated Use surface so code and the design contract share one name. */
  variant?: CardSurface
}

type CardContentProps = React.HTMLAttributes<HTMLDivElement> & {
  /** Inset is the divided-card default; continuous is for deliberate data surfaces. */
  contentLayout?: CardContentLayout
}

const cardSurfaceClasses: Record<CardSurface, string> = {
  default: ui.card,
  muted: ui.cardMuted,
  strong: ui.cardStrong,
}

const Card = React.forwardRef<HTMLElement, CardProps>(({ className, surface, variant, ...props }, ref) => {
  const resolvedSurface = surface ?? variant ?? 'default'

  return (
    <section
      ref={ref}
      className={cn(cardSurfaceClasses[resolvedSurface], className, resolvedSurface === 'strong' && 'overflow-hidden')}
      {...props}
    />
  )
})
Card.displayName = 'Card'

const CardHeader = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => <div ref={ref} className={cn(ui.cardHeader, className)} {...props} />,
)
CardHeader.displayName = 'CardHeader'

const CardTitle = React.forwardRef<HTMLHeadingElement, React.HTMLAttributes<HTMLHeadingElement>>(
  ({ className, ...props }, ref) => (
    <h3
      ref={ref}
      className={cn('text-sm font-semibold tracking-tight text-[color:var(--foreground)]', className)}
      {...props}
    />
  ),
)
CardTitle.displayName = 'CardTitle'

const CardDescription = React.forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLParagraphElement>>(
  ({ className, ...props }, ref) => (
    <p ref={ref} className={cn('mt-1 text-sm leading-6 text-[color:var(--muted-foreground)]', className)} {...props} />
  ),
)
CardDescription.displayName = 'CardDescription'

const CardContent = React.forwardRef<HTMLDivElement, CardContentProps>(
  ({ className, contentLayout = 'inset', ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        ui.cardBody,
        contentLayout === 'inset' ? 'ui-card-content-inset' : 'ui-card-content-continuous p-0',
        className,
      )}
      {...props}
    />
  ),
)
CardContent.displayName = 'CardContent'

const CardFooter = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => <div ref={ref} className={cn(ui.cardFooter, className)} {...props} />,
)
CardFooter.displayName = 'CardFooter'

export { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle }
export type { CardContentLayout, CardSurface }

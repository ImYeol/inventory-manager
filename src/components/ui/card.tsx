import * as React from 'react'

import { cn } from '@/lib/utils'
import { ui } from '@/app/components/ui'

type CardVariant = 'default' | 'muted' | 'strong'

type CardProps = React.HTMLAttributes<HTMLElement> & {
  variant?: CardVariant
}

const cardVariantClasses: Record<CardVariant, string> = {
  default: ui.card,
  muted: ui.cardMuted,
  strong: ui.cardStrong,
}

const Card = React.forwardRef<HTMLElement, CardProps>(({ className, variant = 'default', ...props }, ref) => (
  <section ref={ref} className={cn(cardVariantClasses[variant], className, variant === 'strong' && 'overflow-hidden')} {...props} />
))
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

const CardContent = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => <div ref={ref} className={cn(ui.cardBody, className)} {...props} />,
)
CardContent.displayName = 'CardContent'

const CardFooter = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => <div ref={ref} className={cn(ui.cardFooter, className)} {...props} />,
)
CardFooter.displayName = 'CardFooter'

export { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle }

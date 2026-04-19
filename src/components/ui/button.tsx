import * as React from 'react'
import { Slot } from '@radix-ui/react-slot'
import { cva, type VariantProps } from 'class-variance-authority'

import { cn } from '@/lib/utils'
import { ui } from '@/app/components/ui'

const buttonVariants = cva(ui.button, {
  variants: {
    variant: {
      default: ui.buttonPrimary,
      destructive: ui.buttonDanger,
      outline: ui.buttonOutline,
      secondary: ui.buttonSecondary,
      ghost: ui.buttonGhost,
      link: ui.buttonLink,
    },
    size: {
      default: 'h-11 px-4',
      sm: 'ui-button-sm',
      lg: 'ui-button-lg',
      icon: 'ui-button-icon',
    },
  },
  defaultVariants: {
    variant: 'default',
    size: 'default',
  },
})

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button'

    return <Comp ref={ref} className={cn(buttonVariants({ variant, size }), className)} {...props} />
  },
)
Button.displayName = 'Button'

export { Button, buttonVariants }

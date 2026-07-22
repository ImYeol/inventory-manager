import * as React from 'react'
import { Slot } from '@radix-ui/react-slot'
import { cva, type VariantProps } from 'class-variance-authority'

import { cn } from '@/lib/utils'
import { ui } from '@/app/components/ui'

/**
 * Button size ROLE hierarchy (docs/design/components.md §Button 크기 역할 계층,
 * enforced by ADR-018 UI-system-check via tests/ui-token-presets.test.ts):
 * - 주 동작(primary/main action) -> size="default" (44px, --control-h)
 * - 보조 동작(secondary action)  -> size="sm" (40px, --control-h-md)
 * - 부가 동작(tertiary/low-emphasis) -> variant="ghost" (배경/보더 없음, size는 그대로 유지)
 * 화면의 모든 버튼을 size="sm"으로 통일하지 않는다 — 강조 예산(docs/design/ui-guide.md §인지·그룹핑 원칙)의 1차 도구다.
 */
const buttonVariants = cva(ui.button, {
  variants: {
    variant: {
      default: ui.buttonPrimary,
      success: ui.buttonSuccess,
      warning: ui.buttonWarning,
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
      'icon-sm': '',
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

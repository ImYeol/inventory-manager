import Link from 'next/link'
import type { AnchorHTMLAttributes, ButtonHTMLAttributes, ReactNode } from 'react'
import { cn } from '@/lib/utils'
import { ui } from '@/app/components/ui'

type ActionToolbarProps = {
  children: ReactNode
  className?: string
}

type ToolbarActionProps = {
  children: ReactNode
  icon?: ReactNode
  className?: string
}

type ToolbarLinkActionProps = ToolbarActionProps &
  Omit<AnchorHTMLAttributes<HTMLAnchorElement>, 'href' | 'children' | 'className'> & {
    href: string
  }

type ToolbarButtonActionProps = ToolbarActionProps &
  Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children' | 'className'> & {
    type?: ButtonHTMLAttributes<HTMLButtonElement>['type']
  }

type ToolbarIconButtonProps = {
  label: string
  icon: ReactNode
  className?: string
} & Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children' | 'className'>

export function ActionToolbar({ children, className }: ActionToolbarProps) {
  return <div className={cn(ui.toolbar, className)}>{children}</div>
}

export function ToolbarLinkAction({ href, icon, children, className, ...props }: ToolbarLinkActionProps) {
  return (
    <Link href={href} className={cn(ui.toolbarAction, className)} {...props}>
      {icon ? <span aria-hidden="true" className="shrink-0">{icon}</span> : null}
      <span>{children}</span>
    </Link>
  )
}

export function ToolbarButtonAction({
  icon,
  children,
  className,
  type = 'button',
  ...props
}: ToolbarButtonActionProps) {
  return (
    <button type={type} className={cn(ui.toolbarAction, className)} {...props}>
      {icon ? <span aria-hidden="true" className="shrink-0">{icon}</span> : null}
      <span>{children}</span>
    </button>
  )
}

export function ToolbarIconButton({ label, icon, className, type = 'button', ...props }: ToolbarIconButtonProps) {
  return (
    <button
      type={type}
      aria-label={label}
      title={label}
      className={cn(ui.iconButton, className)}
      {...props}
    >
      <span aria-hidden="true" className="shrink-0">
        {icon}
      </span>
    </button>
  )
}

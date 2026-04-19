import { ui } from '@/app/components/ui'
import { cn } from '@/lib/utils'
import * as React from 'react'

const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<'input'>>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          ui.control,
          type === 'search' &&
            '[&::-webkit-search-cancel-button]:appearance-none [&::-webkit-search-decoration]:appearance-none [&::-webkit-search-results-button]:appearance-none [&::-webkit-search-results-decoration]:appearance-none',
          type === 'file' &&
            'p-0 pr-3 italic text-[color:var(--muted-foreground)] file:me-3 file:h-full file:border-0 file:border-r file:border-solid file:border-[color:var(--border)] file:bg-transparent file:px-3 file:text-sm file:font-medium file:not-italic file:text-[color:var(--foreground)]',
          className,
        )}
        ref={ref}
        {...props}
      />
    )
  },
)
Input.displayName = 'Input'

export { Input }

'use client'

import { useMemo, useRef, useState } from 'react'
import * as Popover from '@radix-ui/react-popover'
import { Command, CommandEmpty, CommandInput, CommandItem, CommandList } from 'cmdk'
import { ChannelBadge, type ChannelListingStatus } from './channel-badge'
import { Button } from './button'
import { cn } from '@/lib/utils'

if (typeof window !== 'undefined' && typeof window.ResizeObserver === 'undefined') {
  class ResizeObserverPolyfill {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
  window.ResizeObserver = ResizeObserverPolyfill as unknown as typeof ResizeObserver
}

export type ProductVariantOption = {
  id: string
  modelId: number
  sizeId: number
  colorId: number
  modelName: string
  sizeName: string
  colorName: string
  sellerSku: string
  channels: Partial<Record<'naver' | 'coupang', ChannelListingStatus>>
}

export function ProductVariantCombobox({
  variants,
  value,
  onValueChange,
  placeholder = '상품/옵션 검색',
  disabled,
  'aria-label': ariaLabel,
  className,
}: {
  variants: ProductVariantOption[]
  value: string | null
  onValueChange: (value: string | null) => void
  placeholder?: string
  disabled?: boolean
  'aria-label': string
  className?: string
}) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const triggerRef = useRef<HTMLButtonElement>(null)
  const selected = variants.find((variant) => variant.id === value)

  // Implement exact-match filtering (disable cmdk's fuzzy filter)
  const results = useMemo(() => {
    const normalized = query.trim().toLowerCase()
    if (!normalized) return variants
    return variants.filter((variant) =>
      [variant.modelName, variant.sizeName, variant.colorName, variant.sellerSku].join(' ').toLowerCase().includes(normalized),
    )
  }, [query, variants])

  const handleOpenChange = (newOpen: boolean) => {
    setOpen(newOpen)
    if (!newOpen) {
      // Reset query and restore focus to trigger when closing
      setQuery('')
      triggerRef.current?.focus()
    }
  }

  return (
    <Popover.Root open={open} onOpenChange={handleOpenChange}>
      <div className={cn('relative min-w-0', className)}>
        <Popover.Trigger asChild>
          <Button
            ref={triggerRef}
            type="button"
            role="combobox"
            aria-label={ariaLabel}
            aria-expanded={open}
            variant="outline"
            size="sm"
            className="w-full justify-between truncate"
            disabled={disabled}
          >
            <span className="truncate">{selected ? `${selected.modelName} · ${selected.colorName} / ${selected.sizeName}` : placeholder}</span>
            <span aria-hidden="true">⌄</span>
          </Button>
        </Popover.Trigger>
        <Popover.Portal>
          <Popover.Content
            asChild
            align="start"
            sideOffset={4}
            className="z-50 w-[var(--radix-popover-trigger-width)] p-0"
          >
            <Command shouldFilter={false} className="rounded-[var(--radius-md)] border border-[color:var(--border)] bg-[color:var(--surface)] shadow-[var(--elevation-3)]">
              <div className="p-2">
                <CommandInput
                  placeholder="상품, 옵션, SKU 검색"
                  aria-label={`${ariaLabel} 검색`}
                  value={query}
                  onValueChange={setQuery}
                  className="ui-control-sm"
                />
              </div>
              <CommandList className="max-h-64 border-t border-[color:var(--border)] p-1">
                <CommandEmpty className="px-3 py-6 text-center text-sm text-[color:var(--muted-foreground)]">
                  일치하는 상품 옵션이 없습니다.
                </CommandEmpty>
                {results.map((variant) => (
                  <CommandItem
                    key={variant.id}
                    value={variant.id}
                    onSelect={() => {
                      onValueChange(variant.id)
                      handleOpenChange(false)
                    }}
                    className="flex w-full flex-col gap-1 rounded-[var(--radius-sm)] px-3 py-2 text-left text-sm aria-selected:bg-[color:var(--surface-muted)] hover:bg-[color:var(--surface-muted)] cursor-pointer"
                  >
                    <span className="font-medium text-[color:var(--foreground)]">{variant.modelName}</span>
                    <span className="text-[color:var(--muted-foreground)]">{variant.colorName} / {variant.sizeName}</span>
                    <span className="text-xs text-[color:var(--muted-foreground)]">SKU {variant.sellerSku || '-'}</span>
                    <span className="flex flex-wrap gap-1">
                      <ChannelBadge channel="naver" listingStatus={variant.channels.naver ?? 'unregistered'} />
                      <ChannelBadge channel="coupang" listingStatus={variant.channels.coupang ?? 'unregistered'} />
                    </span>
                  </CommandItem>
                ))}
              </CommandList>
            </Command>
          </Popover.Content>
        </Popover.Portal>
      </div>
    </Popover.Root>
  )
}

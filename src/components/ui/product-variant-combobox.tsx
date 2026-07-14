'use client'

import { useMemo, useRef, useState } from 'react'
import { ChannelBadge, type ChannelListingStatus } from './channel-badge'
import { Input } from './input'
import { Button } from './button'
import { cn } from '@/lib/utils'

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
  const inputRef = useRef<HTMLInputElement>(null)
  const selected = variants.find((variant) => variant.id === value)
  const results = useMemo(() => {
    const normalized = query.trim().toLowerCase()
    if (!normalized) return variants
    return variants.filter((variant) =>
      [variant.modelName, variant.sizeName, variant.colorName, variant.sellerSku].join(' ').toLowerCase().includes(normalized),
    )
  }, [query, variants])

  return (
    <div className={cn('relative min-w-0', className)}>
      <Button
        type="button"
        role="combobox"
        aria-label={ariaLabel}
        aria-expanded={open}
        variant="outline"
        size="sm"
        className="w-full justify-between truncate"
        disabled={disabled}
        onClick={() => {
          setOpen((current) => !current)
          requestAnimationFrame(() => inputRef.current?.focus())
        }}
      >
        <span className="truncate">{selected ? `${selected.modelName} · ${selected.colorName} / ${selected.sizeName}` : placeholder}</span>
        <span aria-hidden="true">⌄</span>
      </Button>
      {open ? (
        <div className="absolute z-30 mt-1 w-full overflow-hidden rounded-[var(--radius-md)] border border-[color:var(--border)] bg-[color:var(--surface)] shadow-[var(--elevation-3)]">
          <div className="p-2">
            <Input ref={inputRef} value={query} onChange={(event) => setQuery(event.target.value)} placeholder="상품, 옵션, SKU 검색" aria-label={`${ariaLabel} 검색`} className="ui-control-sm" />
          </div>
          <div role="listbox" className="max-h-64 overflow-y-auto border-t border-[color:var(--border)] p-1">
            {results.length ? results.map((variant) => (
              <button
                type="button"
                role="option"
                aria-selected={variant.id === value}
                key={variant.id}
                className="flex w-full flex-col gap-1 rounded-[var(--radius-sm)] px-3 py-2 text-left text-sm hover:bg-[color:var(--surface-muted)]"
                onClick={() => { onValueChange(variant.id); setOpen(false); setQuery('') }}
              >
                <span className="font-medium text-[color:var(--foreground)]">{variant.modelName}</span>
                <span className="text-[color:var(--muted)]">{variant.colorName} / {variant.sizeName}</span>
                <span className="text-xs text-[color:var(--muted-foreground)]">SKU {variant.sellerSku || '-'}</span>
                <span className="flex flex-wrap gap-1">
                  <ChannelBadge channel="naver" listingStatus={variant.channels.naver ?? 'unregistered'} />
                  <ChannelBadge channel="coupang" listingStatus={variant.channels.coupang ?? 'unregistered'} />
                </span>
              </button>
            )) : <p className="px-3 py-6 text-center text-sm text-[color:var(--muted-foreground)]">일치하는 상품 옵션이 없습니다.</p>}
          </div>
        </div>
      ) : null}
    </div>
  )
}

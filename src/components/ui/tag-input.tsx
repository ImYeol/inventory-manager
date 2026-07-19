'use client'

import { useState, type KeyboardEvent } from 'react'
import { X } from 'lucide-react'

import { cn } from '@/lib/utils'
import { ui } from '@/app/components/ui'
import { Input } from './input'

export type TagInputProps = {
  value: string[]
  onChange: (next: string[]) => void
  placeholder?: string
  ariaLabel?: string
  /** Returns an error message when the token is invalid, or `null` when it can be added. */
  validate?: (token: string) => string | null
  disabled?: boolean
  className?: string
}

/**
 * Chip/tag input: type a value and press Enter to add a removable chip.
 * Backspace on an empty draft removes the last chip; each chip has its own × remove control.
 * Validation runs per token at add time via `validate`, surfacing an inline error instead of
 * silently accepting an unconvertible value (docs/design/components.md primitive catalog).
 */
export function TagInput({ value, onChange, placeholder, ariaLabel, validate, disabled, className }: TagInputProps) {
  const [draft, setDraft] = useState('')
  const [error, setError] = useState<string | null>(null)

  const addToken = () => {
    const token = draft.trim()
    if (!token) return
    if (value.includes(token)) {
      setError('이미 추가된 값입니다.')
      return
    }
    const validationError = validate?.(token) ?? null
    if (validationError) {
      setError(validationError)
      return
    }
    onChange([...value, token])
    setDraft('')
    setError(null)
  }

  const removeToken = (index: number) => {
    if (disabled) return
    onChange(value.filter((_, tokenIndex) => tokenIndex !== index))
  }

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      if (event.nativeEvent.isComposing) return
      event.preventDefault()
      addToken()
      return
    }
    if (event.key === 'Backspace' && draft === '' && value.length > 0) {
      removeToken(value.length - 1)
    }
  }

  return (
    <div className={cn('space-y-1.5', className)}>
      <Input
        aria-label={ariaLabel}
        value={draft}
        disabled={disabled}
        placeholder={placeholder}
        onChange={(event) => {
          setDraft(event.target.value)
          if (error) setError(null)
        }}
        onKeyDown={handleKeyDown}
        className="ui-control-sm w-full"
      />
      {value.length > 0 ? <div data-testid="tag-input-tags" className="flex flex-wrap gap-1.5">
        {value.map((token, index) => (
          <span key={`${token}-${index}`} className={ui.pillMuted}>
            <span>{token}</span>
            <button
              type="button"
              onClick={() => removeToken(index)}
              disabled={disabled}
              aria-label={`${token} 삭제`}
              className="rounded-full text-[color:var(--muted-foreground)] transition-colors hover:text-[color:var(--foreground)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--focus-ring)]"
            >
              <X className="h-3 w-3" aria-hidden="true" />
            </button>
          </span>
        ))}
      </div> : null}
      {error ? <p role="alert" className="text-xs text-[color:var(--danger-foreground)]">{error}</p> : null}
    </div>
  )
}

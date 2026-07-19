'use client'

import { useRef, useState } from 'react'
import { FileUp } from 'lucide-react'
import { Input } from './input'
import { Button } from './button'

/**
 * Canonical file input surface (docs/design/components.md). Always shows the
 * selected file name and a drag-active state — never swap in a bare
 * `<Input type="file">` for a file field.
 */
export function FileDropInput({
  ariaLabel,
  accept,
  onFile,
  hint = '파일을 놓거나 선택하세요',
  description,
}: {
  ariaLabel: string
  accept?: string
  onFile: (file: File) => void
  hint?: string
  description?: string
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const dragDepth = useRef(0)
  const [isDragActive, setIsDragActive] = useState(false)
  const [fileName, setFileName] = useState<string | null>(null)

  const handleFile = (file: File) => {
    setFileName(file.name)
    onFile(file)
  }

  return (
    <div
      className="ui-file-drop"
      data-drag-active={isDragActive}
      onDragEnter={(event) => {
        event.preventDefault()
        dragDepth.current += 1
        setIsDragActive(true)
      }}
      onDragOver={(event) => event.preventDefault()}
      onDragLeave={(event) => {
        event.preventDefault()
        dragDepth.current = Math.max(0, dragDepth.current - 1)
        if (dragDepth.current === 0) setIsDragActive(false)
      }}
      onDrop={(event) => {
        event.preventDefault()
        dragDepth.current = 0
        setIsDragActive(false)
        const file = event.dataTransfer.files[0]
        if (file) handleFile(file)
      }}
    >
      <FileUp aria-hidden="true" className="size-5 text-[color:var(--muted)]" />
      <p className="text-sm font-medium text-[color:var(--foreground)]">{fileName ?? hint}</p>
      {description ? (
        <p className="text-xs text-[color:var(--muted-foreground)]">{description}</p>
      ) : fileName ? (
        <p className="text-xs text-[color:var(--muted-foreground)]">다른 파일을 놓거나 선택해 교체하세요</p>
      ) : null}
      <Input
        ref={inputRef}
        className="sr-only"
        aria-label={ariaLabel}
        type="file"
        accept={accept}
        onChange={(event) => {
          const file = event.target.files?.[0]
          if (file) handleFile(file)
        }}
      />
      <Button type="button" variant="secondary" size="sm" onClick={() => inputRef.current?.click()}>
        파일 선택
      </Button>
    </div>
  )
}

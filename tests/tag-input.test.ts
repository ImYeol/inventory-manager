// @vitest-environment jsdom
import React from 'react'
import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'

import { TagInput } from '@/components/ui/tag-input'

function Harness({ initial = [] as string[], validate }: { initial?: string[]; validate?: (token: string) => string | null }) {
  const [value, setValue] = React.useState<string[]>(initial)
  return React.createElement(TagInput, { value, onChange: setValue, ariaLabel: '태그 입력', validate })
}

describe('TagInput', () => {
  it('adds a chip on Enter and clears the draft', () => {
    render(React.createElement(Harness))
    const input = screen.getByLabelText('태그 입력')
    fireEvent.change(input, { target: { value: 'S' } })
    fireEvent.keyDown(input, { key: 'Enter' })

    expect(screen.getByText('S')).toBeTruthy()
    expect((input as HTMLInputElement).value).toBe('')
  })

  it('removes a chip via its own remove control', () => {
    render(React.createElement(Harness, { initial: ['S', 'M'] }))
    expect(screen.getByText('S')).toBeTruthy()
    expect(screen.getByText('M')).toBeTruthy()

    fireEvent.click(screen.getByRole('button', { name: 'S 삭제' }))

    expect(screen.queryByText('S')).toBeNull()
    expect(screen.getByText('M')).toBeTruthy()
  })

  it('removes the last chip on Backspace when the draft is empty', () => {
    render(React.createElement(Harness, { initial: ['S', 'M'] }))
    const input = screen.getByLabelText('태그 입력')

    fireEvent.keyDown(input, { key: 'Backspace' })

    expect(screen.queryByText('M')).toBeNull()
    expect(screen.getByText('S')).toBeTruthy()
  })

  it('rejects an invalid token at add-time with an inline error and does not add it', () => {
    const validate = vi.fn((token: string) => (token === 'bad' ? '유효하지 않은 값입니다.' : null))
    render(React.createElement(Harness, { validate }))
    const input = screen.getByLabelText('태그 입력')

    fireEvent.change(input, { target: { value: 'bad' } })
    fireEvent.keyDown(input, { key: 'Enter' })

    expect(validate).toHaveBeenCalledWith('bad')
    expect(screen.getByRole('alert').textContent).toBe('유효하지 않은 값입니다.')
    expect(screen.queryByText('bad', { selector: 'span > span' })).toBeNull()
    expect((input as HTMLInputElement).value).toBe('bad')
  })

  it('rejects a duplicate token without calling validate again for the same value', () => {
    render(React.createElement(Harness, { initial: ['S'] }))
    const input = screen.getByLabelText('태그 입력')

    fireEvent.change(input, { target: { value: 'S' } })
    fireEvent.keyDown(input, { key: 'Enter' })

    expect(screen.getByRole('alert').textContent).toBe('이미 추가된 값입니다.')
    expect(screen.getAllByText('S')).toHaveLength(1)
  })
})

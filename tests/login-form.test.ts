// @vitest-environment jsdom
import React from 'react'
import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import LoginForm from '@/app/login/LoginForm'

afterEach(() => {
  cleanup()
})

describe('LoginForm', () => {
  it('renders the expected email/password fields and submit button', () => {
    render(React.createElement(LoginForm))

    expect(screen.getByLabelText('이메일').getAttribute('type')).toBe('email')
    expect(screen.getByLabelText('비밀번호').getAttribute('type')).toBe('password')
    expect(screen.getByRole('button', { name: '로그인' })).toBeTruthy()
  })

  it('does not show an error message before submission', () => {
    render(React.createElement(LoginForm))

    expect(screen.queryByText(/로그인에 실패했습니다/)).toBeNull()
  })
})

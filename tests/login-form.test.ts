// @vitest-environment jsdom
import React from 'react'
import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import LoginForm from '@/app/login/LoginForm'

afterEach(() => {
  cleanup()
})

describe('LoginForm', () => {
  it('renders the Google login button only', () => {
    render(React.createElement(LoginForm))

    expect(screen.getByRole('button', { name: 'Google로 로그인' })).toBeTruthy()
    expect(screen.queryByLabelText('이메일')).toBeNull()
    expect(screen.queryByLabelText('비밀번호')).toBeNull()
  })

  it('does not show an error message before submission', () => {
    render(React.createElement(LoginForm))

    expect(screen.queryByText(/로그인에 실패했습니다/)).toBeNull()
  })
})

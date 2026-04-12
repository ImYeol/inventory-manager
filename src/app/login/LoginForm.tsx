'use client'

import { useActionState } from 'react'
import { useFormStatus } from 'react-dom'
import { login } from './actions'
import { cx, ui } from '../components/ui'

const initialState = { error: '' }

function SubmitButton() {
  const { pending } = useFormStatus()

  return (
    <button
      type="submit"
      disabled={pending}
      className={cx(ui.buttonPrimary, 'h-12 w-full')}
    >
      {pending ? '로그인 중…' : '로그인'}
    </button>
  )
}

export default function LoginForm() {
  const [state, formAction] = useActionState(login, initialState)

  return (
    <form action={formAction} className="space-y-4">
      <div>
        <label htmlFor="email" className={ui.label}>
          이메일
        </label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          spellCheck={false}
          required
          className={cx(ui.control, 'h-12')}
        />
      </div>
      <div>
        <label htmlFor="password" className={ui.label}>
          비밀번호
        </label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          className={cx(ui.control, 'h-12')}
        />
      </div>
      {state.error ? (
        <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700" aria-live="polite">
          {state.error}
        </p>
      ) : null}
      <SubmitButton />
    </form>
  )
}

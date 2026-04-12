'use client'

import { useActionState } from 'react'
import { useFormStatus } from 'react-dom'
import { loginWithGoogle } from './actions'
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
      {pending ? '로그인 처리 중…' : 'Google 계정으로 계속'}
    </button>
  )
}

export default function LoginForm() {
  const [state, formAction] = useActionState(loginWithGoogle, initialState)

  return (
    <form action={formAction} className="space-y-4">
      {state.error ? (
        <p
          className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
          aria-live="polite"
          role="status"
        >
          {state.error}
        </p>
      ) : null}
      <SubmitButton />
    </form>
  )
}

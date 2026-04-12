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
      aria-label="Google로 로그인"
    >
      {pending ? (
        '로그인 처리 중…'
      ) : (
        <span className="inline-flex items-center justify-center gap-2">
          <span aria-hidden="true">
            <svg
              viewBox="0 0 48 48"
              width="18"
              height="18"
              xmlns="http://www.w3.org/2000/svg"
              aria-hidden="true"
            >
              <path
                fill="#4285F4"
                d="M24 9.5c3.06 0 5.65 1.06 7.76 2.8l5.81-5.72C33.64 3.36 29.14 1.5 24 1.5 14.72 1.5 6.9 7.55 3.67 15.78L10.8 20.3C12.24 14.9 17.63 9.5 24 9.5z"
              />
              <path
                fill="#34A853"
                d="M46.5 24.9c0-1.68-.15-2.94-.47-4.22H24v8h12.8c-.55 2.85-2.16 7.09-6.22 9.98l.01-.01L35.9 45.5C43.14 41.42 46.5 33.89 46.5 24.9z"
              />
              <path
                fill="#FBBC05"
                d="M10.8 28.2 8.3 30.04l-5.9 4.67C5.42 39.75 12.6 45.5 24 45.5c6.5 0 11.9-2.14 15.9-5.8l-7.56-5.86c-2.02 1.37-4.63 2.2-8.34 2.2-6.37 0-11.76-4.4-13.45-10.06l-7.25 5.02z"
              />
              <path
                fill="#EA4335"
                d="M3.4 16.94 3.4 16.94 3.4 16.95 3.4 16.94 0 39.5c-.37 1.13.6 2.23 1.77 2.23h11.2c.86 0 1.6-.5 1.98-1.23.38-.73.2-1.59-.45-2.06l-.67-.5-5.4-4.06 1.5-1.27L14.5 18.3 10.8 20.3 5.1 24.8l-1.34-1.1C1.84 21.86.6 20 3.4 16.94z"
              />
            </svg>
          </span>
          Google로 계속하기
        </span>
      )}
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

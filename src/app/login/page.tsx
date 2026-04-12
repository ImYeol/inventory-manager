import { redirect } from 'next/navigation'
import LoginForm from './LoginForm'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { ui } from '../components/ui'

export default async function LoginPage({
  searchParams,
}: {
  searchParams?: Promise<{
    error?: string
  }> | {
    error?: string
  }
}) {
  const resolvedSearchParams = await (searchParams ?? Promise.resolve({}))
  const authError = resolvedSearchParams?.error === 'auth'

  const supabase = await createSupabaseServerClient()
  const {
    data: { session },
  } = await supabase.auth.getSession()

  if (session) {
    redirect('/')
  }

  return (
    <main
      id="main-content"
      className="flex min-h-screen items-center justify-center px-4 py-10"
    >
      <div className="surface w-full max-w-md p-8 md:p-10">
        <div className="mb-8 space-y-3 text-center">
          <span className={ui.pageKicker}>Inventory Manager</span>
          <h1 className="text-3xl font-semibold tracking-tight text-slate-950">로그인</h1>
          <p className="mx-auto max-w-sm text-sm leading-6 text-slate-500">
            Google 계정으로 로그인해 재고관리 시스템에 접근합니다.
          </p>
          {authError ? (
            <p
              className="mx-auto max-w-sm rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
              aria-live="polite"
              role="status"
            >
              인증 처리에 실패했습니다. 잠시 후 다시 시도하세요.
            </p>
          ) : null}
        </div>
        <LoginForm />
      </div>
    </main>
  )
}

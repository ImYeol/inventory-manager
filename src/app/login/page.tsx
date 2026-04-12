import { redirect } from 'next/navigation'
import LoginForm from './LoginForm'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { ui } from '../components/ui'

export default async function LoginPage() {
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
            Supabase Auth 계정으로 재고관리 시스템에 접근합니다.
          </p>
        </div>
        <LoginForm />
      </div>
    </main>
  )
}

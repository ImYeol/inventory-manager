'use server'

import { redirect } from 'next/navigation'
import { headers } from 'next/headers'
import { createSupabaseServerClient } from '@/lib/supabase/server'

type AuthState = {
  error?: string
}

export async function loginWithGoogle(_: AuthState): Promise<AuthState> {
  const supabase = await createSupabaseServerClient()
  const headerStore = await headers()
  const origin = headerStore.get('origin') ?? process.env.NEXT_PUBLIC_SITE_URL
  const redirectTo =
    origin ? new URL('/auth/callback', origin).toString() : undefined

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo,
    },
  })

  if (error) {
    return {
      error: 'Google 로그인 링크 생성에 실패했습니다. 잠시 후 다시 시도하세요.',
    }
  }

  if (!data?.url) {
    return {
      error: 'Google 로그인 링크를 받지 못했습니다. 브라우저 설정을 확인하세요.',
    }
  }

  redirect(data.url)
}

export async function logout() {
  const supabase = await createSupabaseServerClient()
  await supabase.auth.signOut()
  redirect('/login')
}

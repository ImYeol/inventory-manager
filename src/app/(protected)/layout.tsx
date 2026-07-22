import { redirect } from 'next/navigation'
import Nav from '../components/Nav'
import { createSupabaseServerClient } from '@/lib/supabase/server'

export default async function ProtectedLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()

  if (error || !user) {
    redirect('/login')
  }
  const fullName =
    user.user_metadata?.full_name ?? user.user_metadata?.name ?? user.user_metadata?.display_name ?? ''
  const displayName = fullName || user.email?.split('@')[0] || '사용자'

  return (
    <>
      <Nav
        user={{
          name: displayName,
          email: user.email ?? '',
        }}
      />
      <main id="main-content" className="min-h-screen pb-10 pt-16 md:ml-72 md:pt-0">
        {children}
      </main>
    </>
  )
}

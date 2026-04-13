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
    data: { session },
  } = await supabase.auth.getSession()

  if (!session) {
    redirect('/login')
  }

  const user = session.user
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
      <main id="main-content" className="md:ml-60 min-h-screen pb-24 md:pb-10">
        {children}
      </main>
    </>
  )
}

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

  return (
    <>
      <Nav />
      <main id="main-content" className="md:ml-60 min-h-screen pb-24 md:pb-10">
        {children}
      </main>
    </>
  )
}

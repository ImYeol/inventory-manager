import { NextResponse } from 'next/server'

import { createSupabaseServerClient } from '@/lib/supabase/server'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = (() => {
    const nextParam = searchParams.get('next') ?? '/'

    return nextParam.startsWith('/') ? nextParam : '/'
  })()

  if (code) {
    const supabase = await createSupabaseServerClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)

    if (!error) {
      const forwardedHost = request.headers.get('x-forwarded-host')
      const forwardedProto = request.headers.get('x-forwarded-proto')
      const baseUrl =
        forwardedHost && forwardedProto ? `${forwardedProto}://${forwardedHost}` : origin

      return NextResponse.redirect(`${baseUrl}${next}`)
    }
  }

  const callbackErrorUrl = new URL('/login', origin)
  callbackErrorUrl.searchParams.set('error', 'auth')

  return NextResponse.redirect(callbackErrorUrl)
}

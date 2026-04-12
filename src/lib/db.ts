import { createSupabaseServerClient } from './supabase/server'

export async function getSupabaseWithUser() {
  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()

  if (error || !user) {
    throw new Error('Authentication is required.')
  }

  return { supabase, user }
}

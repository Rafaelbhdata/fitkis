// lib/api-auth.ts
//
// Auth helper for API routes that supports BOTH:
//   1. Cookie-based SSR auth (web/clinic — same as before)
//   2. Authorization: Bearer <jwt> (mobile clients)
//
// Routes call getAuthedUser(request); if it returns { user, supabase }
// they're authenticated, otherwise return 401.

import { cookies } from 'next/headers'
import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import type { User } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export async function getAuthedUser(
  request: Request
): Promise<{ user: User | null; supabase: SupabaseClient | null }> {
  // 1. Try cookie auth first (web/clinic).
  const cookieStore = cookies()
  const ssrClient = createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookies: {
      getAll() {
        return cookieStore.getAll()
      },
      setAll(cookiesToSet: { name: string; value: string; options?: CookieOptions }[]) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          )
        } catch {
          // Middleware handles refresh — ignore.
        }
      },
    },
  })
  const { data: { user: cookieUser } } = await ssrClient.auth.getUser()
  if (cookieUser) return { user: cookieUser, supabase: ssrClient }

  // 2. Fallback: Bearer token (mobile clients).
  const authHeader = request.headers.get('Authorization')
  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.slice('Bearer '.length)
    const tokenClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: `Bearer ${token}` } },
    })
    const { data: { user: tokenUser } } = await tokenClient.auth.getUser(token)
    if (tokenUser) return { user: tokenUser, supabase: tokenClient }
  }

  return { user: null, supabase: null }
}

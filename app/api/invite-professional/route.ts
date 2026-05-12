import { createClient as createAdminClient } from '@supabase/supabase-js'
import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'
import { isAdminUser } from '@/lib/clinic/queries'

/**
 * POST /api/invite-professional
 * Body: { email: string }
 *
 * Solo accesible a usuarios con role = 'admin' en user_profiles.
 * Usa service_role_key para llamar auth.admin.inviteUserByEmail —
 * envía el correo de Supabase con magic link que apunta a
 * /auth/callback?next=/onboarding.
 */
export async function POST(request: NextRequest) {
  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll() },
        setAll(cookiesToSet: { name: string; value: string; options?: CookieOptions }[]) {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          )
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autenticado.' }, { status: 401 })

  const isAdmin = await isAdminUser(supabase, user.id)
  if (!isAdmin) return NextResponse.json({ error: 'No autorizado.' }, { status: 403 })

  let email: string
  try {
    const body = await request.json()
    email = (body.email ?? '').trim().toLowerCase()
  } catch {
    return NextResponse.json({ error: 'Body inválido.' }, { status: 400 })
  }

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: 'Email inválido.' }, { status: 400 })
  }

  const adminClient = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? request.nextUrl.origin
  const { error } = await adminClient.auth.admin.inviteUserByEmail(email, {
    redirectTo: `${siteUrl}/auth/callback?next=/onboarding`,
  })

  if (error) {
    if (error.message.toLowerCase().includes('already')) {
      return NextResponse.json(
        { error: 'Este email ya tiene una cuenta en Fitkis.' },
        { status: 409 }
      )
    }
    return NextResponse.json({ error: error.message }, { status: 400 })
  }

  return NextResponse.json({ ok: true })
}

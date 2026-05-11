import { createClient as createAdminClient } from '@supabase/supabase-js'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'

/**
 * POST /api/invite-professional
 * Body: { email: string }
 *
 * Solo accesible al ADMIN_EMAIL definido en variables de entorno.
 * Usa el service_role key para llamar a auth.admin.inviteUserByEmail —
 * esto envía el correo de invitación de Supabase con un magic link que
 * apunta a /auth/callback?next=/onboarding.
 */
export async function POST(request: NextRequest) {
  // --- Verificar que el caller es el administrador ---
  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll() },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          )
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()
  const adminEmail = process.env.ADMIN_EMAIL

  if (!adminEmail) {
    return NextResponse.json(
      { error: 'ADMIN_EMAIL no configurado en variables de entorno.' },
      { status: 500 }
    )
  }

  if (!user || user.email !== adminEmail) {
    return NextResponse.json({ error: 'No autorizado.' }, { status: 403 })
  }

  // --- Validar body ---
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

  // --- Enviar invitación con service_role ---
  const admin = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? request.nextUrl.origin

  const { error } = await admin.auth.admin.inviteUserByEmail(email, {
    redirectTo: `${siteUrl}/auth/callback?next=/onboarding`,
  })

  if (error) {
    // "User already registered" es un error esperado — se lo decimos claramente
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

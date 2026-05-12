import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'
import {
  isAdminUser,
  deactivateProfessional,
  reactivateProfessional,
} from '@/lib/clinic/queries'

/**
 * PATCH /api/admin/professional
 * Body: { id: string, action: 'deactivate' | 'reactivate' }
 *
 * Solo accesible para usuarios con role = 'admin' en user_profiles.
 */
export async function PATCH(request: NextRequest) {
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

  const admin = await isAdminUser(supabase, user.id)
  if (!admin) return NextResponse.json({ error: 'No autorizado.' }, { status: 403 })

  let id: string, action: string
  try {
    const body = await request.json()
    id     = body.id
    action = body.action
  } catch {
    return NextResponse.json({ error: 'Body inválido.' }, { status: 400 })
  }

  if (!id || !['deactivate', 'reactivate'].includes(action)) {
    return NextResponse.json({ error: 'Parámetros inválidos.' }, { status: 400 })
  }

  const result = action === 'deactivate'
    ? await deactivateProfessional(supabase, id)
    : await reactivateProfessional(supabase, id)

  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 })
  return NextResponse.json({ ok: true })
}

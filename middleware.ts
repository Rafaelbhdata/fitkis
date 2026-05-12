import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet: { name: string; value: string; options?: CookieOptions }[]) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()

  const path = request.nextUrl.pathname

  const isAuthPage    = path.startsWith('/login') || path.startsWith('/register')
  const isClinicRoute = path.startsWith('/clinic')
  const isOnboarding  = path.startsWith('/onboarding')
  const isAdminRoute  = path.startsWith('/admin')
  // NOTE: /api/* y /auth/callback se excluyen intencionalmente.
  //  - /api/* hace su propia auth con bearer tokens (app móvil) + cookies (web).
  //  - /auth/callback necesita correr sin sesión para intercambiar el magic link code.

  // ── Sin sesión → login ───────────────────────────────────────────────────
  if (!user && (isClinicRoute || isOnboarding || isAdminRoute)) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  if (user) {
    // Cargamos el perfil una sola vez para todas las verificaciones de rol.
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('role')
      .eq('user_id', user.id)
      .maybeSingle()

    const role = profile?.role as string | undefined

    // ── Páginas de auth con sesión → redirigir según rol ──────────────────
    if (isAuthPage) {
      if (role === 'admin') {
        const url = request.nextUrl.clone()
        url.pathname = '/admin'
        return NextResponse.redirect(url)
      }
      // Verificar si tiene registro en practitioners (puede tener rol 'user' aún
      // si el onboarding no actualizó el campo role, así que chequeamos la tabla)
      const { data: practitioner } = await supabase
        .from('practitioners')
        .select('id')
        .eq('user_id', user.id)
        .eq('active', true)
        .maybeSingle()

      const url = request.nextUrl.clone()
      url.pathname = practitioner ? '/clinic' : '/download'
      return NextResponse.redirect(url)
    }

    // ── /admin/* solo para admins ─────────────────────────────────────────
    if (isAdminRoute && role !== 'admin') {
      const url = request.nextUrl.clone()
      url.pathname = '/clinic'
      return NextResponse.redirect(url)
    }

    // ── /clinic/* solo para practitioners activos ─────────────────────────
    if (isClinicRoute) {
      const { data: practitioner } = await supabase
        .from('practitioners')
        .select('id')
        .eq('user_id', user.id)
        .eq('active', true)
        .maybeSingle()

      if (!practitioner) {
        const url = request.nextUrl.clone()
        // Sin practitioner activo → onboarding (puede que acaben de ser invitados)
        url.pathname = '/onboarding'
        return NextResponse.redirect(url)
      }
    }
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}

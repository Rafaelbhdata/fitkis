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

  // ── Rutas protegidas sin sesión → login ─────────────────────────────────
  if (!user && (isClinicRoute || isOnboarding || isAdminRoute)) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  if (user) {
    // ── Páginas de auth con sesión activa → redirigir según rol ───────────
    if (isAuthPage) {
      const { data: practitioner } = await supabase
        .from('practitioners')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle()

      const url = request.nextUrl.clone()
      // Practitioner sin perfil completo → onboarding
      // (el propio onboarding verifica y evita bucles si ya existe el registro)
      url.pathname = practitioner ? '/clinic' : '/download'
      return NextResponse.redirect(url)
    }

    // ── /clinic/* solo para practitioners ────────────────────────────────
    if (isClinicRoute) {
      const { data: practitioner } = await supabase
        .from('practitioners')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle()

      if (!practitioner) {
        const url = request.nextUrl.clone()
        // Si acaban de completar el onboarding y aún no tiene registro activo
        // en la sesión, los mandamos a onboarding para que no vean un error.
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

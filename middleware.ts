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

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const path = request.nextUrl.pathname

  const isAuthPage = path.startsWith('/login') || path.startsWith('/register')
  const isClinicRoute = path.startsWith('/clinic')
  const isOnboarding = path.startsWith('/onboarding')

  // NOTE: /api/* rutas no están aquí intencionalmente — hacen su propia auth
  // via lib/api-auth.ts con soporte para bearer tokens (móvil) y cookies (web).

  // Rutas de clínica y onboarding requieren sesión
  if (!user && (isClinicRoute || isOnboarding)) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  if (user) {
    const { data: professional } = await supabase
      .from('practitioners')
      .select('id')
      .eq('user_id', user.id)
      .maybeSingle()

    // Usuario autenticado en páginas de auth: redirigir según rol
    if (isAuthPage) {
      const url = request.nextUrl.clone()
      url.pathname = professional ? '/clinic' : '/download'
      return NextResponse.redirect(url)
    }

    // Rutas de clínica: solo profesionales
    if (isClinicRoute && !professional) {
      const url = request.nextUrl.clone()
      url.pathname = '/download'
      return NextResponse.redirect(url)
    }
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}

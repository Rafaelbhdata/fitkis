import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  })

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
          supabaseResponse = NextResponse.next({
            request,
          })
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

  const isAuthPage = request.nextUrl.pathname.startsWith('/login') ||
                     request.nextUrl.pathname.startsWith('/register')

  const isProtectedRoute = request.nextUrl.pathname.startsWith('/dashboard') ||
                           request.nextUrl.pathname.startsWith('/gym') ||
                           request.nextUrl.pathname.startsWith('/food') ||
                           request.nextUrl.pathname.startsWith('/habits') ||
                           request.nextUrl.pathname.startsWith('/weight') ||
                           request.nextUrl.pathname.startsWith('/journal') ||
                           request.nextUrl.pathname.startsWith('/coach') ||
                           request.nextUrl.pathname.startsWith('/settings') ||
                           request.nextUrl.pathname.startsWith('/api/chat')

  const isClinicRoute = request.nextUrl.pathname.startsWith('/clinic')

  // Redirect to login if accessing protected route without auth
  if (!user && (isProtectedRoute || isClinicRoute)) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  // Logged-in user landing on auth pages: route by role.
  // Practitioners go to /clinic, patients to /dashboard.
  if (user && isAuthPage) {
    const { data: practitioner } = await supabase
      .from('practitioners')
      .select('id')
      .eq('user_id', user.id)
      .maybeSingle()

    const url = request.nextUrl.clone()
    url.pathname = practitioner ? '/clinic' : '/dashboard'
    return NextResponse.redirect(url)
  }

  // Enforce practitioner role for /clinic/*
  // Clinic pages still do their own defense-in-depth check, but this blocks
  // unauthenticated probing and makes the boundary explicit.
  if (user && isClinicRoute) {
    const { data: practitioner } = await supabase
      .from('practitioners')
      .select('id')
      .eq('user_id', user.id)
      .maybeSingle()

    if (!practitioner) {
      const url = request.nextUrl.clone()
      url.pathname = '/dashboard'
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

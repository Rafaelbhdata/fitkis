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

  // NOTE: don't list `/api/*` here. API routes do their own auth via
  // getAuthedUser, which supports bearer tokens (mobile) AND cookies (web).
  // Listing them in middleware redirects bearer-only mobile requests to
  // /login (307) because the middleware can only see cookies.
  const isClinicRoute = request.nextUrl.pathname.startsWith('/clinic')

  // Redirect to login if accessing protected route without auth
  if (!user && isClinicRoute) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  // Logged-in user landing on auth pages: practitioners -> /clinic,
  // anyone else gets the download page (patient app lives elsewhere).
  if (user && isAuthPage) {
    const { data: practitioner } = await supabase
      .from('practitioners')
      .select('id')
      .eq('user_id', user.id)
      .maybeSingle()

    const url = request.nextUrl.clone()
    url.pathname = practitioner ? '/clinic' : '/download'
    return NextResponse.redirect(url)
  }

  // Enforce practitioner role for /clinic/*
  if (user && isClinicRoute) {
    const { data: practitioner } = await supabase
      .from('practitioners')
      .select('id')
      .eq('user_id', user.id)
      .maybeSingle()

    if (!practitioner) {
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

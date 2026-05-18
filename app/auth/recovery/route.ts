import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'

// Canjea el code del email de recuperación por una sesión y manda al formulario
// de nueva contraseña. Ruta dedicada (sin query string) para que el redirectTo
// matchee limpio contra la allow-list de Supabase (los wildcards no aceptan
// query params).
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')

  if (code) {
    const cookieStore = await cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll()
          },
          setAll(cookiesToSet: { name: string; value: string; options?: CookieOptions }[]) {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          },
        },
      }
    )

    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      return NextResponse.redirect(new URL('/reset-password', origin))
    }
    console.error('[auth/recovery] exchangeCodeForSession failed:', error)
    return NextResponse.redirect(
      new URL(`/login?error=recovery_exchange&detail=${encodeURIComponent(error.message)}`, origin)
    )
  }

  console.error('[auth/recovery] no code param in URL')
  return NextResponse.redirect(new URL('/login?error=recovery_no_code', origin))
}

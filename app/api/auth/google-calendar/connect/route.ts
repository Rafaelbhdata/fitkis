import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import crypto from 'crypto'

const GOOGLE_AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth'
const SCOPES = 'https://www.googleapis.com/auth/calendar.freebusy'

export async function GET() {
  const cookieStore = cookies()

  // Verificar sesión activa
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } }
  )
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

  // Buscar practitioner_id del usuario
  const serviceSupabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  )
  const { data: prac } = await serviceSupabase
    .from('practitioners')
    .select('id')
    .eq('user_id', user.id)
    .maybeSingle()

  if (!prac) return NextResponse.json({ error: 'Nutrióloga no encontrada' }, { status: 404 })

  const csrfToken = crypto.randomBytes(16).toString('hex')
  const state = Buffer.from(JSON.stringify({ practitionerId: prac.id, csrfToken })).toString('base64url')

  const params = new URLSearchParams({
    client_id:     process.env.GOOGLE_CALENDAR_CLIENT_ID!,
    redirect_uri:  process.env.GOOGLE_CALENDAR_REDIRECT_URI!,
    response_type: 'code',
    scope:         SCOPES,
    access_type:   'offline',
    prompt:        'consent',
    state,
  })

  const res = NextResponse.redirect(`${GOOGLE_AUTH_URL}?${params}`)
  // Guardar csrf en cookie HttpOnly para verificarlo en callback
  res.cookies.set('gc_oauth_state', csrfToken, {
    httpOnly: true,
    secure:   process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge:   600, // 10 minutos
    path:     '/',
  })
  return res
}

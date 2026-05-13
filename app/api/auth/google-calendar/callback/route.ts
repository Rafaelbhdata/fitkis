import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token'
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'

export async function GET(req: NextRequest) {
  const cookieStore = cookies()
  const { searchParams } = new URL(req.url)

  const code  = searchParams.get('code')
  const state = searchParams.get('state')
  const err   = searchParams.get('error')

  const redirectFail = (msg: string) =>
    NextResponse.redirect(`${SITE_URL}/clinic/ajustes?tab=agenda&calendar_error=${encodeURIComponent(msg)}`)

  if (err) return redirectFail('Acceso denegado por el usuario')
  if (!code || !state) return redirectFail('Parámetros inválidos')

  // Verificar CSRF
  let practitionerId: string
  try {
    const parsed = JSON.parse(Buffer.from(state, 'base64url').toString())
    const storedCsrf = cookieStore.get('gc_oauth_state')?.value
    if (!storedCsrf || storedCsrf !== parsed.csrfToken) return redirectFail('Estado inválido (CSRF)')
    practitionerId = parsed.practitionerId
  } catch {
    return redirectFail('Estado malformado')
  }

  // Intercambiar code por tokens
  const tokenRes = await fetch(GOOGLE_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id:     process.env.GOOGLE_CALENDAR_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CALENDAR_CLIENT_SECRET!,
      redirect_uri:  process.env.GOOGLE_CALENDAR_REDIRECT_URI!,
      grant_type:    'authorization_code',
    }),
  })

  if (!tokenRes.ok) return redirectFail('Error al obtener tokens de Google')

  const tokens = await tokenRes.json()
  if (!tokens.refresh_token) return redirectFail('Google no devolvió refresh_token — intenta desconectar y reconectar')

  const expiry = new Date(Date.now() + tokens.expires_in * 1000).toISOString()

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  )

  const { error } = await supabase
    .from('practitioner_calendar_connections')
    .upsert({
      practitioner_id: practitionerId,
      provider:        'google',
      access_token:    tokens.access_token,
      refresh_token:   tokens.refresh_token,
      token_expiry:    expiry,
      calendar_id:     'primary',
      connected_at:    new Date().toISOString(),
    }, { onConflict: 'practitioner_id,provider' })

  if (error) return redirectFail('Error al guardar la conexión')

  const res = NextResponse.redirect(`${SITE_URL}/clinic/ajustes?tab=agenda&calendar_connected=1`)
  res.cookies.delete('gc_oauth_state')
  return res
}

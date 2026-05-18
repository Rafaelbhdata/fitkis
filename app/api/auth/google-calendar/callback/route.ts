import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const GOOGLE_TOKEN_URL    = 'https://oauth2.googleapis.com/token'
const GOOGLE_USERINFO_URL = 'https://www.googleapis.com/oauth2/v2/userinfo'
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

  // Identificar la cuenta conectada (sin esto no podemos distinguir N cuentas).
  const userinfoRes = await fetch(GOOGLE_USERINFO_URL, {
    headers: { Authorization: `Bearer ${tokens.access_token}` },
  })
  if (!userinfoRes.ok) return redirectFail('No se pudo identificar la cuenta de Google')
  const userinfo = await userinfoRes.json()
  const googleEmail: string | undefined = userinfo.email
  if (!googleEmail) return redirectFail('Google no devolvió el email de la cuenta')

  const expiry = new Date(Date.now() + tokens.expires_in * 1000).toISOString()

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  )

  // ¿Es la primera conexión de esta nutrióloga? Si sí, marcar como write target.
  const { data: existingForPrac } = await supabase
    .from('practitioner_calendar_connections')
    .select('id, is_write_target')
    .eq('practitioner_id', practitionerId)

  const shouldBeWriteTarget =
    !existingForPrac?.length ||
    !existingForPrac.some((c) => (c as { is_write_target: boolean }).is_write_target)

  // ¿Ya existe esta cuenta exacta? Si sí, refrescamos sus tokens (preservamos flags).
  // Si no, insertamos nueva fila.
  const { data: existingSameAccount } = await supabase
    .from('practitioner_calendar_connections')
    .select('id')
    .eq('practitioner_id', practitionerId)
    .eq('provider', 'google')
    .eq('google_email', googleEmail)
    .maybeSingle()

  if (existingSameAccount) {
    const { error } = await supabase
      .from('practitioner_calendar_connections')
      .update({
        access_token:  tokens.access_token,
        refresh_token: tokens.refresh_token,
        token_expiry:  expiry,
        connected_at:  new Date().toISOString(),
        degraded_at:   null,
      })
      .eq('id', (existingSameAccount as { id: string }).id)

    if (error) return redirectFail('Error al actualizar la conexión')
  } else {
    const { error } = await supabase
      .from('practitioner_calendar_connections')
      .insert({
        practitioner_id: practitionerId,
        provider:        'google',
        google_email:    googleEmail,
        access_token:    tokens.access_token,
        refresh_token:   tokens.refresh_token,
        token_expiry:    expiry,
        calendar_id:     'primary',
        connected_at:    new Date().toISOString(),
        is_write_target: shouldBeWriteTarget,
        read_enabled:    true,
      })

    if (error) return redirectFail('Error al guardar la conexión')
  }

  const res = NextResponse.redirect(`${SITE_URL}/clinic/ajustes?tab=agenda&calendar_connected=1`)
  res.cookies.delete('gc_oauth_state')
  return res
}

/**
 * scripts/backfill-calendar-google-email.js
 *
 * Llena la columna `google_email` en `practitioner_calendar_connections`
 * para conexiones creadas antes de la migración 041.
 *
 * Por cada fila con google_email NULL:
 *   1. Refresca el access_token con el refresh_token guardado.
 *   2. Llama a https://www.googleapis.com/oauth2/v2/userinfo.
 *   3. Actualiza google_email + access_token + token_expiry.
 *
 * Limitación conocida: las conexiones viejas tienen solo el scope
 * `calendar.freebusy`. userinfo requiere `openid email`. Si Google
 * responde 401/403 por scope insuficiente, la fila se marca como
 * degraded_at = NOW() y la UI le pedirá a la nutrióloga reconectar.
 *
 * Uso:
 *   node scripts/backfill-calendar-google-email.js          # ejecuta
 *   node scripts/backfill-calendar-google-email.js --dry    # solo reporta
 *
 * Requiere en .env.local:
 *   NEXT_PUBLIC_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 *   GOOGLE_CALENDAR_CLIENT_ID
 *   GOOGLE_CALENDAR_CLIENT_SECRET
 */

require('dotenv').config({ path: '.env.local' })
const { createClient } = require('@supabase/supabase-js')

const SUPABASE_URL      = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_KEY      = process.env.SUPABASE_SERVICE_ROLE_KEY
const GOOGLE_CLIENT_ID  = process.env.GOOGLE_CALENDAR_CLIENT_ID
const GOOGLE_CLIENT_SEC = process.env.GOOGLE_CALENDAR_CLIENT_SECRET

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('Faltan NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY en .env.local')
  process.exit(1)
}
if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SEC) {
  console.error('Faltan GOOGLE_CALENDAR_CLIENT_ID o GOOGLE_CALENDAR_CLIENT_SECRET en .env.local')
  process.exit(1)
}

const DRY_RUN = process.argv.includes('--dry')

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: { persistSession: false },
})

async function refreshAccessToken(refreshToken) {
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id:     GOOGLE_CLIENT_ID,
      client_secret: GOOGLE_CLIENT_SEC,
      refresh_token: refreshToken,
      grant_type:    'refresh_token',
    }),
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`refresh falló (${res.status}): ${text}`)
  }
  const data = await res.json()
  return {
    accessToken: data.access_token,
    expiry:      new Date(Date.now() + data.expires_in * 1000),
  }
}

async function fetchGoogleEmail(accessToken) {
  const res = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
    headers: { Authorization: `Bearer ${accessToken}` },
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`userinfo falló (${res.status}): ${text}`)
  }
  const data = await res.json()
  if (!data.email) throw new Error('userinfo no devolvió email')
  return data.email
}

async function main() {
  console.log(DRY_RUN ? '🔍 Modo dry-run (sin escribir)\n' : '✍️  Modo escritura\n')

  const { data: rows, error } = await supabase
    .from('practitioner_calendar_connections')
    .select('id, practitioner_id, refresh_token, provider')
    .is('google_email', null)
    .eq('provider', 'google')

  if (error) {
    console.error('Error leyendo conexiones:', error)
    process.exit(1)
  }

  if (!rows.length) {
    console.log('No hay conexiones por backfillear. ✅')
    return
  }

  console.log(`Encontradas ${rows.length} conexión(es) sin google_email.\n`)

  let ok = 0
  let scopeFail = 0
  let otherFail = 0

  for (const row of rows) {
    process.stdout.write(`· ${row.id.slice(0, 8)}… (practitioner ${row.practitioner_id.slice(0, 8)}…): `)

    try {
      const { accessToken, expiry } = await refreshAccessToken(row.refresh_token)
      const email = await fetchGoogleEmail(accessToken)

      if (DRY_RUN) {
        console.log(`[dry] habría guardado ${email}`)
      } else {
        const { error: upErr } = await supabase
          .from('practitioner_calendar_connections')
          .update({
            google_email: email,
            access_token: accessToken,
            token_expiry: expiry.toISOString(),
            degraded_at:  null,
          })
          .eq('id', row.id)

        if (upErr) throw upErr
        console.log(`✓ ${email}`)
      }
      ok++
    } catch (err) {
      const msg = err.message || String(err)
      const isScope = /insufficient.?scope|invalid.?scope|401|403/i.test(msg)

      if (isScope) {
        scopeFail++
        console.log(`⚠ scope insuficiente — requerirá reconexión`)
        if (!DRY_RUN) {
          await supabase
            .from('practitioner_calendar_connections')
            .update({ degraded_at: new Date().toISOString() })
            .eq('id', row.id)
        }
      } else {
        otherFail++
        console.log(`✗ ${msg}`)
        if (!DRY_RUN) {
          await supabase
            .from('practitioner_calendar_connections')
            .update({ degraded_at: new Date().toISOString() })
            .eq('id', row.id)
        }
      }
    }
  }

  console.log(`\nResumen: ${ok} ok · ${scopeFail} scope insuficiente · ${otherFail} otros errores`)
}

main().catch((e) => {
  console.error('Error fatal:', e)
  process.exit(1)
})

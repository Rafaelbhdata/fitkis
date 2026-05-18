/**
 * Helper server-side para interactuar con la Google Calendar API.
 * Solo debe importarse en rutas de API (server-side) — nunca en componentes cliente.
 * Los tokens se leen con service role y nunca se exponen al browser.
 *
 * Soporta múltiples conexiones por nutrióloga (una por cuenta Google).
 * Solo las conexiones con read_enabled=true se agregan al cálculo de busy blocks.
 */

import { createClient } from '@supabase/supabase-js'

const GOOGLE_TOKEN_URL    = 'https://oauth2.googleapis.com/token'
const GOOGLE_FREEBUSY_URL = 'https://www.googleapis.com/calendar/v3/freeBusy'
const GOOGLE_REVOKE_URL   = 'https://oauth2.googleapis.com/revoke'

export type BusyBlock = { start: string; end: string }

type ConnectionRow = {
  id:             string
  access_token:   string
  refresh_token:  string
  token_expiry:   string
  calendar_id:    string
  google_email:   string | null
}

function serviceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  )
}

async function refreshAccessToken(refreshToken: string): Promise<{ access_token: string; expiry: Date }> {
  const res = await fetch(GOOGLE_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id:     process.env.GOOGLE_CALENDAR_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CALENDAR_CLIENT_SECRET!,
      refresh_token: refreshToken,
      grant_type:    'refresh_token',
    }),
  })
  if (!res.ok) throw new Error('No se pudo renovar el token de Google Calendar')
  const data = await res.json()
  return {
    access_token: data.access_token,
    expiry: new Date(Date.now() + data.expires_in * 1000),
  }
}

/**
 * Devuelve un access token vigente para una conexión, refrescándolo si está
 * por expirar (<5min). En caso de fallo de refresh marca la conexión como
 * degraded y devuelve null para que el caller la descarte sin romper.
 */
async function ensureFreshToken(conn: ConnectionRow): Promise<string | null> {
  const expiry = new Date(conn.token_expiry)
  if (expiry.getTime() - Date.now() >= 5 * 60 * 1000) {
    return conn.access_token
  }

  const supabase = serviceClient()
  try {
    const refreshed = await refreshAccessToken(conn.refresh_token)
    await supabase
      .from('practitioner_calendar_connections')
      .update({ access_token: refreshed.access_token, token_expiry: refreshed.expiry.toISOString(), degraded_at: null })
      .eq('id', conn.id)
    return refreshed.access_token
  } catch {
    await supabase
      .from('practitioner_calendar_connections')
      .update({ degraded_at: new Date().toISOString() })
      .eq('id', conn.id)
    return null
  }
}

async function getReadableConnections(practitionerId: string): Promise<ConnectionRow[]> {
  const supabase = serviceClient()
  const { data } = await supabase
    .from('practitioner_calendar_connections')
    .select('id, access_token, refresh_token, token_expiry, calendar_id, google_email')
    .eq('practitioner_id', practitionerId)
    .eq('provider', 'google')
    .eq('read_enabled', true)
  return (data ?? []) as ConnectionRow[]
}

async function queryFreeBusy(
  accessToken: string,
  calendarId: string,
  timeMin: string,
  timeMax: string,
): Promise<BusyBlock[]> {
  const res = await fetch(GOOGLE_FREEBUSY_URL, {
    method: 'POST',
    headers: {
      'Content-Type':  'application/json',
      'Authorization': `Bearer ${accessToken}`,
    },
    body: JSON.stringify({ timeMin, timeMax, items: [{ id: calendarId }] }),
  })
  if (!res.ok) return []
  const data = await res.json()
  return data?.calendars?.[calendarId]?.busy ?? []
}

// Cache en memoria por [practitionerId]-[date], TTL 60s. Los blocks
// agregados de todas las cuentas se cachean juntos para mantener una
// sola llamada efectiva por slot lookup.
const busyCache = new Map<string, { blocks: BusyBlock[]; expiresAt: number }>()

export async function getBusyBlocks(
  practitionerId: string,
  dateISO: string,        // 'YYYY-MM-DD' en zona CDMX
): Promise<BusyBlock[]> {
  const cacheKey = `${practitionerId}-${dateISO}`
  const cached = busyCache.get(cacheKey)
  if (cached && cached.expiresAt > Date.now()) return cached.blocks

  const conns = await getReadableConnections(practitionerId)
  if (!conns.length) return []

  const timeMin = `${dateISO}T00:00:00-06:00`
  const timeMax = `${dateISO}T23:59:59-06:00`

  // freeBusy.items solo admite calendarios de la cuenta dueña del token,
  // así que con N cuentas distintas hacemos N requests en paralelo.
  const allBlocks = await Promise.all(
    conns.map(async (conn) => {
      const token = await ensureFreshToken(conn)
      if (!token) return []
      return queryFreeBusy(token, conn.calendar_id, timeMin, timeMax)
    })
  )

  const merged = allBlocks.flat()
  busyCache.set(cacheKey, { blocks: merged, expiresAt: Date.now() + 60_000 })
  return merged
}

/** Devuelve bloques de un rango de fechas (para la grilla semanal de la agenda). */
export async function getBusyBlocksRange(
  practitionerId: string,
  fromISO: string,  // 'YYYY-MM-DD'
  toISO: string,    // 'YYYY-MM-DD' (inclusive)
): Promise<BusyBlock[]> {
  const conns = await getReadableConnections(practitionerId)
  if (!conns.length) return []

  const timeMin = `${fromISO}T00:00:00-06:00`
  const timeMax = `${toISO}T23:59:59-06:00`

  const allBlocks = await Promise.all(
    conns.map(async (conn) => {
      const token = await ensureFreshToken(conn)
      if (!token) return []
      return queryFreeBusy(token, conn.calendar_id, timeMin, timeMax)
    })
  )

  return allBlocks.flat()
}

export async function revokeCalendarConnection(practitionerId: string): Promise<void> {
  const supabase = serviceClient()

  // Multi-cuenta: borra TODAS las conexiones de la nutrióloga (endpoint
  // legacy de "Desconectar" total). El borrado individual usa
  // DELETE /api/auth/google-calendar/connections/:id.
  const { data: conns } = await supabase
    .from('practitioner_calendar_connections')
    .select('refresh_token')
    .eq('practitioner_id', practitionerId)
    .eq('provider', 'google')

  for (const c of conns ?? []) {
    const token = (c as { refresh_token?: string }).refresh_token
    if (token) {
      await fetch(`${GOOGLE_REVOKE_URL}?token=${token}`, { method: 'POST' }).catch(() => {})
    }
  }

  await supabase
    .from('practitioner_calendar_connections')
    .delete()
    .eq('practitioner_id', practitionerId)
    .eq('provider', 'google')
}

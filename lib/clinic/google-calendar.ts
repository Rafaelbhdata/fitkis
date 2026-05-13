/**
 * Helper server-side para interactuar con la Google Calendar FreeBusy API.
 * Solo debe importarse en rutas de API (server-side) — nunca en componentes cliente.
 * Los tokens se leen con service role y nunca se exponen al browser.
 */

import { createClient } from '@supabase/supabase-js'

const GOOGLE_TOKEN_URL  = 'https://oauth2.googleapis.com/token'
const GOOGLE_FREEBUSY_URL = 'https://www.googleapis.com/calendar/v3/freeBusy'
const GOOGLE_REVOKE_URL = 'https://oauth2.googleapis.com/revoke'

export type BusyBlock = { start: string; end: string }

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

// Cache en memoria por [practitionerId]-[date], TTL 60s
const busyCache = new Map<string, { blocks: BusyBlock[]; expiresAt: number }>()

export async function getBusyBlocks(
  practitionerId: string,
  dateISO: string,        // 'YYYY-MM-DD' en zona CDMX
): Promise<BusyBlock[]> {
  const cacheKey = `${practitionerId}-${dateISO}`
  const cached = busyCache.get(cacheKey)
  if (cached && cached.expiresAt > Date.now()) return cached.blocks

  const supabase = serviceClient()

  const { data: conn, error } = await supabase
    .from('practitioner_calendar_connections')
    .select('access_token, refresh_token, token_expiry, calendar_id')
    .eq('practitioner_id', practitionerId)
    .eq('provider', 'google')
    .maybeSingle()

  if (error || !conn) return []

  let accessToken = conn.access_token
  const expiry = new Date(conn.token_expiry)

  // Renovar si expira en menos de 5 minutos
  if (expiry.getTime() - Date.now() < 5 * 60 * 1000) {
    try {
      const refreshed = await refreshAccessToken(conn.refresh_token)
      accessToken = refreshed.access_token
      await supabase
        .from('practitioner_calendar_connections')
        .update({ access_token: refreshed.access_token, token_expiry: refreshed.expiry.toISOString() })
        .eq('practitioner_id', practitionerId)
        .eq('provider', 'google')
    } catch {
      return []
    }
  }

  // Rango del día completo en CDMX (UTC-6)
  const timeMin = `${dateISO}T00:00:00-06:00`
  const timeMax = `${dateISO}T23:59:59-06:00`

  const res = await fetch(GOOGLE_FREEBUSY_URL, {
    method: 'POST',
    headers: {
      'Content-Type':  'application/json',
      'Authorization': `Bearer ${accessToken}`,
    },
    body: JSON.stringify({
      timeMin,
      timeMax,
      items: [{ id: conn.calendar_id }],
    }),
  })

  if (!res.ok) return []

  const data = await res.json()
  const blocks: BusyBlock[] = data?.calendars?.[conn.calendar_id]?.busy ?? []

  busyCache.set(cacheKey, { blocks, expiresAt: Date.now() + 60_000 })
  return blocks
}

/** Devuelve bloques de un rango de fechas (para la grilla semanal de la agenda). */
export async function getBusyBlocksRange(
  practitionerId: string,
  fromISO: string,  // 'YYYY-MM-DD'
  toISO: string,    // 'YYYY-MM-DD' (inclusive)
): Promise<BusyBlock[]> {
  const supabase = serviceClient()

  const { data: conn, error } = await supabase
    .from('practitioner_calendar_connections')
    .select('access_token, refresh_token, token_expiry, calendar_id')
    .eq('practitioner_id', practitionerId)
    .eq('provider', 'google')
    .maybeSingle()

  if (error || !conn) return []

  let accessToken = conn.access_token
  const expiry = new Date(conn.token_expiry)

  if (expiry.getTime() - Date.now() < 5 * 60 * 1000) {
    try {
      const refreshed = await refreshAccessToken(conn.refresh_token)
      accessToken = refreshed.access_token
      await supabase
        .from('practitioner_calendar_connections')
        .update({ access_token: refreshed.access_token, token_expiry: refreshed.expiry.toISOString() })
        .eq('practitioner_id', practitionerId)
        .eq('provider', 'google')
    } catch {
      return []
    }
  }

  const res = await fetch(GOOGLE_FREEBUSY_URL, {
    method: 'POST',
    headers: {
      'Content-Type':  'application/json',
      'Authorization': `Bearer ${accessToken}`,
    },
    body: JSON.stringify({
      timeMin: `${fromISO}T00:00:00-06:00`,
      timeMax: `${toISO}T23:59:59-06:00`,
      items:   [{ id: conn.calendar_id }],
    }),
  })

  if (!res.ok) return []

  const data = await res.json()
  return data?.calendars?.[conn.calendar_id]?.busy ?? []
}

export async function revokeCalendarConnection(practitionerId: string): Promise<void> {
  const supabase = serviceClient()

  const { data: conn } = await supabase
    .from('practitioner_calendar_connections')
    .select('access_token, refresh_token')
    .eq('practitioner_id', practitionerId)
    .eq('provider', 'google')
    .maybeSingle()

  if (conn) {
    // Intentar revocar en Google — si falla, igual eliminamos de BD
    await fetch(`${GOOGLE_REVOKE_URL}?token=${conn.refresh_token}`, { method: 'POST' }).catch(() => {})
  }

  await supabase
    .from('practitioner_calendar_connections')
    .delete()
    .eq('practitioner_id', practitionerId)
    .eq('provider', 'google')
}

/**
 * Escritura de eventos en Google Calendar.
 *
 * Solo se ejecuta si CALENDAR_WRITE_ENABLED=true (scope calendar.events
 * requiere re-verificación con Google y este flag controla el rollout).
 * Si el flag está apagado o no hay write target, las funciones devuelven
 * null sin hacer nada — el caller debe tratarlas como fire-and-forget y
 * NUNCA bloquear la operación de booking si fallan.
 */

import { createClient } from '@supabase/supabase-js'

const GOOGLE_TOKEN_URL    = 'https://oauth2.googleapis.com/token'
const GOOGLE_EVENTS_URL   = 'https://www.googleapis.com/calendar/v3/calendars'
const APP_TZ              = 'America/Mexico_City'

type WriteConnection = {
  id:            string
  access_token:  string
  refresh_token: string
  token_expiry:  string
  calendar_id:   string
}

export type CreatedEvent = {
  google_event_id:               string
  google_calendar_connection_id: string
}

function service() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  )
}

function writeEnabled(): boolean {
  return process.env.CALENDAR_WRITE_ENABLED === 'true'
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
  if (!res.ok) throw new Error('refresh token write target')
  const data = await res.json()
  return { access_token: data.access_token, expiry: new Date(Date.now() + data.expires_in * 1000) }
}

async function getWriteTarget(practitionerId: string): Promise<WriteConnection | null> {
  const { data } = await service()
    .from('practitioner_calendar_connections')
    .select('id, access_token, refresh_token, token_expiry, calendar_id')
    .eq('practitioner_id', practitionerId)
    .eq('provider', 'google')
    .eq('is_write_target', true)
    .maybeSingle()
  return (data as WriteConnection | null) ?? null
}

async function ensureFreshToken(conn: WriteConnection): Promise<string | null> {
  const expiry = new Date(conn.token_expiry)
  if (expiry.getTime() - Date.now() >= 5 * 60 * 1000) return conn.access_token

  const supabase = service()
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

async function markConnectionDegraded(connectionId: string) {
  await service()
    .from('practitioner_calendar_connections')
    .update({ degraded_at: new Date().toISOString() })
    .eq('id', connectionId)
}

export type AppointmentEventInput = {
  practitionerId:   string
  startISO:         string
  durationMinutes:  number
  patientName:      string
  patientEmail:     string
  notes?:           string | null
  practitionerName?: string | null
}

export async function createCalendarEvent(
  input: AppointmentEventInput,
): Promise<CreatedEvent | null> {
  if (!writeEnabled()) return null
  const conn = await getWriteTarget(input.practitionerId)
  if (!conn) return null
  const token = await ensureFreshToken(conn)
  if (!token) return null

  const start = new Date(input.startISO)
  const end   = new Date(start.getTime() + input.durationMinutes * 60_000)

  const summary = input.practitionerName
    ? `Consulta con ${input.patientName}`
    : `Consulta · ${input.patientName}`

  const url = `${GOOGLE_EVENTS_URL}/${encodeURIComponent(conn.calendar_id)}/events`
  const res = await fetch(url, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({
      summary,
      description: input.notes || '',
      start: { dateTime: start.toISOString(), timeZone: APP_TZ },
      end:   { dateTime: end.toISOString(),   timeZone: APP_TZ },
      attendees: [{ email: input.patientEmail, displayName: input.patientName }],
      reminders: { useDefault: true },
      source: { title: 'Fitkis', url: 'https://fitkis.com' },
    }),
  })

  if (!res.ok) {
    // 401/403 suelen indicar token revocado o scope insuficiente
    if (res.status === 401 || res.status === 403) await markConnectionDegraded(conn.id)
    return null
  }

  const data = await res.json()
  if (!data?.id) return null

  return {
    google_event_id:               data.id,
    google_calendar_connection_id: conn.id,
  }
}

export type UpdateEventInput = {
  connectionId:     string
  eventId:          string
  startISO?:        string
  durationMinutes?: number
  notes?:           string | null
}

async function getConnectionById(connectionId: string): Promise<WriteConnection | null> {
  const { data } = await service()
    .from('practitioner_calendar_connections')
    .select('id, access_token, refresh_token, token_expiry, calendar_id')
    .eq('id', connectionId)
    .maybeSingle()
  return (data as WriteConnection | null) ?? null
}

export async function updateCalendarEvent(input: UpdateEventInput): Promise<boolean> {
  if (!writeEnabled()) return false
  const conn = await getConnectionById(input.connectionId)
  if (!conn) return false
  const token = await ensureFreshToken(conn)
  if (!token) return false

  const body: Record<string, unknown> = {}
  if (input.startISO && input.durationMinutes) {
    const start = new Date(input.startISO)
    const end   = new Date(start.getTime() + input.durationMinutes * 60_000)
    body.start = { dateTime: start.toISOString(), timeZone: APP_TZ }
    body.end   = { dateTime: end.toISOString(),   timeZone: APP_TZ }
  }
  if (input.notes !== undefined) body.description = input.notes || ''

  if (Object.keys(body).length === 0) return true

  const url = `${GOOGLE_EVENTS_URL}/${encodeURIComponent(conn.calendar_id)}/events/${encodeURIComponent(input.eventId)}`
  const res = await fetch(url, {
    method:  'PATCH',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(body),
  })

  if (!res.ok) {
    if (res.status === 401 || res.status === 403) await markConnectionDegraded(conn.id)
    return false
  }
  return true
}

export async function deleteCalendarEvent(connectionId: string, eventId: string): Promise<boolean> {
  if (!writeEnabled()) return false
  const conn = await getConnectionById(connectionId)
  if (!conn) return false
  const token = await ensureFreshToken(conn)
  if (!token) return false

  const url = `${GOOGLE_EVENTS_URL}/${encodeURIComponent(conn.calendar_id)}/events/${encodeURIComponent(eventId)}`
  const res = await fetch(url, {
    method:  'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  })

  // 410 Gone = ya borrado; lo tratamos como éxito
  if (!res.ok && res.status !== 410) {
    if (res.status === 401 || res.status === 403) await markConnectionDegraded(conn.id)
    return false
  }
  return true
}

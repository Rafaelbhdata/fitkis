import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import {
  DEFAULT_WEEK_SCHEDULE, dateToDayKey, minToTime, generateSlots, intervalsOverlap,
  type WeekSchedule,
} from '@/lib/clinic/calendar-utils'
import { formatDateISOInTimezone, getHourMinuteInTimezone } from '@/lib/utils'
import { getBusyBlocks } from '@/lib/clinic/google-calendar'
import { createCalendarEvent, deleteCalendarEvent } from '@/lib/clinic/google-calendar-write'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: Request) {
  const body = await req.json()
  const {
    practitioner_id,
    patient_name,
    patient_email,
    starts_at,
    notes,
    reschedule_id,
  } = body as {
    practitioner_id: string
    patient_name:    string
    patient_email:   string
    starts_at:       string
    notes?:          string
    reschedule_id?:  string
  }

  if (!practitioner_id || !patient_name || !patient_email || !starts_at) {
    return NextResponse.json({ error: 'Faltan campos requeridos.' }, { status: 400 })
  }

  // Public endpoint — patients book without auth. Validate inputs to
  // prevent abuse (oversized payloads, malformed email, dates outside a
  // reasonable booking window).
  if (typeof patient_name !== 'string' || patient_name.length > 100) {
    return NextResponse.json({ error: 'Nombre inválido.' }, { status: 400 })
  }
  if (typeof patient_email !== 'string' || patient_email.length > 255 ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(patient_email)) {
    return NextResponse.json({ error: 'Email inválido.' }, { status: 400 })
  }
  if (notes !== undefined && (typeof notes !== 'string' || notes.length > 1000)) {
    return NextResponse.json({ error: 'Notas demasiado largas.' }, { status: 400 })
  }
  const startMs = new Date(starts_at).getTime()
  if (!Number.isFinite(startMs)) {
    return NextResponse.json({ error: 'Fecha inválida.' }, { status: 400 })
  }
  const now = Date.now()
  const ninetyDaysMs = 90 * 24 * 60 * 60 * 1000
  if (startMs < now - 60_000 || startMs > now + ninetyDaysMs) {
    return NextResponse.json({ error: 'Fecha fuera de rango.' }, { status: 400 })
  }

  // Leer practitioner: duración fija + horario
  const { data: prac } = await supabaseAdmin
    .from('practitioners')
    .select('id, default_duration, schedule')
    .eq('id', practitioner_id)
    .eq('active', true)
    .maybeSingle()

  if (!prac) {
    return NextResponse.json({ error: 'Nutriólogo no encontrado.' }, { status: 404 })
  }

  const duration_minutes: number = (prac.default_duration as number) ?? 60
  const weekSchedule: WeekSchedule = (prac.schedule as WeekSchedule) ?? DEFAULT_WEEK_SCHEDULE

  // Validar que el slot cae dentro del horario del día (todo en CDMX).
  const startDt  = new Date(starts_at)
  const dateISO  = formatDateISOInTimezone(startDt)
  const dayKey   = dateToDayKey(startDt)
  const daySchedule = weekSchedule[dayKey]

  if (!daySchedule.enabled) {
    return NextResponse.json({ error: 'El nutriólogo no atiende ese día.' }, { status: 400 })
  }

  const { hour, minute } = getHourMinuteInTimezone(startDt)
  const validSlots = generateSlots(dateISO, duration_minutes, daySchedule)
  const slotLocal  = `${dateISO}T${minToTime(hour * 60 + minute)}:00`
  const isValidSlot = validSlots.includes(slotLocal)

  if (!isValidSlot) {
    return NextResponse.json({ error: 'El horario seleccionado no está disponible.' }, { status: 400 })
  }

  const endDt       = new Date(startDt.getTime() + duration_minutes * 60_000)
  const windowStart = new Date(startDt.getTime() - duration_minutes * 60_000)

  const [busyBlocks, { data: conflicts }] = await Promise.all([
    getBusyBlocks(practitioner_id, dateISO),
    supabaseAdmin
      .from('appointments')
      .select('id')
      .eq('practitioner_id', practitioner_id)
      .not('status', 'in', '("cancelled","no_show")')
      .lt('starts_at', endDt.toISOString())
      .gt('starts_at', windowStart.toISOString())
      .limit(1),
  ])

  const sMs = startDt.getTime(), eMs = endDt.getTime()
  const calConflict = busyBlocks.some(b =>
    intervalsOverlap(sMs, eMs, new Date(b.start).getTime(), new Date(b.end).getTime())
  )

  if (calConflict || (conflicts && conflicts.length > 0)) {
    return NextResponse.json({ error: 'Este horario ya está ocupado.' }, { status: 409 })
  }

  const { data, error } = await supabaseAdmin
    .from('appointments')
    .insert({ practitioner_id, patient_name, patient_email, starts_at, duration_minutes, notes })
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  if (reschedule_id) {
    // Si la cita vieja tenía evento en Google, borrarlo (fire-and-forget).
    const { data: old } = await supabaseAdmin
      .from('appointments')
      .select('google_event_id, google_calendar_connection_id')
      .eq('id', reschedule_id)
      .maybeSingle()
    const oldEvt = old as { google_event_id?: string; google_calendar_connection_id?: string } | null
    if (oldEvt?.google_event_id && oldEvt.google_calendar_connection_id) {
      deleteCalendarEvent(oldEvt.google_calendar_connection_id, oldEvt.google_event_id)
        .catch((e) => console.error('book-appointment: delete old event', e))
    }

    await supabaseAdmin
      .from('appointments')
      .update({ status: 'cancelled' } as never)
      .eq('id', reschedule_id)
  }

  // Crear evento en Google Calendar de la cuenta write target. No bloquea
  // el booking: si falla (flag off, sin write target, token revocado),
  // logueamos y seguimos. Cuando se conecta más tarde, la cita ya no se
  // sincroniza retroactivamente — eso es deliberado para evitar sorpresas.
  createCalendarEvent({
    practitionerId:  practitioner_id,
    startISO:        starts_at,
    durationMinutes: duration_minutes,
    patientName:     patient_name,
    patientEmail:    patient_email,
    notes,
  })
    .then(async (evt) => {
      if (!evt) return
      const { error: upErr } = await supabaseAdmin
        .from('appointments')
        .update(evt as never)
        .eq('id', (data as { id: string }).id)
      if (upErr) console.error('book-appointment: persist event id', upErr)
    })
    .catch((e) => console.error('book-appointment: create event', e))

  return NextResponse.json({ appointment: data })
}

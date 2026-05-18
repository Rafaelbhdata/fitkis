import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { Resend } from 'resend'
import {
  DEFAULT_WEEK_SCHEDULE, dateToDayKey, minToTime, generateSlots, intervalsOverlap,
  type WeekSchedule,
} from '@/lib/clinic/calendar-utils'
import { formatDateISOInTimezone, getHourMinuteInTimezone } from '@/lib/utils'
import { getBusyBlocks } from '@/lib/clinic/google-calendar'
import { createCalendarEvent, deleteCalendarEvent } from '@/lib/clinic/google-calendar-write'
import { emailShell } from '@/lib/email-templates'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null

const MONTHS_ES = [
  'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
]
const APP_TZ = 'America/Mexico_City'

function formatDateForEmail(iso: string): string {
  const d = new Date(iso)
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: APP_TZ,
    month: '2-digit', day: '2-digit',
    hour:  '2-digit', minute: '2-digit', hour12: false,
  }).formatToParts(d)
  const get = (t: string) => parts.find(p => p.type === t)?.value ?? ''
  const day  = Number(get('day'))
  const mon  = Number(get('month')) - 1
  const time = `${get('hour')}:${get('minute')}`
  return `${day} de ${MONTHS_ES[mon]} a las ${time}`
}

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

  // Leer practitioner: duración fija + horario + nombre para email
  const { data: prac } = await supabaseAdmin
    .from('practitioners')
    .select('id, default_duration, schedule, display_name, clinic_name')
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

  // Email de confirmación con marca Fitkis (desde info@fitkis.com).
  // Sin esto, el paciente no recibiría nada — Google no manda invitación
  // automática porque pasamos sendUpdates=none al crear el evento.
  if (resend) {
    const pracName   = (prac as { display_name?: string }).display_name ?? 'tu nutrióloga'
    const pracClinic = (prac as { clinic_name?: string }).clinic_name ?? null
    const firstName  = patient_name.split(' ')[0]
    const dateLabel  = formatDateForEmail(starts_at)

    resend.emails.send({
      from:    'Fitkis <info@fitkis.com>',
      to:      patient_email,
      subject: `Cita confirmada con ${pracName} · ${dateLabel}`,
      html:    bookingConfirmationHtml({ firstName, pracName, pracClinic, dateLabel, durationMin: duration_minutes, notes }),
    }).catch((e) => console.error('book-appointment: send confirmation email', e))
  }

  return NextResponse.json({ appointment: data })
}

function bookingConfirmationHtml({
  firstName, pracName, pracClinic, dateLabel, durationMin, notes,
}: {
  firstName:   string
  pracName:    string
  pracClinic:  string | null
  dateLabel:   string
  durationMin: number
  notes?:      string
}): string {
  const fromLine = pracClinic ? `${pracName} · ${pracClinic}` : pracName

  const inner = `
  <table width="100%" cellpadding="0" cellspacing="0">
    <tr>
      <td style="padding:40px 40px 36px;">

        <p style="margin:0 0 10px;font-family:Arial,monospace;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.12em;color:#ff5a1f;">
          Cita confirmada · Fitkis
        </p>

        <h1 style="margin:0 0 20px;font-family:Georgia,'Times New Roman',serif;font-size:34px;font-weight:300;line-height:1.1;letter-spacing:-0.02em;color:#0a0a0a;">
          Hola, <em>${firstName}</em>.<br/>
          Tu cita está lista.
        </h1>

        <p style="margin:0 0 24px;font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.6;color:#404040;">
          Confirmamos tu consulta con <strong>${fromLine}</strong>.
        </p>

        <table cellpadding="0" cellspacing="0" style="margin:0 0 24px;border:1px solid #e5e3db;border-radius:12px;background:#fafaf7;">
          <tr>
            <td style="padding:18px 22px;">
              <p style="margin:0 0 4px;font-family:Arial,monospace;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.1em;color:#a3a3a3;">
                Fecha
              </p>
              <p style="margin:0 0 14px;font-family:Georgia,'Times New Roman',serif;font-size:18px;color:#0a0a0a;">
                ${dateLabel} hrs
              </p>
              <p style="margin:0 0 4px;font-family:Arial,monospace;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.1em;color:#a3a3a3;">
                Duración
              </p>
              <p style="margin:0;font-family:Georgia,'Times New Roman',serif;font-size:18px;color:#0a0a0a;">
                ${durationMin} minutos
              </p>
              ${notes ? `
              <p style="margin:14px 0 4px;font-family:Arial,monospace;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.1em;color:#a3a3a3;">
                Tus notas
              </p>
              <p style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#404040;line-height:1.5;">
                ${notes.replace(/</g, '&lt;')}
              </p>` : ''}
            </td>
          </tr>
        </table>

        <p style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:13px;line-height:1.6;color:#737373;">
          Si necesitas cambiar o cancelar, escribe directamente a tu nutrióloga.
        </p>

      </td>
    </tr>
  </table>`

  return emailShell({
    previewText: `Cita confirmada con ${pracName} · ${dateLabel}`,
    title:       `Cita confirmada · Fitkis`,
    innerHtml:   inner,
    footerNote:  `Enviado por <strong>Fitkis</strong> en nombre de ${fromLine}.<br/>Hora local: México (CDMX).`,
  })
}

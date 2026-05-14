import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import {
  DEFAULT_WEEK_SCHEDULE, dateToDayKey, minToTime, generateSlots, intervalsOverlap,
  type WeekSchedule,
} from '@/lib/clinic/calendar-utils'
import { formatDateISOInTimezone, getHourMinuteInTimezone } from '@/lib/utils'
import { getBusyBlocks } from '@/lib/clinic/google-calendar'

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
    await supabaseAdmin
      .from('appointments')
      .update({ status: 'cancelled' } as never)
      .eq('id', reschedule_id)
  }

  return NextResponse.json({ appointment: data })
}

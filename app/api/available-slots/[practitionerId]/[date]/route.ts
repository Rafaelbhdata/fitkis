import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { DEFAULT_WEEK_SCHEDULE, dateToDayKey } from '@/lib/clinic/calendar-utils'
import type { WeekSchedule, DaySchedule } from '@/lib/clinic/calendar-utils'

/**
 * GET /api/available-slots/[practitionerId]/[date]
 *
 * Devuelve:
 *  - `occupied`: slots ya reservados (starts_at + duration_minutes)
 *  - `schedule`: configuración del horario para ese día de la semana
 *  - `default_duration`: duración fija de citas del practitioner
 *
 * No requiere sesión — usado desde la página pública de reservas.
 */
export async function GET(
  _req: Request,
  { params }: { params: { practitionerId: string; date: string } }
) {
  const cookieStore = cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: () => {},
      },
    }
  )

  const { practitionerId, date } = params
  const dayStart = `${date}T00:00:00`
  const dayEnd   = `${date}T23:59:59`

  const [{ data: slots, error: slotsErr }, { data: prac, error: pracErr }] = await Promise.all([
    supabase
      .from('appointment_slots')
      .select('starts_at, duration_minutes')
      .eq('practitioner_id', practitionerId)
      .gte('starts_at', dayStart)
      .lte('starts_at', dayEnd),
    supabase
      .from('practitioners')
      .select('schedule, default_duration')
      .eq('id', practitionerId)
      .eq('active', true)
      .maybeSingle(),
  ])

  if (slotsErr) {
    return NextResponse.json({ error: slotsErr.message }, { status: 500 })
  }
  if (pracErr || !prac) {
    return NextResponse.json({ error: 'Nutriólogo no encontrado.' }, { status: 404 })
  }

  const weekSchedule: WeekSchedule = (prac.schedule as WeekSchedule) ?? DEFAULT_WEEK_SCHEDULE
  const dayKey  = dateToDayKey(new Date(date + 'T00:00:00'))
  const daySchedule: DaySchedule = weekSchedule[dayKey]

  return NextResponse.json({
    occupied:         slots ?? [],
    schedule:         daySchedule,
    default_duration: (prac.default_duration as number) ?? 60,
  })
}

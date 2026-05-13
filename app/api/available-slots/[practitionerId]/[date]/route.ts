import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { getBusyBlocks } from '@/lib/clinic/google-calendar'

/**
 * GET /api/available-slots/[practitionerId]/[date]
 *
 * Devuelve los slots ya reservados del día, incluyendo bloques del calendario
 * externo (Google Calendar) si el practitioner tiene uno conectado.
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

  const [slotsResult, calendarBusy] = await Promise.all([
    supabase
      .from('appointment_slots')
      .select('starts_at, duration_minutes')
      .eq('practitioner_id', practitionerId)
      .gte('starts_at', `${date}T00:00:00`)
      .lte('starts_at', `${date}T23:59:59`),
    getBusyBlocks(practitionerId, date),
  ])

  if (slotsResult.error) {
    return NextResponse.json({ error: slotsResult.error.message }, { status: 500 })
  }

  // Convertir bloques de Google Calendar al mismo shape que appointment_slots
  const calendarOccupied = calendarBusy.map(block => {
    const startMs = new Date(block.start).getTime()
    const endMs   = new Date(block.end).getTime()
    return {
      starts_at:        block.start,
      duration_minutes: Math.round((endMs - startMs) / 60_000),
    }
  })

  const occupied = [...(slotsResult.data ?? []), ...calendarOccupied]

  return NextResponse.json({ occupied })
}

import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

/**
 * GET /api/available-slots/[practitionerId]/[date]
 *
 * Devuelve los slots ya reservados del día. El cliente deriva el horario del
 * día a partir del schedule que ya cargó con el practitioner al inicio.
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

  const { data, error } = await supabase
    .from('appointment_slots')
    .select('starts_at, duration_minutes')
    .eq('practitioner_id', practitionerId)
    .gte('starts_at', `${date}T00:00:00`)
    .lte('starts_at', `${date}T23:59:59`)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ occupied: data ?? [] })
}

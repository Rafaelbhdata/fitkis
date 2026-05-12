import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

/**
 * GET /api/available-slots/[practitionerId]/[date]
 *
 * Devuelve los slots ocupados del día (starts_at + duration_minutes) para un
 * practitioner. Consulta la vista `appointment_slots` que no expone datos personales.
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
  const dayEnd = `${date}T23:59:59`

  const { data, error } = await supabase
    .from('appointment_slots')
    .select('starts_at, duration_minutes')
    .eq('practitioner_id', practitionerId)
    .gte('starts_at', dayStart)
    .lte('starts_at', dayEnd)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data ?? [])
}

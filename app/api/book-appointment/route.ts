import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

/**
 * POST /api/book-appointment
 *
 * Reserva una cita sin sesión de usuario (página pública).
 * Usa service role para poder hacer INSERT ignorando RLS.
 *
 * Nota sobre detección de conflictos: la lógica actual detecta citas
 * que empiezan dentro de la ventana de la nueva. Citas que empiezan
 * antes pero terminan adentro pueden no detectarse si la duración varía.
 * Aceptable con la duración por defecto de 50 min.
 */

// Uso de service role para inserción sin sesión de usuario
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
    duration_minutes = 50,
    notes,
  } = body as {
    practitioner_id: string
    patient_name: string
    patient_email: string
    starts_at: string
    duration_minutes?: number
    notes?: string
  }

  if (!practitioner_id || !patient_name || !patient_email || !starts_at) {
    return NextResponse.json({ error: 'Faltan campos requeridos.' }, { status: 400 })
  }

  // Verificar practitioner activo
  const { data: prac } = await supabaseAdmin
    .from('practitioners')
    .select('id')
    .eq('id', practitioner_id)
    .eq('active', true)
    .maybeSingle()

  if (!prac) {
    return NextResponse.json({ error: 'Nutriólogo no encontrado.' }, { status: 404 })
  }

  // Verificar conflicto de horario
  const startDt = new Date(starts_at)
  const endDt = new Date(startDt.getTime() + duration_minutes * 60_000)

  const { data: conflicts } = await supabaseAdmin
    .from('appointments')
    .select('id')
    .eq('practitioner_id', practitioner_id)
    .not('status', 'in', '("cancelled","no_show")')
    .lt('starts_at', endDt.toISOString())
    .gt('starts_at', new Date(startDt.getTime() - duration_minutes * 60_000).toISOString())
    .limit(1)

  if (conflicts && conflicts.length > 0) {
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

  return NextResponse.json({ appointment: data })
}

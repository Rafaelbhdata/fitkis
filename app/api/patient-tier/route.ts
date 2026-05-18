import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { getAuthedUser } from '@/lib/api-auth'

// Actualiza el tier (light|pro) de un paciente. La nutrióloga solo puede
// modificar pacientes con relación activa. Usa service role porque la
// policy de UPDATE en user_profiles está limitada al propio usuario.
const adminSupabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
)

export async function POST(request: Request) {
  const { user, supabase } = await getAuthedUser(request)
  if (!user || !supabase) {
    return NextResponse.json({ error: 'No autenticado.' }, { status: 401 })
  }

  const { data: prac } = await supabase
    .from('practitioners')
    .select('id')
    .eq('user_id', user.id)
    .eq('active', true)
    .maybeSingle()
  if (!prac) {
    return NextResponse.json({ error: 'No autorizado.' }, { status: 403 })
  }

  const body = await request.json().catch(() => null)
  const { patient_id, tier } = body ?? {}

  if (!patient_id) {
    return NextResponse.json({ error: 'Falta patient_id.' }, { status: 400 })
  }
  if (tier !== 'lite' && tier !== 'pro') {
    return NextResponse.json({ error: 'Tier inválido.' }, { status: 400 })
  }

  const { data: rel } = await supabase
    .from('practitioner_patients')
    .select('id')
    .eq('practitioner_id', prac.id)
    .eq('patient_id', patient_id)
    .maybeSingle()
  if (!rel) {
    return NextResponse.json({ error: 'Paciente no encontrado.' }, { status: 404 })
  }

  const { error } = await adminSupabase
    .from('user_profiles')
    .update({ tier })
    .eq('user_id', patient_id)

  if (error) {
    console.error('patient-tier update error:', error)
    return NextResponse.json({ error: 'Error al guardar.' }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}

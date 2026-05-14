import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { getAuthedUser } from '@/lib/api-auth'

const adminSupabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
)

export async function POST(request: Request) {
  const { user, supabase } = await getAuthedUser(request)
  if (!user || !supabase) {
    return NextResponse.json({ error: 'No autenticado.' }, { status: 401 })
  }

  // Verificar que el caller es practitioner activo
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
  const { patient_id, goal_type, goal_weight_kg, goal_body_fat_pct, goal_muscle_kg } = body ?? {}

  if (!patient_id) {
    return NextResponse.json({ error: 'Falta patient_id.' }, { status: 400 })
  }

  // Verificar que el paciente pertenece a este practitioner
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
    .update({
      goal_type:         goal_type         ?? null,
      goal_weight_kg:    goal_weight_kg    ?? null,
      goal_body_fat_pct: goal_body_fat_pct ?? null,
      goal_muscle_kg:    goal_muscle_kg    ?? null,
    })
    .eq('user_id', patient_id)

  if (error) {
    console.error('patient-goals update error:', error)
    return NextResponse.json({ error: 'Error al guardar.' }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}

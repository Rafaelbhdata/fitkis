// app/api/remove-patient-relation/route.ts
//
// DELETE { practitioner_id, patient_id }
//
// Elimina definitivamente la relación practitioner–paciente.
// Solo aplica a relaciones declined (status='inactive' + accepted_at IS NULL).
// Pacientes activos deben desvincularse desde la app del paciente.
//
// Requiere que el caller sea el practitioner autenticado.

import { NextResponse } from 'next/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { getAuthedUser } from '@/lib/api-auth'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!

export async function DELETE(request: Request) {
  const { user, supabase } = await getAuthedUser(request)
  if (!user || !supabase) {
    return NextResponse.json({ error: 'No autenticado.' }, { status: 401 })
  }

  let practitionerId: string
  let patientId: string
  try {
    const body = await request.json()
    practitionerId = body.practitioner_id ?? ''
    patientId = body.patient_id ?? ''
  } catch {
    return NextResponse.json({ error: 'Body inválido.' }, { status: 400 })
  }

  if (!practitionerId || !patientId) {
    return NextResponse.json({ error: 'practitioner_id y patient_id son requeridos.' }, { status: 400 })
  }

  // Verificar que el caller es el practitioner indicado
  const { data: prac } = await supabase
    .from('practitioners')
    .select('id')
    .eq('user_id', user.id)
    .eq('id', practitionerId)
    .eq('active', true)
    .maybeSingle()

  if (!prac) {
    return NextResponse.json({ error: 'No autorizado.' }, { status: 403 })
  }

  const admin = createAdminClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  // Verificar que la relación es declined (inactive + never accepted) antes de eliminar
  const { data: rel, error: fetchErr } = await admin
    .from('practitioner_patients')
    .select('id, status, accepted_at')
    .eq('practitioner_id', practitionerId)
    .eq('patient_id', patientId)
    .maybeSingle()

  if (fetchErr || !rel) {
    return NextResponse.json({ error: 'Relación no encontrada.' }, { status: 404 })
  }
  if (rel.status === 'active') {
    return NextResponse.json(
      { error: 'No se puede eliminar un paciente activo. El paciente debe desvincularse desde la app.' },
      { status: 409 },
    )
  }

  const { error: delErr } = await admin
    .from('practitioner_patients')
    .delete()
    .eq('id', rel.id)

  if (delErr) {
    console.error('remove-patient-relation: delete error', delErr)
    return NextResponse.json({ error: 'Error al eliminar la relación.' }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}

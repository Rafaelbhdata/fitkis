// app/api/resend-invitation/route.ts
//
// POST { practitioner_id, patient_id }
//
// Reactiva una invitación rechazada: actualiza la fila practitioner_patients
// de status='inactive' a status='pending' con nuevo invited_at, luego envía
// push notification al paciente.
//
// Solo aplica a relaciones donde el paciente nunca aceptó (accepted_at IS NULL).
// Requiere que el caller sea el practitioner autenticado.

import { NextResponse } from 'next/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { getAuthedUser } from '@/lib/api-auth'
import { sendPushToUser } from '@/lib/push'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!

export async function POST(request: Request) {
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
    .select('id, display_name, clinic_name')
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

  // Verificar que existe la relación y que el paciente nunca aceptó (declined)
  const { data: rel, error: fetchErr } = await admin
    .from('practitioner_patients')
    .select('id, status, accepted_at')
    .eq('practitioner_id', practitionerId)
    .eq('patient_id', patientId)
    .maybeSingle()

  if (fetchErr || !rel) {
    return NextResponse.json({ error: 'Relación no encontrada.' }, { status: 404 })
  }
  if (rel.status !== 'inactive' || rel.accepted_at !== null) {
    return NextResponse.json(
      { error: `La invitación no puede reenviarse (estado actual: ${rel.status}).` },
      { status: 409 },
    )
  }

  // Actualizar a pending
  const { error: updErr } = await admin
    .from('practitioner_patients')
    .update({ status: 'pending', invited_at: new Date().toISOString() })
    .eq('id', rel.id)

  if (updErr) {
    console.error('resend-invitation: update error', updErr)
    return NextResponse.json({ error: 'Error al reenviar la invitación.' }, { status: 500 })
  }

  // Push notification (fire-and-forget)
  const pracName   = (prac as { display_name?: string }).display_name ?? 'Tu nutrióloga'
  const pracClinic = (prac as { clinic_name?: string }).clinic_name ?? null
  ;(async () => {
    await sendPushToUser(patientId, {
      title: 'Nueva invitación de Fitkis',
      body: pracClinic
        ? `${pracName} de ${pracClinic} te volvió a invitar.`
        : `${pracName} te volvió a invitar.`,
      data: { type: 'invitation' },
    })
  })().catch((err) => console.error('resend-invitation: push failed', err))

  return NextResponse.json({ ok: true })
}

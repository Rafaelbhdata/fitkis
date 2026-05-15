import { NextResponse } from 'next/server'
import { getAuthedPractitioner } from '@/lib/api-auth'
import { sendPushToUser } from '@/lib/push'

export async function POST(request: Request) {
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

  const auth = await getAuthedPractitioner(request, practitionerId)
  if (!auth) return NextResponse.json({ error: 'No autorizado.' }, { status: 403 })
  const { prac, admin } = auth

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

  const { error: updErr } = await admin
    .from('practitioner_patients')
    .update({ status: 'pending', invited_at: new Date().toISOString() })
    .eq('id', rel.id)

  if (updErr) {
    console.error('resend-invitation: update error', updErr)
    return NextResponse.json({ error: 'Error al reenviar la invitación.' }, { status: 500 })
  }

  const pracName   = prac.display_name   ?? 'Tu nutrióloga'
  const pracClinic = prac.clinic_name    ?? null
  sendPushToUser(patientId, {
    title: 'Nueva invitación de Fitkis',
    body: pracClinic
      ? `${pracName} de ${pracClinic} te volvió a invitar.`
      : `${pracName} te volvió a invitar.`,
    data: { type: 'invitation' },
  }).catch((err) => console.error('resend-invitation: push failed', err))

  return NextResponse.json({ ok: true })
}

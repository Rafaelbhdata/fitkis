import { NextResponse } from 'next/server'
import { getAuthedPractitioner } from '@/lib/api-auth'

export async function DELETE(request: Request) {
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
  const { admin } = auth

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

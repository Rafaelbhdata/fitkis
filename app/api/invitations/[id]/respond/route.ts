// app/api/invitations/[id]/respond/route.ts
//
// POST /api/invitations/:id/respond
// Body: { action: 'accept' | 'decline' }
//
// El paciente responde a una invitación. La RLS de mig 009 línea 154-155
// "Patients can accept invitations" permite UPDATE cuando auth.uid() =
// patient_id, así que esto se podría hacer con un UPDATE directo desde
// mobile — pero pasamos por la API para:
//   1. Validar la transición (solo pending → active/inactive)
//   2. Bloquear accept si ya hay una activa (regla del producto: máx 1
//      relación activa por paciente)
//   3. Set accepted_at en accept para auditoría
//
// Transiciones permitidas:
//   - pending → active   (accept)
//   - pending → inactive (decline)

import { NextResponse } from 'next/server'
import { getAuthedUser } from '@/lib/api-auth'

type Action = 'accept' | 'decline'

export async function POST(
  request: Request,
  { params }: { params: { id: string } },
) {
  const { user, supabase } = await getAuthedUser(request)
  if (!user || !supabase) {
    return NextResponse.json({ error: 'No autenticado.' }, { status: 401 })
  }

  let action: Action
  try {
    const body = await request.json()
    action = body?.action
    if (action !== 'accept' && action !== 'decline') {
      return NextResponse.json({ error: 'action debe ser accept o decline.' }, { status: 400 })
    }
  } catch {
    return NextResponse.json({ error: 'Body inválido.' }, { status: 400 })
  }

  const invitationId = params.id
  if (!invitationId) {
    return NextResponse.json({ error: 'id requerido.' }, { status: 400 })
  }

  // Validar que la invitación existe, pertenece al user y está pending.
  // RLS ya filtra por patient_id pero verificamos explícito para
  // diferenciar 404 (no existe) de 409 (estado inválido).
  const { data: invite, error: fetchErr } = await supabase
    .from('practitioner_patients')
    .select('id, status, patient_id, practitioner_id')
    .eq('id', invitationId)
    .maybeSingle()

  if (fetchErr) {
    console.error('respond fetch error:', fetchErr)
    return NextResponse.json({ error: 'Error consultando invitación.' }, { status: 500 })
  }
  if (!invite || invite.patient_id !== user.id) {
    return NextResponse.json({ error: 'Invitación no encontrada.' }, { status: 404 })
  }
  if (invite.status !== 'pending') {
    return NextResponse.json(
      { error: `Esta invitación ya está ${invite.status === 'active' ? 'aceptada' : 'inactiva'}.` },
      { status: 409 },
    )
  }

  if (action === 'accept') {
    // Bloquear si ya tiene una activa. El usuario debe desvincularse de
    // la actual antes de aceptar otra (decisión de producto: 1 activa).
    const { data: existingActive } = await supabase
      .from('practitioner_patients')
      .select('id')
      .eq('patient_id', user.id)
      .eq('status', 'active')
      .maybeSingle()

    if (existingActive) {
      return NextResponse.json(
        {
          error: 'Ya tienes una nutrióloga vinculada. Desvincúlate primero para aceptar otra.',
          code: 'already_active',
        },
        { status: 409 },
      )
    }

    const { error: updErr } = await supabase
      .from('practitioner_patients')
      .update({ status: 'active', accepted_at: new Date().toISOString() })
      .eq('id', invitationId)

    if (updErr) {
      console.error('accept update error:', updErr)
      return NextResponse.json({ error: 'Error al aceptar.' }, { status: 500 })
    }
    return NextResponse.json({ ok: true, status: 'active' })
  }

  // decline → inactive
  const { error: declineErr } = await supabase
    .from('practitioner_patients')
    .update({ status: 'inactive' })
    .eq('id', invitationId)

  if (declineErr) {
    console.error('decline update error:', declineErr)
    return NextResponse.json({ error: 'Error al rechazar.' }, { status: 500 })
  }
  return NextResponse.json({ ok: true, status: 'inactive' })
}

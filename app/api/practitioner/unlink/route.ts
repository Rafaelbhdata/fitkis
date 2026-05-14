// app/api/practitioner/unlink/route.ts
//
// POST /api/practitioner/unlink
//
// El paciente se desvincula de su nutrióloga activa. Transición:
//   active → inactive
//
// No borramos la fila: la nutrióloga sigue viendo en su lista al paciente
// como "inactivo" para que tenga registro de la relación. Si quiere
// reactivar, debe mandar una nueva invitación (que insertaría una fila
// nueva con status='pending' — el UNIQUE constraint en (practitioner_id,
// patient_id) bloquea esto, así que requeriría primero DELETE de la
// inactiva o borrar el constraint).

import { NextResponse } from 'next/server'
import { getAuthedUser } from '@/lib/api-auth'

export async function POST(request: Request) {
  const { user, supabase } = await getAuthedUser(request)
  if (!user || !supabase) {
    return NextResponse.json({ error: 'No autenticado.' }, { status: 401 })
  }

  // Buscar la relación activa del paciente. La RLS ya restringe a
  // patient_id = auth.uid().
  const { data: active, error: fetchErr } = await supabase
    .from('practitioner_patients')
    .select('id, practitioner_id')
    .eq('patient_id', user.id)
    .eq('status', 'active')
    .maybeSingle()

  if (fetchErr) {
    console.error('unlink fetch error:', fetchErr)
    return NextResponse.json({ error: 'Error consultando relación.' }, { status: 500 })
  }
  if (!active) {
    return NextResponse.json({ error: 'No tienes una nutrióloga activa.' }, { status: 404 })
  }

  const { error: updErr } = await supabase
    .from('practitioner_patients')
    .update({ status: 'inactive' })
    .eq('id', active.id)

  if (updErr) {
    console.error('unlink update error:', updErr)
    return NextResponse.json({ error: 'Error al desvincular.' }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}

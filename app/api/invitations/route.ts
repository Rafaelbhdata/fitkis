// app/api/invitations/route.ts
//
// GET /api/invitations
//
// Lista las invitaciones pendientes del paciente autenticado. La mobile
// app llama esto al focus del dashboard para mostrar la bandeja de
// invitaciones (paciente puede tener N pending de distintas nutriólogas).
//
// Una vez aceptada una (status=active), las demás pending se quedan ahí
// para que la nutrióloga las pueda cancelar. La UI mobile bloquea la
// aceptación de nuevas mientras haya una activa.
//
// RLS:
//   - practitioner_patients: "Patients can view their practitioner relationships"
//     (auth.uid() = patient_id) — mig 009 line 130
//   - practitioners: "Public can view active practitioners" (active = true)
//     — mig 032

import { NextResponse } from 'next/server'
import { getAuthedUser } from '@/lib/api-auth'

export async function GET(request: Request) {
  const { user, supabase } = await getAuthedUser(request)
  if (!user || !supabase) {
    return NextResponse.json({ error: 'No autenticado.' }, { status: 401 })
  }

  const { data, error } = await supabase
    .from('practitioner_patients')
    .select(`
      id,
      status,
      invited_at,
      practitioner_id,
      practitioners (
        id,
        display_name,
        clinic_name,
        specialty,
        address
      )
    `)
    .eq('patient_id', user.id)
    .eq('status', 'pending')
    .order('invited_at', { ascending: false })

  if (error) {
    console.error('GET /api/invitations error:', error)
    return NextResponse.json({ error: 'Error consultando invitaciones.' }, { status: 500 })
  }

  // También devolvemos si ya hay una relación activa, para que mobile
  // decida si bloquea el botón "Aceptar" en las pending.
  const { data: activeRow } = await supabase
    .from('practitioner_patients')
    .select(`
      id,
      practitioners (
        id,
        display_name,
        clinic_name
      )
    `)
    .eq('patient_id', user.id)
    .eq('status', 'active')
    .maybeSingle()

  return NextResponse.json({
    invitations: data ?? [],
    active: activeRow ?? null,
  })
}

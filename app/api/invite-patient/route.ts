// app/api/invite-patient/route.ts
//
// POST { email, practitioner_id }
//
// Vincula un paciente a una nutrióloga.
// - Si el email ya existe en auth.users → inserta practitioner_patients (pending).
// - Si no existe → crea la cuenta vía admin invite (Supabase envía magic link)
//   y luego inserta practitioner_patients con el nuevo user_id.
//
// Requiere que el caller esté autenticado como una nutrióloga activa.

import { createClient as createAdminClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { getAuthedUser } from '@/lib/api-auth'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!

export async function POST(request: Request) {
  const { user, supabase } = await getAuthedUser(request)
  if (!user || !supabase) {
    return NextResponse.json({ error: 'No autenticado.' }, { status: 401 })
  }

  // Verificar que el caller es una nutrióloga activa
  const { data: prac } = await supabase
    .from('practitioners')
    .select('id')
    .eq('user_id', user.id)
    .eq('active', true)
    .maybeSingle()
  if (!prac) {
    return NextResponse.json({ error: 'No autorizado.' }, { status: 403 })
  }

  let email: string
  let practitionerId: string
  try {
    const body = await request.json()
    email = (body.email ?? '').trim().toLowerCase()
    practitionerId = body.practitioner_id ?? ''
  } catch {
    return NextResponse.json({ error: 'Body inválido.' }, { status: 400 })
  }

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: 'Email inválido.' }, { status: 400 })
  }
  if (!practitionerId) {
    return NextResponse.json({ error: 'practitioner_id requerido.' }, { status: 400 })
  }
  // Confirmar que el practitioner_id corresponde al caller
  if (prac.id !== practitionerId) {
    return NextResponse.json({ error: 'No autorizado.' }, { status: 403 })
  }

  const admin = createAdminClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  // ── Buscar si el usuario ya existe ──────────────────────────────────────────
  const { data: usersRaw } = await supabase
    .rpc('get_user_by_email' as never, { email_input: email } as never)
  const users = (usersRaw ?? []) as { id: string; email: string }[]
  const existingUserId = users[0]?.id ?? null

  let patientId: string
  let wasNew = false

  if (existingUserId) {
    // Usuario existe → verificar que no esté ya vinculado
    const { data: existing } = await supabase
      .from('practitioner_patients')
      .select('id, status')
      .eq('practitioner_id', practitionerId)
      .eq('patient_id', existingUserId)
      .maybeSingle()

    if (existing) {
      return NextResponse.json(
        { error: `Este paciente ya está ${existing.status === 'active' ? 'vinculado' : 'invitado'}.` },
        { status: 409 }
      )
    }
    patientId = existingUserId
  } else {
    // Usuario no existe → crear cuenta + enviar magic link a /download
    wasNew = true
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://fitkis.com'
    const { data: invited, error: inviteErr } = await admin.auth.admin.inviteUserByEmail(email, {
      redirectTo: `${siteUrl}/download`,
    })
    if (inviteErr || !invited?.user?.id) {
      console.error('invite-patient: inviteUserByEmail error', inviteErr)
      return NextResponse.json(
        { error: inviteErr?.message ?? 'Error al enviar la invitación.' },
        { status: 500 }
      )
    }
    patientId = invited.user.id
  }

  // ── Insertar vínculo ────────────────────────────────────────────────────────
  const { error: insertErr } = await admin
    .from('practitioner_patients')
    .insert({
      practitioner_id: practitionerId,
      patient_id: patientId,
      status: 'pending',
      invited_at: new Date().toISOString(),
    })

  if (insertErr) {
    console.error('invite-patient: insert error', insertErr)
    return NextResponse.json({ error: insertErr.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true, wasNew })
}

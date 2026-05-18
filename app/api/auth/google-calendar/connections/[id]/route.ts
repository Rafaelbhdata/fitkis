/**
 * Gestión individual de conexiones de Google Calendar de una nutrióloga.
 *
 * PATCH  /api/auth/google-calendar/connections/:id
 *   Body: { display_label?, read_enabled?, is_write_target? }
 *   Marcar is_write_target=true desmarca automáticamente el resto (índice
 *   parcial único en BD lo hace cumplir; lo desmarcamos antes para que el
 *   update no choque con el constraint).
 *
 * DELETE /api/auth/google-calendar/connections/:id
 *   Revoca tokens en Google y borra la fila. Si era el write target, no
 *   reasigna automáticamente — la UI debe pedir a la usuaria elegir otro.
 */

import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const GOOGLE_REVOKE_URL = 'https://oauth2.googleapis.com/revoke'

function service() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  )
}

async function getPractitionerId(): Promise<string | null> {
  const cookieStore = cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } }
  )
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: prac } = await service()
    .from('practitioners')
    .select('id')
    .eq('user_id', user.id)
    .maybeSingle()

  return (prac as { id?: string } | null)?.id ?? null
}

async function ownsConnection(practitionerId: string, connectionId: string): Promise<boolean> {
  const { data } = await service()
    .from('practitioner_calendar_connections')
    .select('id')
    .eq('id', connectionId)
    .eq('practitioner_id', practitionerId)
    .maybeSingle()
  return !!data
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const practitionerId = await getPractitionerId()
  if (!practitionerId) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

  if (!await ownsConnection(practitionerId, params.id)) {
    return NextResponse.json({ error: 'Conexión no encontrada' }, { status: 404 })
  }

  let body: { display_label?: string | null; read_enabled?: boolean; is_write_target?: boolean }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Body inválido' }, { status: 400 })
  }

  const supabase = service()

  // Si va a marcar como write target, desmarcar primero el resto para no
  // chocar contra el índice parcial único.
  if (body.is_write_target === true) {
    await supabase
      .from('practitioner_calendar_connections')
      .update({ is_write_target: false })
      .eq('practitioner_id', practitionerId)
      .eq('is_write_target', true)
      .neq('id', params.id)
  }

  const patch: Record<string, unknown> = {}
  if (body.display_label !== undefined) {
    if (body.display_label !== null && (typeof body.display_label !== 'string' || body.display_label.length > 60)) {
      return NextResponse.json({ error: 'Etiqueta inválida' }, { status: 400 })
    }
    patch.display_label = body.display_label
  }
  if (typeof body.read_enabled === 'boolean')    patch.read_enabled    = body.read_enabled
  if (typeof body.is_write_target === 'boolean') patch.is_write_target = body.is_write_target

  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ ok: true, noop: true })
  }

  const { error } = await supabase
    .from('practitioner_calendar_connections')
    .update(patch)
    .eq('id', params.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const practitionerId = await getPractitionerId()
  if (!practitionerId) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

  const supabase = service()
  const { data: conn } = await supabase
    .from('practitioner_calendar_connections')
    .select('refresh_token, practitioner_id')
    .eq('id', params.id)
    .maybeSingle()

  if (!conn || (conn as { practitioner_id: string }).practitioner_id !== practitionerId) {
    return NextResponse.json({ error: 'Conexión no encontrada' }, { status: 404 })
  }

  // Revocar en Google — best effort, no bloquear si falla
  const refreshToken = (conn as { refresh_token?: string }).refresh_token
  if (refreshToken) {
    await fetch(`${GOOGLE_REVOKE_URL}?token=${refreshToken}`, { method: 'POST' }).catch(() => {})
  }

  const { error } = await supabase
    .from('practitioner_calendar_connections')
    .delete()
    .eq('id', params.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}

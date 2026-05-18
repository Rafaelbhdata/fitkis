/**
 * POST /api/cancel-appointment
 *
 * Cancela una cita: marca status='cancelled' y, si la cita tenía un evento
 * en Google Calendar (porque CALENDAR_WRITE_ENABLED estaba activo al
 * crearla), lo borra también.
 *
 * Auth: solo la nutrióloga dueña de la cita puede cancelarla.
 *
 * Body: { appointmentId: string }
 */

import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { getAuthedUser } from '@/lib/api-auth'
import { deleteCalendarEvent } from '@/lib/clinic/google-calendar-write'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
)

export async function POST(req: Request) {
  const { user } = await getAuthedUser(req)
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  let appointmentId: string
  try {
    const body = await req.json()
    appointmentId = body.appointmentId
  } catch {
    return NextResponse.json({ error: 'Body inválido' }, { status: 400 })
  }
  if (!appointmentId) return NextResponse.json({ error: 'appointmentId requerido' }, { status: 400 })

  // Verificar ownership: la cita pertenece a una nutrióloga cuyo user_id == user.id
  const { data: appt } = await supabaseAdmin
    .from('appointments')
    .select('id, practitioner_id, google_event_id, google_calendar_connection_id')
    .eq('id', appointmentId)
    .maybeSingle()

  if (!appt) return NextResponse.json({ error: 'Cita no encontrada' }, { status: 404 })

  const { data: prac } = await supabaseAdmin
    .from('practitioners')
    .select('user_id')
    .eq('id', (appt as { practitioner_id: string }).practitioner_id)
    .maybeSingle()

  if (!prac || (prac as { user_id: string }).user_id !== user.id) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
  }

  // Marcar cancelada en BD
  const { error: updErr } = await supabaseAdmin
    .from('appointments')
    .update({ status: 'cancelled' } as never)
    .eq('id', appointmentId)

  if (updErr) return NextResponse.json({ error: updErr.message }, { status: 500 })

  // Borrar evento en Google si existía (fire-and-forget — la cancelación
  // en BD ya quedó, no bloqueamos al usuario si Google falla)
  const apptCal = appt as { google_event_id?: string; google_calendar_connection_id?: string }
  if (apptCal.google_event_id && apptCal.google_calendar_connection_id) {
    deleteCalendarEvent(apptCal.google_calendar_connection_id, apptCal.google_event_id)
      .then(async (ok) => {
        if (ok) {
          await supabaseAdmin
            .from('appointments')
            .update({ google_event_id: null, google_calendar_connection_id: null } as never)
            .eq('id', appointmentId)
        }
      })
      .catch((e) => console.error('cancel-appointment: delete event', e))
  }

  return NextResponse.json({ ok: true })
}

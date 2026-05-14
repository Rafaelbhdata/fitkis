import { NextRequest, NextResponse } from 'next/server'
import { getBusyBlocksRange } from '@/lib/clinic/google-calendar'
import { getAuthedUser } from '@/lib/api-auth'

/**
 * GET /api/calendar-busy?practitionerId=...&from=YYYY-MM-DD&to=YYYY-MM-DD
 *
 * Devuelve los bloques de ocupación del calendario externo (Google Calendar)
 * para el rango indicado. Usado por la grilla de agenda del portal clínico.
 * No expone titles/detalles — solo start/end de cada bloque (FreeBusy).
 *
 * Authenticated — practitioner can only query their own calendar.
 */
export async function GET(req: NextRequest) {
  const { user, supabase } = await getAuthedUser(req)
  if (!user || !supabase) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  const { searchParams } = new URL(req.url)
  const practitionerId = searchParams.get('practitionerId')
  const from = searchParams.get('from')
  const to   = searchParams.get('to')

  if (!practitionerId || !from || !to) {
    return NextResponse.json({ error: 'Parámetros requeridos: practitionerId, from, to' }, { status: 400 })
  }

  // Verify the auth'd user owns this practitioner record.
  const { data: prac } = await supabase
    .from('practitioners')
    .select('user_id')
    .eq('id', practitionerId)
    .maybeSingle()
  if (!prac || (prac as { user_id: string }).user_id !== user.id) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
  }

  const blocks = await getBusyBlocksRange(practitionerId, from, to)
  return NextResponse.json({ busy: blocks })
}

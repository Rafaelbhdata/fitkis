import { NextRequest, NextResponse } from 'next/server'
import { getBusyBlocksRange } from '@/lib/clinic/google-calendar'

/**
 * GET /api/calendar-busy?practitionerId=...&from=YYYY-MM-DD&to=YYYY-MM-DD
 *
 * Devuelve los bloques de ocupación del calendario externo (Google Calendar)
 * para el rango indicado. Usado por la grilla de agenda del portal clínico.
 * No expone titles/detalles — solo start/end de cada bloque (FreeBusy).
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const practitionerId = searchParams.get('practitionerId')
  const from = searchParams.get('from')
  const to   = searchParams.get('to')

  if (!practitionerId || !from || !to) {
    return NextResponse.json({ error: 'Parámetros requeridos: practitionerId, from, to' }, { status: 400 })
  }

  const blocks = await getBusyBlocksRange(practitionerId, from, to)
  return NextResponse.json({ busy: blocks })
}

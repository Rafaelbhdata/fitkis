import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function GET() {
  const cookieStore = cookies()

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } }
  )
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ connected: false, connections: [] })

  const serviceSupabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  )
  const { data: prac } = await serviceSupabase
    .from('practitioners')
    .select('id')
    .eq('user_id', user.id)
    .maybeSingle()

  if (!prac) return NextResponse.json({ connected: false, connections: [] })

  const { data: conns } = await serviceSupabase
    .from('practitioner_calendar_connections')
    .select('id, google_email, display_label, is_write_target, read_enabled, connected_at, degraded_at')
    .eq('practitioner_id', prac.id)
    .eq('provider', 'google')
    .order('connected_at', { ascending: true })

  const list = conns ?? []

  // Mantiene compatibilidad con consumidores viejos (UI antes de Fase 5).
  const first = list[0] as { connected_at?: string } | undefined
  return NextResponse.json({
    connected:    list.length > 0,
    connected_at: first?.connected_at ?? null,
    connections:  list,
  })
}
